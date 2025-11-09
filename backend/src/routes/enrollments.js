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

// GET /api/enrollments/my-courses - Get user's enrolled courses
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

export default router;