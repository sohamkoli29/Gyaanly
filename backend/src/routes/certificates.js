import express from 'express';
import { supabase } from '../config/supabaseClient.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Generate certificate for completed course
router.post('/generate', authenticateToken, async (req, res) => {
  try {
    const { course_id } = req.body;
    const user_id = req.user.id;

    console.log('Generating certificate for:', { user_id, course_id });

    // Check if course exists and user is enrolled
    const { data: enrollment, error: enrollmentError } = await supabase
      .from('enrollments')
      .select(`
        *,
        courses!inner(
          id,
          title,
          instructor_id,
          profiles!courses_instructor_id_fkey(full_name)
        )
      `)
      .eq('user_id', user_id)
      .eq('course_id', course_id)
      .single();

    if (enrollmentError || !enrollment) {
      return res.status(404).json({ error: 'Enrollment not found' });
    }

    // Check if course is completed (progress >= 100%)
    const { data: progress, error: progressError } = await supabase
      .from('enrollments')
      .select('progress_percent')
      .eq('user_id', user_id)
      .eq('course_id', course_id)
      .single();

    if (progressError || !progress) {
      return res.status(400).json({ error: 'Progress data not found' });
    }

    if (progress.progress_percent < 100) {
      return res.status(400).json({ 
        error: 'Course not completed',
        progress: progress.progress_percent,
        required: 100
      });
    }

    // Check if certificate already exists
    const { data: existingCertificate, error: certCheckError } = await supabase
      .from('certificates')
      .select('*')
      .eq('user_id', user_id)
      .eq('course_id', course_id)
      .single();

    if (existingCertificate) {
      return res.status(400).json({ 
        error: 'Certificate already exists',
        certificate: existingCertificate
      });
    }

    // Get student profile
    const { data: studentProfile, error: profileError } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user_id)
      .single();

    if (profileError) {
      console.error('Error fetching student profile:', profileError);
      return res.status(500).json({ error: 'Failed to fetch student data' });
    }

    // Create certificate
    const certificateData = {
      user_id,
      course_id,
      course_title: enrollment.courses.title,
      student_name: studentProfile.full_name,
      instructor_name: enrollment.courses.profiles?.full_name || 'Instructor',
      completed_at: new Date().toISOString()
    };

    const { data: certificate, error: certError } = await supabase
      .from('certificates')
      .insert([certificateData])
      .select()
      .single();

    if (certError) {
      console.error('Certificate creation error:', certError);
      return res.status(500).json({ error: 'Failed to create certificate' });
    }

    console.log('Certificate generated successfully:', certificate.certificate_number);

    res.status(201).json({
      message: 'Certificate generated successfully',
      certificate
    });

  } catch (error) {
    console.error('Certificate generation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user's certificates
router.get('/my-certificates', authenticateToken, async (req, res) => {
  try {
    const user_id = req.user.id;

    const { data: certificates, error } = await supabase
      .from('certificates')
      .select(`
        *,
        courses (
          id,
          title,
          description,
          thumbnail_url
        )
      `)
      .eq('user_id', user_id)
      .order('issued_at', { ascending: false });

    if (error) {
      console.error('Error fetching certificates:', error);
      return res.status(500).json({ error: 'Failed to fetch certificates' });
    }

    res.json({
      certificates: certificates || []
    });

  } catch (error) {
    console.error('Certificates fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get certificate by ID
router.get('/:certificateId', async (req, res) => {
  try {
    const { certificateId } = req.params;

    const { data: certificate, error } = await supabase
      .from('certificates')
      .select(`
        *,
        courses (
          id,
          title,
          description,
          duration_hours,
          level
        ),
        profiles:user_id (
          full_name,
          email
        )
      `)
      .eq('id', certificateId)
      .single();

    if (error || !certificate) {
      return res.status(404).json({ error: 'Certificate not found' });
    }

    res.json({ certificate });

  } catch (error) {
    console.error('Certificate fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Verify certificate by certificate number
router.get('/verify/:certificateNumber', async (req, res) => {
  try {
    const { certificateNumber } = req.params;

    const { data: certificate, error } = await supabase
      .from('certificates')
      .select(`
        *,
        courses (
          title,
          description,
          duration_hours,
          level
        ),
        profiles:user_id (
          full_name
        )
      `)
      .eq('certificate_number', certificateNumber)
      .single();

    if (error || !certificate) {
      return res.status(404).json({ 
        valid: false,
        error: 'Certificate not found or invalid' 
      });
    }

    res.json({
      valid: true,
      certificate: {
        certificate_number: certificate.certificate_number,
        student_name: certificate.student_name,
        course_title: certificate.course_title,
        issued_at: certificate.issued_at,
        instructor_name: certificate.instructor_name,
        verification_url: certificate.verification_url
      }
    });

  } catch (error) {
    console.error('Certificate verification error:', error);
    res.status(500).json({ 
      valid: false,
      error: 'Verification failed' 
    });
  }
});

// Auto-generate certificate when course is completed
router.post('/auto-generate/:courseId', authenticateToken, async (req, res) => {
  try {
    const { courseId } = req.params;
    const user_id = req.user.id;

    // Check if course is completed
    const { data: progress, error: progressError } = await supabase
      .from('enrollments')
      .select('progress_percent')
      .eq('user_id', user_id)
      .eq('course_id', courseId)
      .single();

    if (progressError || !progress || progress.progress_percent < 100) {
      return res.status(400).json({ 
        error: 'Course not completed',
        auto_generation: false
      });
    }

    // Check if certificate already exists
    const { data: existingCert } = await supabase
      .from('certificates')
      .select('id')
      .eq('user_id', user_id)
      .eq('course_id', courseId)
      .single();

    if (existingCert) {
      return res.json({
        message: 'Certificate already exists',
        auto_generation: false
      });
    }

    // Auto-generate certificate by calling the generate endpoint
    const generateResponse = await fetch(`http://localhost:${process.env.PORT || 5000}/api/certificates/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': req.headers.authorization
      },
      body: JSON.stringify({ course_id: courseId })
    });

    if (!generateResponse.ok) {
      throw new Error('Auto-generation failed');
    }

    const result = await generateResponse.json();

    res.json({
      message: 'Certificate auto-generated successfully',
      auto_generation: true,
      ...result
    });

  } catch (error) {
    console.error('Auto-generation error:', error);
    res.status(500).json({ 
      error: 'Auto-generation failed',
      auto_generation: false
    });
  }
});

export default router;