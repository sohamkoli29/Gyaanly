import express from 'express';
import { supabase, supabaseService } from '../config/supabaseClient.js';
import { authenticateToken } from '../middleware/auth.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// Generate signed URL for direct upload to Supabase Storage
router.post('/signed-url', authenticateToken, async (req, res) => {
  try {
    const { fileName, fileType, courseId, lessonId } = req.body;
    const user_id = req.user.id;

    // Validate file type
    const allowedTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'];
    if (!allowedTypes.includes(fileType)) {
      return res.status(400).json({ error: 'Invalid file type. Only MP4, WebM, MOV, and AVI are allowed.' });
    }

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
      return res.status(403).json({ error: 'Not authorized to upload videos for this course' });
    }

    // Generate unique file path with user ID for security
    const fileExt = fileName.split('.').pop();
    const filePath = `${user_id}/${courseId}/${lessonId}/${uuidv4()}.${fileExt}`;

    console.log('Generating signed URL for path:', filePath);

    // Generate signed upload URL (60 minutes expiry)
    const { data, error } = await supabase.storage
      .from('videos')
      .createSignedUploadUrl(filePath, 60 * 60);

    if (error) {
      console.error('Error generating signed URL:', error);
      return res.status(500).json({ error: 'Failed to generate upload URL: ' + error.message });
    }

    res.json({
      signedUrl: data.signedUrl,
      filePath: filePath,
      token: data.token
    });
  } catch (error) {
    console.error('Signed URL generation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
// Confirm video upload and update lesson
// Confirm video upload and update lesson
router.post('/confirm-upload', authenticateToken, async (req, res) => {
  try {
    const { lessonId, filePath, fileSize, fileName } = req.body;
    const user_id = req.user.id;

    console.log('Confirming upload for lesson:', lessonId, 'filePath:', filePath);

    // Verify the user owns the lesson
    const { data: lesson, error: lessonError } = await supabase
      .from('lessons')
      .select(`
        id,
        courses!inner(instructor_id)
      `)
      .eq('id', lessonId)
      .eq('courses.instructor_id', user_id)
      .single();

    if (lessonError || !lesson) {
      console.error('Lesson ownership verification failed:', lessonError);
      return res.status(403).json({ error: 'Not authorized to update this lesson' });
    }

    // Verify the file actually exists in storage
    const { data: fileCheck, error: fileError } = await supabase.storage
      .from('videos')
      .list(user_id, {
        limit: 100,
        offset: 0,
        sortBy: { column: 'name', order: 'asc' },
      });

    if (fileError) {
      console.error('Error checking storage:', fileError);
    } else {
      console.log('Files in storage:', fileCheck);
    }

    // Update lesson with video information
    const { data: updatedLesson, error: updateError } = await supabase
      .from('lessons')
      .update({
        video_path: filePath,
        video_size: fileSize,
        video_duration: 0, // Placeholder - you could extract this from video metadata
        upload_status: 'ready',
        updated_at: new Date().toISOString()
      })
      .eq('id', lessonId)
      .select(`
        *,
        courses (
          id,
          title
        )
      `)
      .single();

    if (updateError) {
      console.error('Error updating lesson:', updateError);
      return res.status(500).json({ error: 'Failed to update lesson with video info: ' + updateError.message });
    }

    console.log('Lesson updated successfully:', updatedLesson.id);

    res.json({
      message: 'Video uploaded successfully',
      lesson: updatedLesson
    });
  } catch (error) {
    console.error('Upload confirmation error:', error);
    res.status(500).json({ error: 'Internal server error: ' + error.message });
  }
});

// Get signed URL for video streaming
// Get signed URL for video streaming
router.get('/stream/:lessonId', authenticateToken, async (req, res) => {
  try {
    const { lessonId } = req.params;
    const user_id = req.user.id;

    // Get lesson with video path and course info
    const { data: lesson, error: lessonError } = await supabase
      .from('lessons')
      .select(`
        video_path,
        course_id,
        courses!inner(
          instructor_id,
          enrollments(user_id)
        )
      `)
      .eq('id', lessonId)
      .single();

    if (lessonError || !lesson) {
      return res.status(404).json({ error: 'Lesson not found' });
    }

    // Check if user is instructor or enrolled
    const isInstructor = lesson.courses.instructor_id === user_id;
    const isEnrolled = lesson.courses.enrollments?.some(enrollment => enrollment.user_id === user_id);
    
    if (!isInstructor && !isEnrolled) {
      return res.status(403).json({ error: 'Not authorized to view this video' });
    }

    if (!lesson.video_path) {
      return res.status(404).json({ error: 'Video not found for this lesson' });
    }

    console.log('Generating signed URL for streaming:', lesson.video_path);

    // Generate signed URL for secure streaming (1 hour expiry)
    const { data, error } = await supabase.storage
      .from('videos')
      .createSignedUrl(lesson.video_path, 3600);

    if (error) {
      console.error('Error generating signed URL:', error);
      return res.status(500).json({ error: 'Failed to generate video URL: ' + error.message });
    }

    res.json({ signedUrl: data.signedUrl });
  } catch (error) {
    console.error('Stream URL generation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;