import express from 'express';
import { supabase } from '../config/supabaseClient.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// POST /api/enrollments - Enroll in a course
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { course_id } = req.body;
    const user_id = req.user.id;

    if (!course_id) {
      return res.status(400).json({ error: 'Course ID is required' });
    }

    // Check if course exists and is published
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('id, is_published, price')
      .eq('id', course_id)
      .single();

    if (courseError || !course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    if (!course.is_published && course.price > 0) {
      return res.status(400).json({ error: 'Course is not available for enrollment' });
    }

    // Check if already enrolled
    const { data: existingEnrollment } = await supabase
      .from('enrollments')
      .select('id')
      .eq('user_id', user_id)
      .eq('course_id', course_id)
      .single();

    if (existingEnrollment) {
      return res.status(400).json({ error: 'Already enrolled in this course' });
    }

    // Create enrollment
    const { data: enrollment, error } = await supabase
      .from('enrollments')
      .insert([
        {
          user_id,
          course_id,
          enrolled_at: new Date().toISOString()
        }
      ])
      .select(`
        *,
        courses (
          id,
          title,
          instructor_id
        )
      `)
      .single();

    if (error) {
      console.error('Enrollment error:', error);
      return res.status(500).json({ error: error.message });
    }

    res.status(201).json({
      message: 'Successfully enrolled in course',
      enrollment
    });
  } catch (error) {
    console.error('Enrollment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update the GET /api/enrollments/my-courses route
router.get('/my-courses', authenticateToken, async (req, res) => {
  try {
    const user_id = req.user.id;

    const { data: enrollments, error } = await supabase
      .from('enrollments')
      .select(`
        id,
        enrolled_at,
        completed_at,
        courses (
          id,
          title,
          description,
          thumbnail_url,
          level,
          duration_hours,
          rating,
          profiles:instructor_id (
            full_name
          ),
          lessons (
            id,
            title,
            description,
            duration_minutes,
            order_index,
            video_path,
            video_url,
            upload_status
          )
        )
      `)
      .eq('user_id', user_id)
      .order('enrolled_at', { ascending: false });

    if (error) {
      console.error('Error fetching enrollments:', error);
      return res.status(500).json({ error: error.message });
    }

    res.json({ enrollments });
  } catch (error) {
    console.error('Enrollments fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/enrollments/check/:courseId - Check if user is enrolled in a course
router.get('/check/:courseId', authenticateToken, async (req, res) => {
  try {
    const { courseId } = req.params;
    const user_id = req.user.id;

    const { data: enrollment, error } = await supabase
      .from('enrollments')
      .select('id, enrolled_at')
      .eq('user_id', user_id)
      .eq('course_id', courseId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Enrollment check error:', error);
      return res.status(500).json({ error: error.message });
    }

    res.json({ isEnrolled: !!enrollment, enrollment });
  } catch (error) {
    console.error('Enrollment check error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
// POST /api/enrollments/progress - Update lesson progress
router.post('/progress', authenticateToken, async (req, res) => {
  try {
    const { course_id, lesson_id, progress_percent, completed } = req.body;
    const user_id = req.user.id;

    console.log('Updating progress:', { course_id, lesson_id, progress_percent, completed, user_id });

    if (!course_id || !lesson_id) {
      return res.status(400).json({ error: 'Course ID and Lesson ID are required' });
    }

    // Check if enrollment exists
    const { data: enrollment, error: enrollmentError } = await supabase
      .from('enrollments')
      .select('id')
      .eq('user_id', user_id)
      .eq('course_id', course_id)
      .single();

    if (enrollmentError || !enrollment) {
      return res.status(404).json({ error: 'Enrollment not found' });
    }

    // Check if progress record already exists
    const { data: existingProgress, error: checkError } = await supabase
      .from('lesson_progress')
      .select('*')
      .eq('user_id', user_id)
      .eq('lesson_id', lesson_id)
      .single();

    let progress;
    
    if (checkError && checkError.code === 'PGRST116') {
      // No existing record - create new one
      console.log('Creating new progress record');
      const { data, error } = await supabase
        .from('lesson_progress')
        .insert({
          user_id,
          course_id,
          lesson_id,
          progress_percent: Math.min(100, Math.max(0, progress_percent || 0)),
          completed: completed || false,
          last_watched: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating progress:', error);
        return res.status(500).json({ error: error.message });
      }
      progress = data;
    } else if (checkError) {
      console.error('Error checking existing progress:', checkError);
      return res.status(500).json({ error: checkError.message });
    } else {
      // Update existing record
      console.log('Updating existing progress record');
      const { data, error } = await supabase
        .from('lesson_progress')
        .update({
          progress_percent: Math.min(100, Math.max(0, progress_percent || 0)),
          completed: completed || false,
          last_watched: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user_id)
        .eq('lesson_id', lesson_id)
        .select()
        .single();

      if (error) {
        console.error('Error updating progress:', error);
        return res.status(500).json({ error: error.message });
      }
      progress = data;
    }

    // Calculate overall course progress
    try {
      await updateCourseProgress(user_id, course_id);
    } catch (progressError) {
      console.error('Error updating course progress:', progressError);
      // Don't fail the request if course progress update fails
    }

    res.json({
      message: 'Progress updated successfully',
      progress
    });
  } catch (error) {
    console.error('Progress tracking error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
});
// GET /api/enrollments/progress/:courseId - Get user progress for a course
// GET /api/enrollments/progress/:courseId - Get user progress for a course
router.get('/progress/:courseId', authenticateToken, async (req, res) => {
  try {
    const { courseId } = req.params;
    const user_id = req.user.id;

    console.log('Fetching progress for course:', courseId, 'user:', user_id);

    // Try to get lesson progress - handle case where table might not exist
    let lessonProgress = [];
    try {
      const { data, error } = await supabase
        .from('lesson_progress')
        .select('*')
        .eq('user_id', user_id)
        .eq('course_id', courseId);

      if (error) {
        // If table doesn't exist, return empty progress
        if (error.code === '42P01') { // table does not exist
          console.log('Lesson progress table does not exist yet');
          lessonProgress = [];
        } else {
          throw error;
        }
      } else {
        lessonProgress = data || [];
      }
    } catch (tableError) {
      console.log('Lesson progress table error:', tableError.message);
      lessonProgress = [];
    }

    console.log('Lesson progress found:', lessonProgress.length);

    // Get course enrollment
    let enrollment = null;
    try {
      const { data, error } = await supabase
        .from('enrollments')
        .select('progress_percent, completed_lessons, total_lessons')
        .eq('user_id', user_id)
        .eq('course_id', courseId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.log('Enrollment fetch error:', error);
      } else {
        enrollment = data;
      }
    } catch (enrollmentError) {
      console.log('Enrollment error:', enrollmentError);
    }

    res.json({
      lessonProgress: lessonProgress,
      courseProgress: enrollment || {
        progress_percent: 0,
        completed_lessons: 0,
        total_lessons: 0
      }
    });
  } catch (error) {
    console.error('Progress fetch error:', error);
    res.status(500).json({ error: 'Internal server error: ' + error.message });
  }
});
// Helper function to update overall course progress
// Helper function to update overall course progress
async function updateCourseProgress(user_id, course_id) {
  try {
    // Get total lessons in course
    const { data: lessons, error: lessonsError } = await supabase
      .from('lessons')
      .select('id')
      .eq('course_id', course_id);

    if (lessonsError) {
      console.error('Error fetching lessons:', lessonsError);
      return;
    }

    const totalLessons = lessons?.length || 0;

    // Get completed lessons
    const { data: completedLessons, error: progressError } = await supabase
      .from('lesson_progress')
      .select('lesson_id')
      .eq('user_id', user_id)
      .eq('course_id', course_id)
      .eq('completed', true);

    if (progressError) {
      console.error('Error fetching completed lessons:', progressError);
      return;
    }

    const completedLessonsCount = completedLessons?.length || 0;
    const progressPercent = totalLessons > 0 ? Math.round((completedLessonsCount / totalLessons) * 100) : 0;

    console.log('Updating course progress:', {
      user_id,
      course_id,
      completedLessonsCount,
      totalLessons,
      progressPercent
    });

    // Update enrollment with progress - handle case where columns might not exist
    try {
      const { error: updateError } = await supabase
        .from('enrollments')
        .update({
          progress_percent: progressPercent,
          completed_lessons: completedLessonsCount,
          total_lessons: totalLessons,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user_id)
        .eq('course_id', course_id);

      if (updateError) {
        // If columns don't exist yet, just log the error but don't fail
        if (updateError.code === '42703') {
          console.log('Progress columns not available in enrollments table yet');
        } else {
          console.error('Error updating enrollment progress:', updateError);
        }
      } else {
        console.log('Course progress updated successfully');
      }
    } catch (updateError) {
      console.error('Enrollment update error:', updateError);
    }

    return { progressPercent, completedLessonsCount, totalLessons };
  } catch (error) {
    console.error('Course progress update error:', error);
    throw error;
  }
}

// GET /api/enrollments/certificate/:courseId - Check certificate eligibility
router.get('/certificate/:courseId', authenticateToken, async (req, res) => {
  try {
    const { courseId } = req.params;
    const user_id = req.user.id;

    // Get course progress
    const progressData = await updateCourseProgress(user_id, courseId);
    
    const eligibleForCertificate = progressData.progressPercent >= 100;

    res.json({
      eligible: eligibleForCertificate,
      progress: progressData.progressPercent,
      completedLessons: progressData.completedLessonsCount,
      totalLessons: progressData.totalLessons,
      courseId: courseId,
      userId: user_id
    });
  } catch (error) {
    console.error('Certificate check error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/enrollments/complete-lesson - Mark lesson as completed
router.post('/complete-lesson', authenticateToken, async (req, res) => {
  try {
    const { course_id, lesson_id } = req.body;
    const user_id = req.user.id;

    // Update lesson progress to 100% and mark as completed
    const { data: progress, error } = await supabase
      .from('lesson_progress')
      .upsert({
        user_id,
        course_id,
        lesson_id,
        progress_percent: 100,
        completed: true,
        last_watched: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,lesson_id'
      })
      .select()
      .single();

    if (error) throw error;

    // Update overall course progress
    const courseProgress = await updateCourseProgress(user_id, course_id);

    res.json({
      message: 'Lesson marked as completed',
      progress,
      courseProgress
    });
  } catch (error) {
    console.error('Complete lesson error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
export default router;