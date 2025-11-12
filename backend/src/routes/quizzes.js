import express from 'express';
import { supabase } from '../config/supabaseClient.js';
import { authenticateToken } from '../middleware/auth.js';
import { requireInstructor } from '../middleware/roles.js';

const router = express.Router();

// Helper function to check if table exists
async function tableExists(tableName) {
  const { error } = await supabase
    .from(tableName)
    .select('*')
    .limit(1);
  
  // If we get a "relation does not exist" error, table doesn't exist
  if (error && error.code === '42P01') {
    return false;
  }
  return true;
}

// GET /api/quizzes/course/:courseId - Get quiz for a course
router.get('/course/:courseId', authenticateToken, async (req, res) => {
  try {
    const { courseId } = req.params;
    const user_id = req.user.id;

    console.log('🔍 Fetching quiz for course:', { courseId, user_id });

    // Check if quizzes table exists
    if (!(await tableExists('quizzes'))) {
      console.log('❌ Quizzes table does not exist');
      return res.status(200).json({ quiz: null, message: 'No quiz available' });
    }

    // Check if user is enrolled in the course or is instructor
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('instructor_id')
      .eq('id', courseId)
      .single();

    if (courseError) {
      console.log('❌ Course not found:', courseError);
      return res.status(404).json({ error: 'Course not found' });
    }

    const isInstructor = course.instructor_id === user_id;
    const isEnrolled = !isInstructor ? await checkEnrollment(user_id, courseId) : true;

    if (!isInstructor && !isEnrolled) {
      console.log('❌ User not authorized:', { isInstructor, isEnrolled });
      return res.status(403).json({ error: 'Not enrolled in this course' });
    }

    console.log('✅ User authorized, fetching quiz...');
    console.log('🔍 Fetching quiz for course:', { 
  courseId, 
  user_id,
  requestUrl: req.originalUrl 
});
    // FIXED: Get ALL quizzes for this course and take the most recent one
    const { data: quizzes, error: quizzesError } = await supabase
      .from('quizzes')
      .select(`
        *,
        quiz_questions (
          id,
          question_text,
          question_type,
          options,
          points,
          order_index
        )
      `)
      .eq('course_id', courseId)
      .order('created_at', { ascending: false }); // Get most recent first
        console.log('📊 Quiz query results:', {
  courseId,
  quizzesFound: quizzes?.length,
  quizIds: quizzes?.map(q => q.id),
  quizCourseIds: quizzes?.map(q => q.course_id)
});
    if (quizzesError) {
      console.log('❌ Quiz query error:', quizzesError);
      throw quizzesError;
    }

    // If no quizzes found
    if (!quizzes || quizzes.length === 0) {
      console.log('ℹ️ No quiz found for course:', courseId);
      return res.status(200).json({ quiz: null });
    }

    // If multiple quizzes found, take the most recent one and log a warning
    if (quizzes.length > 1) {
      console.warn('⚠️ Multiple quizzes found for course, using most recent:', {
        courseId,
        totalQuizzes: quizzes.length,
        usingQuizId: quizzes[0].id,
        allQuizIds: quizzes.map(q => q.id)
      });
    }

    const quiz = quizzes[0]; // Take the most recent quiz
    console.log('✅ Quiz found:', quiz.id);
    res.json({ quiz });
  } catch (error) {
    console.error('❌ Quiz fetch error:', error);
    
    // Handle specific database errors
    if (error.code === '42703') {
      return res.status(404).json({ 
        error: 'Quiz system not fully configured yet',
        details: 'Please contact administrator'
      });
    }
    
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Helper function to check enrollment
async function checkEnrollment(userId, courseId) {
  const { data: enrollment } = await supabase
    .from('enrollments')
    .select('id')
    .eq('user_id', userId)
    .eq('course_id', courseId)
    .single();
  
  return !!enrollment;
}

// POST /api/quizzes/:quizId/attempt - Submit quiz attempt
router.post('/:quizId/attempt', authenticateToken, async (req, res) => {
  try {
    const { quizId } = req.params;
    const { answers, time_spent_seconds } = req.body;
    const user_id = req.user.id;

    // Check if required tables exist
    if (!(await tableExists('quizzes')) || !(await tableExists('quiz_questions'))) {
      return res.status(400).json({ error: 'Quiz system not available' });
    }

    // Get quiz with questions and correct answers
    const { data: quiz, error: quizError } = await supabase
      .from('quizzes')
      .select(`
        *,
        quiz_questions (
          id,
          correct_answer,
          points
        )
      `)
      .eq('id', quizId)
      .single();

    if (quizError) {
      return res.status(404).json({ error: 'Quiz not found' });
    }

    // Check if user is enrolled or is instructor
    const { data: course } = await supabase
      .from('courses')
      .select('instructor_id')
      .eq('id', quiz.course_id)
      .single();

    const isInstructor = course.instructor_id === user_id;
    const isEnrolled = !isInstructor ? await checkEnrollment(user_id, quiz.course_id) : true;

    if (!isInstructor && !isEnrolled) {
      return res.status(403).json({ error: 'Not enrolled in this course' });
    }

    // Calculate score
    let totalScore = 0;
    let totalPossible = 0;
    const answerResults = [];

    quiz.quiz_questions.forEach(question => {
      totalPossible += question.points;
      const userAnswer = answers[question.id];
      const isCorrect = userAnswer === question.correct_answer;
      
      if (isCorrect) {
        totalScore += question.points;
      }

      answerResults.push({
        question_id: question.id,
        user_answer: userAnswer,
        is_correct: isCorrect
      });
    });

    const percentage = Math.round((totalScore / totalPossible) * 100);
    const passed = percentage >= quiz.passing_score;

    // Create quiz attempt
    const { data: attempt, error: attemptError } = await supabase
      .from('quiz_attempts')
      .insert([
        {
          user_id,
          quiz_id: quizId,
          score: percentage,
          total_questions: quiz.quiz_questions.length,
          passed,
          time_spent_seconds
        }
      ])
      .select()
      .single();

    if (attemptError) throw attemptError;

    // Save individual answers if table exists
    if (await tableExists('quiz_answers')) {
      const answerInserts = answerResults.map(result => ({
        attempt_id: attempt.id,
        ...result
      }));

      const { error: answersError } = await supabase
        .from('quiz_answers')
        .insert(answerInserts);

      if (answersError) throw answersError;
    }

    res.json({
      attempt,
      score: percentage,
      passed,
      total_score: totalScore,
      total_possible: totalPossible,
      answers: answerResults
    });
  } catch (error) {
    console.error('Quiz submission error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/quizzes/attempts/:courseId - Get user's quiz attempts for a course
// In your backend quiz routes
// GET /api/quizzes/attempts/:courseId - Get user's quiz attempts for a course
// GET /api/quizzes/attempts/:courseId - Get user's quiz attempts for a course
router.get('/attempts/:courseId', authenticateToken, async (req, res) => {
  try {
    const { courseId } = req.params;
    const user_id = req.user.id;

    console.log('🔍 Fetching quiz attempts for course:', courseId);

    // Check if table exists
    if (!(await tableExists('quiz_attempts'))) {
      console.log('❌ quiz_attempts table does not exist');
      return res.json({ attempts: [] });
    }

    // First get ALL quizzes for this course (handle multiple quizzes)
    const { data: courseQuizzes, error: quizzesError } = await supabase
      .from('quizzes')
      .select('id, title')
      .eq('course_id', courseId);

    if (quizzesError) {
      console.log('❌ Error fetching course quizzes:', quizzesError);
      return res.json({ attempts: [] });
    }

    console.log('📝 Found quizzes for course:', courseQuizzes);

    if (!courseQuizzes || courseQuizzes.length === 0) {
      console.log('❌ No quizzes found for course:', courseId);
      return res.json({ attempts: [] });
    }

    // Get all quiz IDs for this course
    const quizIds = courseQuizzes.map(quiz => quiz.id);
    console.log('🎯 Looking for attempts for quiz IDs:', quizIds);

    // Check if user is instructor
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('instructor_id')
      .eq('id', courseId)
      .single();

    const isInstructor = course?.instructor_id === user_id;

    // Build query to get attempts for ALL quizzes in this course
    // FIXED: Remove the problematic profiles join or use correct relationship
    let query = supabase
      .from('quiz_attempts')
      .select(`
        *,
        quizzes (
          id,
          title,
          passing_score
        )
        // REMOVED: profiles!quiz_attempts_user_id_fkey - this relationship doesn't exist
      `)
      .in('quiz_id', quizIds); // Use .in() to match any of the quiz IDs

    // If not instructor, only show user's own attempts
    if (!isInstructor) {
      query = query.eq('user_id', user_id);
    }

    const { data: attempts, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.log('❌ Quiz attempts query error:', error);
      throw error;
    }

    console.log(`✅ Found ${attempts?.length || 0} quiz attempts for course ${courseId}`);

    // If we need user profiles, fetch them separately
    if (attempts && attempts.length > 0) {
      // Get unique user IDs from attempts
      const userIds = [...new Set(attempts.map(attempt => attempt.user_id))];
      
      // Fetch user profiles separately
      const { data: userProfiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds);

      if (!profilesError && userProfiles) {
        // Create a map for easy lookup
        const profilesMap = {};
        userProfiles.forEach(profile => {
          profilesMap[profile.id] = profile;
        });

        // Add profile data to attempts
        attempts.forEach(attempt => {
          attempt.profile = profilesMap[attempt.user_id] || null;
        });
      }
    }

    res.json({ 
      attempts: attempts || [],
      count: attempts?.length || 0,
      quizCount: courseQuizzes.length
    });
  } catch (error) {
    console.error('❌ Quiz attempts fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/quizzes/course/:courseId - Create quiz for a course (instructor only)
router.post('/course/:courseId', authenticateToken, requireInstructor, async (req, res) => {
  try {
    console.log('Quiz creation request received:', req.body);
    const { courseId } = req.params;
    const { title, description, questions, passing_score, time_limit_minutes } = req.body;
    const user_id = req.user.id;

    // Verify user is instructor of the course
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('instructor_id')
      .eq('id', courseId)
      .single();

    if (courseError || !course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    if (course.instructor_id !== user_id) {
      return res.status(403).json({ error: 'Not authorized to create quizzes for this course' });
    }

    // Create quiz
    const { data: quiz, error: quizError } = await supabase
      .from('quizzes')
      .insert([
        {
          course_id: courseId,
          title,
          description,
          passing_score: passing_score || 70,
          time_limit_minutes: time_limit_minutes || null
        }
      ])
      .select()
      .single();

    if (quizError) throw quizError;

    // Create questions if provided
    if (questions && questions.length > 0) {
      const questionsWithQuizId = questions.map((q, index) => ({
        quiz_id: quiz.id,
        question_text: q.question_text,
        question_type: 'multiple_choice',
        options: q.options,
        correct_answer: q.correct_answer,
        points: q.points || 1,
        order_index: index
      }));

      const { data: createdQuestions, error: questionsError } = await supabase
        .from('quiz_questions')
        .insert(questionsWithQuizId)
        .select();

      if (questionsError) throw questionsError;

      quiz.questions = createdQuestions;
    }

    res.status(201).json({
      message: 'Quiz created successfully',
      quiz
    });
  } catch (error) {
      console.error('Detailed quiz creation error:', {
            message: error.message,
            stack: error.stack,
            body: req.body,
            user: req.user?.id
        });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/quizzes/:quizId - Update quiz (instructor only)
router.put('/:quizId', authenticateToken, requireInstructor, async (req, res) => {
  try {
    const { quizId } = req.params;
    const { title, description, questions, passing_score, time_limit_minutes } = req.body;
    const user_id = req.user.id;

    // Verify user owns the quiz
    const { data: quiz, error: quizError } = await supabase
      .from('quizzes')
      .select('id, courses!inner(instructor_id)')
      .eq('id', quizId)
      .single();

    if (quizError || !quiz) {
      return res.status(404).json({ error: 'Quiz not found' });
    }

    if (quiz.courses.instructor_id !== user_id) {
      return res.status(403).json({ error: 'Not authorized to update this quiz' });
    }

    // Update quiz
    const { data: updatedQuiz, error: updateError } = await supabase
      .from('quizzes')
      .update({
        title,
        description,
        passing_score,
        time_limit_minutes,
        updated_at: new Date().toISOString()
      })
      .eq('id', quizId)
      .select()
      .single();

    if (updateError) throw updateError;

    // Update questions if provided
    if (questions && questions.length > 0) {
      // Delete existing questions
      await supabase
        .from('quiz_questions')
        .delete()
        .eq('quiz_id', quizId);

      // Insert new questions
      const questionsWithQuizId = questions.map((q, index) => ({
        quiz_id: quizId,
        question_text: q.question_text,
        question_type: 'multiple_choice',
        options: q.options,
        correct_answer: q.correct_answer,
        points: q.points || 1,
        order_index: index
      }));

      const { data: createdQuestions, error: questionsError } = await supabase
        .from('quiz_questions')
        .insert(questionsWithQuizId)
        .select();

      if (questionsError) throw questionsError;

      updatedQuiz.questions = createdQuestions;
    }

    res.json({
      message: 'Quiz updated successfully',
      quiz: updatedQuiz
    });
  } catch (error) {
    console.error('Quiz update error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/quizzes/:quizId - Delete quiz (instructor only)
router.delete('/:quizId', authenticateToken, requireInstructor, async (req, res) => {
  try {
    const { quizId } = req.params;
    const user_id = req.user.id;

    // Verify user owns the quiz
    const { data: quiz, error: quizError } = await supabase
      .from('quizzes')
      .select('id, courses!inner(instructor_id)')
      .eq('id', quizId)
      .single();

    if (quizError || !quiz) {
      return res.status(404).json({ error: 'Quiz not found' });
    }

    if (quiz.courses.instructor_id !== user_id) {
      return res.status(403).json({ error: 'Not authorized to delete this quiz' });
    }

    // Delete quiz (cascade will delete questions and attempts)
    const { error: deleteError } = await supabase
      .from('quizzes')
      .delete()
      .eq('id', quizId);

    if (deleteError) throw deleteError;

    res.json({ message: 'Quiz deleted successfully' });
  } catch (error) {
    console.error('Quiz deletion error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
// Debug endpoint to check all quizzes
router.get('/debug/all', authenticateToken, async (req, res) => {
  try {
    const { data: quizzes, error } = await supabase
      .from('quizzes')
      .select(`
        *,
        quiz_questions (*),
        courses (title)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({ 
      quizzes,
      count: quizzes?.length || 0
    });
  } catch (error) {
    console.error('Debug quizzes error:', error);
    res.status(500).json({ error: error.message });
  }
});


// POST /api/quizzes/cleanup-duplicates - Clean up duplicate quizzes (admin/instructor only)
router.post('/cleanup-duplicates', authenticateToken, requireInstructor, async (req, res) => {
  try {
    const { courseId } = req.body;
    const user_id = req.user.id;

    // Verify user owns the course
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('instructor_id')
      .eq('id', courseId)
      .single();

    if (courseError || !course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    if (course.instructor_id !== user_id) {
      return res.status(403).json({ error: 'Not authorized to manage this course' });
    }

    // Get all quizzes for this course, ordered by creation date
    const { data: quizzes, error: quizzesError } = await supabase
      .from('quizzes')
      .select('*')
      .eq('course_id', courseId)
      .order('created_at', { ascending: false });

    if (quizzesError) throw quizzesError;

    if (!quizzes || quizzes.length <= 1) {
      return res.json({ 
        message: 'No duplicates found', 
        quizCount: quizzes?.length || 0 
      });
    }

    // Keep the most recent quiz, delete the rest
    const quizToKeep = quizzes[0];
    const quizzesToDelete = quizzes.slice(1);

    console.log('🧹 Cleaning up duplicate quizzes:', {
      keeping: quizToKeep.id,
      deleting: quizzesToDelete.map(q => q.id)
    });

    // Delete the older quizzes
    const { error: deleteError } = await supabase
      .from('quizzes')
      .delete()
      .in('id', quizzesToDelete.map(q => q.id));

    if (deleteError) throw deleteError;

    res.json({
      message: `Cleaned up ${quizzesToDelete.length} duplicate quizzes`,
      keptQuiz: quizToKeep.id,
      deletedQuizzes: quizzesToDelete.map(q => q.id),
      originalCount: quizzes.length,
      finalCount: 1
    });

  } catch (error) {
    console.error('Duplicate cleanup error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add this to your quiz routes (temporary for debugging)
router.get('/debug/course/:courseId', authenticateToken, async (req, res) => {
  try {
    const { courseId } = req.params;
    
    const { data: quizzes, error } = await supabase
      .from('quizzes')
      .select('*')
      .eq('course_id', courseId);

    console.log('📊 Debug - Quizzes for course:', {
      courseId,
      count: quizzes?.length,
      quizzes: quizzes?.map(q => ({ id: q.id, title: q.title, created_at: q.created_at }))
    });

    res.json({ 
      courseId,
      quizCount: quizzes?.length || 0,
      quizzes: quizzes || []
    });
  } catch (error) {
    console.error('Debug error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Enhanced debug endpoint
router.get('/debug/attempts/:courseId', authenticateToken, async (req, res) => {
  try {
    const { courseId } = req.params;

    console.log('🔍 Debug: Checking all quiz attempts data for course:', courseId);

    // Check all quizzes for this course
    const { data: quizzes, error: quizzesError } = await supabase
      .from('quizzes')
      .select('id, title, created_at')
      .eq('course_id', courseId);

    console.log('📝 Course quizzes:', quizzes);

    let allAttempts = [];
    
    if (quizzes && quizzes.length > 0) {
      const quizIds = quizzes.map(q => q.id);
      
      // Get attempts for all quizzes in this course
      const { data: attempts, error: attemptsError } = await supabase
        .from('quiz_attempts')
        .select('*')
        .in('quiz_id', quizIds)
        .order('created_at', { ascending: false });

      console.log('📊 All quiz attempts in database for these quizzes:', attempts);
      console.log('🔢 Total attempts found:', attempts?.length || 0);

      allAttempts = attempts || [];
    }

    res.json({
      courseId,
      quizzes: quizzes || [],
      attempts: allAttempts,
      totalAttempts: allAttempts.length,
      totalQuizzes: quizzes?.length || 0,
      message: quizzes?.length === 0 ? 'No quizzes found for this course' : 'Data retrieved successfully'
    });
  } catch (error) {
    console.error('Debug attempts error:', error);
    res.status(500).json({ error: error.message });
  }
});
export default router;