import express from 'express';
import { supabase, supabaseService } from '../config/supabaseClient.js';
import { authenticateToken } from '../middleware/auth.js';

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

// GET /api/courses/:id - Get single course by ID (public if published, private for instructors)
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
          video_url
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
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { title, description, price, level, thumbnail_url } = req.body;
    const instructor_id = req.user.id;

    // Validate required fields
    if (!title || !description) {
      return res.status(400).json({ error: 'Title and description are required' });
    }

    // Check if user is instructor or admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', instructor_id)
      .single();

    if (profileError || !['instructor', 'admin'].includes(profile?.role)) {
      return res.status(403).json({ error: 'Instructor access required' });
    }

    // Create course
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

// PUT /api/courses/:id - Update course (instructor only)
router.put('/:id', authenticateToken, async (req, res) => {
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
router.delete('/:id', authenticateToken, async (req, res) => {
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

    // Delete course (cascade will delete lessons, enrollments, etc.)
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
router.get('/instructor/my-courses', authenticateToken, async (req, res) => {
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
        lessons (id),
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

export default router;