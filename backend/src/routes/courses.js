import express from 'express';
import { supabase, supabaseService } from '../config/supabaseClient.js';
import { authenticateToken } from '../middleware/auth.js';
import { requireInstructor } from '../middleware/roles.js'; 
const router = express.Router();

// GET /api/courses - Get all published courses (public)
router.get('/', async (req, res) => {
  try {
    const { data: courses, error } = await supabase
      .from('courses')
      .select(`
        *,
        profiles:instructor_id (
          id,
          full_name,
          username
        )
      `)
      .eq('is_published', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching courses:', error);
      return res.status(500).json({ error: error.message });
    }

    res.json({ courses });
  } catch (error) {
    console.error('Courses fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Ensure this route includes video data for enrolled students
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data: course, error } = await supabase
      .from('courses')
      .select(`
        *,
        profiles:instructor_id (
          id,
          full_name,
          username,
          avatar_url
        ),
        lessons (
          id,
          title,
          description,
          duration_minutes,
          order_index,
          video_path,
          video_url,
          video_size,
          video_duration,
          upload_status
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching course:', error);
      return res.status(404).json({ error: 'Course not found' });
    }

    // Check if course is published or user is instructor
    if (!course.is_published) {
      // Verify if user is the instructor
      const token = req.headers.authorization?.replace('Bearer ', '');
      if (token) {
        const { data: { user } } = await supabase.auth.getUser(token);
        if (user && user.id === course.instructor_id) {
          // Instructor can view their own unpublished course
          return res.json({ course });
        }
      }
      return res.status(404).json({ error: 'Course not found' });
    }

    res.json({ course });
  } catch (error) {
    console.error('Course fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/courses - Create new course (instructors only)
// POST /api/courses - Create new course (instructors only)
router.post('/', authenticateToken, requireInstructor, async (req, res) => { // ADD requireInstructor
  try {
    const { title, description, price, level, thumbnail_url } = req.body;
    const instructor_id = req.user.id;

    // Validate required fields
    if (!title || !description) {
      return res.status(400).json({ error: 'Title and description are required' });
    }

    // Create course (user is already verified as instructor by middleware)
    const { data: course, error } = await supabase
      .from('courses')
      .insert([
        {
          title,
          description,
          instructor_id,
          price: price || 0,
          level: level || 'beginner',
          thumbnail_url: thumbnail_url || '',
          is_published: false
        }
      ])
      .select(`
        *,
        profiles:instructor_id (
          id,
          full_name,
          username
        )
      `)
      .single();

    if (error) {
      console.error('Error creating course:', error);
      return res.status(500).json({ error: error.message });
    }

    res.status(201).json({ 
      message: 'Course created successfully', 
      course 
    });
  } catch (error) {
    console.error('Course creation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id', authenticateToken, requireInstructor, async (req, res) => { // ADD requireInstructor
  try {
    const { id } = req.params;
    const { title, description, price, level, thumbnail_url, is_published } = req.body;
    const user_id = req.user.id;

    // Check if course exists and user is the instructor
    const { data: existingCourse, error: courseError } = await supabase
      .from('courses')
      .select('instructor_id')
      .eq('id', id)
      .single();

    if (courseError) {
      return res.status(404).json({ error: 'Course not found' });
    }

    if (existingCourse.instructor_id !== user_id) {
      return res.status(403).json({ error: 'Access denied. You can only update your own courses.' });
    }

    // Update course
    const { data: course, error } = await supabase
      .from('courses')
      .update({
        title,
        description,
        price,
        level,
        thumbnail_url,
        is_published,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select(`
        *,
        profiles:instructor_id (
          id,
          full_name,
          username
        )
      `)
      .single();

    if (error) {
      console.error('Error updating course:', error);
      return res.status(500).json({ error: error.message });
    }

    res.json({ 
      message: 'Course updated successfully', 
      course 
    });
  } catch (error) {
    console.error('Course update error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


// DELETE /api/courses/:id - Delete course (instructor only)
router.delete('/:id', authenticateToken, requireInstructor, async (req, res) => { // ADD requireInstructor
  try {
    const { id } = req.params;
    const user_id = req.user.id;

    // Check if course exists and user is the instructor
    const { data: existingCourse, error: courseError } = await supabase
      .from('courses')
      .select('instructor_id')
      .eq('id', id)
      .single();

    if (courseError) {
      return res.status(404).json({ error: 'Course not found' });
    }

    if (existingCourse.instructor_id !== user_id) {
      return res.status(403).json({ error: 'Access denied. You can only delete your own courses.' });
    }

    // Delete course
    const { error } = await supabase
      .from('courses')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting course:', error);
      return res.status(500).json({ error: error.message });
    }

    res.json({ message: 'Course deleted successfully' });
  } catch (error) {
    console.error('Course deletion error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/courses/instructor/my-courses - Get instructor's courses
router.get('/instructor/my-courses', authenticateToken, requireInstructor, async (req, res) => { // ADD requireInstructor
  try {
    const instructor_id = req.user.id;

    const { data: courses, error } = await supabase
      .from('courses')
      .select(`
        *,
        profiles:instructor_id (
          id,
          full_name,
          username
        ),
        lessons (
          id,
          title,
          description,
          duration_minutes,
          order_index,
          video_path,
          video_url,
          video_size,
          video_duration,
          upload_status
        ),
        enrollments (id)
      `)
      .eq('instructor_id', instructor_id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching instructor courses:', error);
      return res.status(500).json({ error: error.message });
    }

    // Add counts for lessons and enrollments
    const coursesWithCounts = courses.map(course => ({
      ...course,
      lessons_count: course.lessons?.length || 0,
      enrollments_count: course.enrollments?.length || 0
    }));

    res.json({ courses: coursesWithCounts });
  } catch (error) {
    console.error('Instructor courses fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}); 


// Add these routes to the existing courses.js file

// POST /api/courses/:courseId/lessons - Create new lesson
router.post('/:courseId/lessons', authenticateToken, requireInstructor, async (req, res) => {
  try {
    const { courseId } = req.params;
    const { title, description, duration_minutes, order_index } = req.body;
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
      return res.status(403).json({ error: 'Not authorized to add lessons to this course' });
    }

    // Create lesson
    const { data: lesson, error } = await supabase
      .from('lessons')
      .insert([
        {
          course_id: courseId,
          title,
          description: description || '',
          duration_minutes: duration_minutes || 0,
          order_index: order_index || 0,
          video_path: null,
          video_size: null,
          video_duration: null,
          upload_status: 'pending'
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('Error creating lesson:', error);
      return res.status(500).json({ error: error.message });
    }

    res.status(201).json({
      message: 'Lesson created successfully',
      lesson
    });
  } catch (error) {
    console.error('Lesson creation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/courses/lessons/:lessonId - Update lesson
router.put('/lessons/:lessonId', authenticateToken,requireInstructor, async (req, res) => {
  try {
    const { lessonId } = req.params;
    const { title, description, duration_minutes, order_index } = req.body;
    const user_id = req.user.id;

    // Verify user owns the lesson
    const { data: lesson, error: lessonError } = await supabase
      .from('lessons')
      .select(`
        *,
        courses!inner(instructor_id)
      `)
      .eq('id', lessonId)
      .single();

    if (lessonError || !lesson) {
      return res.status(404).json({ error: 'Lesson not found' });
    }

    if (lesson.courses.instructor_id !== user_id) {
      return res.status(403).json({ error: 'Not authorized to update this lesson' });
    }

    // Update lesson
    const { data: updatedLesson, error } = await supabase
      .from('lessons')
      .update({
        title,
        description,
        duration_minutes,
        order_index,
        updated_at: new Date().toISOString()
      })
      .eq('id', lessonId)
      .select()
      .single();

    if (error) {
      console.error('Error updating lesson:', error);
      return res.status(500).json({ error: error.message });
    }

    res.json({
      message: 'Lesson updated successfully',
      lesson: updatedLesson
    });
  } catch (error) {
    console.error('Lesson update error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/courses/lessons/:lessonId - Delete lesson
router.delete('/lessons/:lessonId', authenticateToken,requireInstructor, async (req, res) => {
  try {
    const { lessonId } = req.params;
    const user_id = req.user.id;

    // Verify user owns the lesson
    const { data: lesson, error: lessonError } = await supabase
      .from('lessons')
      .select(`
        video_path,
        courses!inner(instructor_id)
      `)
      .eq('id', lessonId)
      .single();

    if (lessonError || !lesson) {
      return res.status(404).json({ error: 'Lesson not found' });
    }

    if (lesson.courses.instructor_id !== user_id) {
      return res.status(403).json({ error: 'Not authorized to delete this lesson' });
    }

    // Delete video from storage if exists
    if (lesson.video_path) {
      const { error: storageError } = await supabase.storage
        .from('videos')
        .remove([lesson.video_path]);

      if (storageError) {
        console.error('Error deleting video from storage:', storageError);
        // Continue with lesson deletion even if storage delete fails
      }
    }

    // Delete lesson
    const { error } = await supabase
      .from('lessons')
      .delete()
      .eq('id', lessonId);

    if (error) {
      console.error('Error deleting lesson:', error);
      return res.status(500).json({ error: error.message });
    }

    res.json({ message: 'Lesson deleted successfully' });
  } catch (error) {
    console.error('Lesson deletion error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
export default router;