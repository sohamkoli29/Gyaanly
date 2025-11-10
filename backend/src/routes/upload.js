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

    console.log('Generating signed URL:', { fileName, fileType, courseId, lessonId, user_id });

    // Validate file type
    const allowedTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'];
    if (!allowedTypes.includes(fileType)) {
      return res.status(400).json({ 
        error: 'Invalid file type. Only MP4, WebM, MOV, and AVI are allowed.' 
      });
    }

    // Verify user is instructor of the course
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('instructor_id')
      .eq('id', courseId)
      .single();

    if (courseError || !course) {
      console.error('Course verification error:', courseError);
      return res.status(404).json({ error: 'Course not found' });
    }

    if (course.instructor_id !== user_id) {
      return res.status(403).json({ 
        error: 'Not authorized to upload videos for this course' 
      });
    }

    // Verify lesson belongs to course
    const { data: lesson, error: lessonError } = await supabase
      .from('lessons')
      .select('course_id')
      .eq('id', lessonId)
      .single();

    if (lessonError || !lesson || lesson.course_id !== courseId) {
      console.error('Lesson verification error:', lessonError);
      return res.status(404).json({ error: 'Lesson not found or does not belong to this course' });
    }

    // Generate unique file path with user ID for security
    const fileExt = fileName.split('.').pop();
    const uniqueId = uuidv4();
    const filePath = `${user_id}/${courseId}/${lessonId}/${uniqueId}.${fileExt}`;

    console.log('Generating signed URL for path:', filePath);

    // Generate signed upload URL (60 minutes expiry)
    const { data, error } = await supabase.storage
      .from('videos')
      .createSignedUploadUrl(filePath, {
        upsert: false
      });

    if (error) {
      console.error('Error generating signed URL:', error);
      return res.status(500).json({ 
        error: 'Failed to generate upload URL: ' + error.message 
      });
    }

    console.log('Signed URL generated successfully');

    res.json({
      signedUrl: data.signedUrl,
      filePath: filePath,
      token: data.token,
      expiresIn: 3600 // 1 hour
    });
  } catch (error) {
    console.error('Signed URL generation error:', error);
    res.status(500).json({ 
      error: 'Internal server error: ' + error.message 
    });
  }
});

// Confirm video upload and update lesson
router.post('/confirm-upload', authenticateToken, async (req, res) => {
  try {
    const { lessonId, filePath, fileSize, fileName, duration } = req.body;
    const user_id = req.user.id;

    console.log('Confirming upload for lesson:', { 
      lessonId, 
      filePath, 
      fileSize, 
      fileName,
      duration 
    });

    // Verify the user owns the lesson
    const { data: lesson, error: lessonError } = await supabase
      .from('lessons')
      .select(`
        id,
        course_id,
        courses!inner(instructor_id)
      `)
      .eq('id', lessonId)
      .eq('courses.instructor_id', user_id)
      .single();

    if (lessonError || !lesson) {
      console.error('Lesson ownership verification failed:', lessonError);
      return res.status(403).json({ 
        error: 'Not authorized to update this lesson' 
      });
    }

    // Verify the file exists in storage
    const { data: fileExists, error: fileError } = await supabase.storage
      .from('videos')
      .list(filePath.substring(0, filePath.lastIndexOf('/')), {
        search: filePath.substring(filePath.lastIndexOf('/') + 1)
      });

    if (fileError) {
      console.error('Error checking file in storage:', fileError);
      return res.status(500).json({ 
        error: 'Failed to verify file upload: ' + fileError.message 
      });
    }

    if (!fileExists || fileExists.length === 0) {
      console.error('File not found in storage:', filePath);
      return res.status(404).json({ 
        error: 'Video file not found in storage. Upload may have failed.' 
      });
    }

    console.log('File verified in storage:', fileExists[0]);

    // Generate public URL for the video (this will be used with signed URLs for streaming)
    const { data: { publicUrl } } = supabase.storage
      .from('videos')
      .getPublicUrl(filePath);

    // Update lesson with video information
    const { data: updatedLesson, error: updateError } = await supabase
      .from('lessons')
      .update({
        video_path: filePath,
        video_url: publicUrl, // Store public URL (will use signed URLs for actual access)
        video_size: fileSize,
        video_duration: duration || 0,
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
      return res.status(500).json({ 
        error: 'Failed to update lesson with video info: ' + updateError.message 
      });
    }

    console.log('Lesson updated successfully:', updatedLesson.id);

    res.json({
      message: 'Video uploaded successfully',
      lesson: updatedLesson,
      videoInfo: {
        path: filePath,
        size: fileSize,
        duration: duration || 0,
        uploadedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Upload confirmation error:', error);
    res.status(500).json({ 
      error: 'Internal server error: ' + error.message 
    });
  }
});

// Get signed URL for video streaming
router.get('/stream/:lessonId', authenticateToken, async (req, res) => {
  try {
    const { lessonId } = req.params;
    const user_id = req.user.id;

    console.log('Generating stream URL for lesson:', lessonId, 'user:', user_id);

    // Get lesson with video path and course info
    const { data: lesson, error: lessonError } = await supabase
      .from('lessons')
      .select(`
        id,
        video_path,
        course_id,
        courses!inner(
          id,
          instructor_id,
          is_published
        )
      `)
      .eq('id', lessonId)
      .single();

    if (lessonError || !lesson) {
      console.error('Lesson not found:', lessonError);
      return res.status(404).json({ error: 'Lesson not found' });
    }

    if (!lesson.video_path) {
      return res.status(404).json({ 
        error: 'No video available for this lesson' 
      });
    }

    // Check if user is instructor
    const isInstructor = lesson.courses.instructor_id === user_id;

    // Check if user is enrolled (only for published courses)
    let isEnrolled = false;
    if (!isInstructor && lesson.courses.is_published) {
      const { data: enrollment } = await supabase
        .from('enrollments')
        .select('id')
        .eq('user_id', user_id)
        .eq('course_id', lesson.course_id)
        .single();
      
      isEnrolled = !!enrollment;
    }

    // Allow access if user is instructor, enrolled, or course is free/unpublished (for preview)
    if (!isInstructor && !isEnrolled) {
      // Check if course is free
      const { data: coursePrice } = await supabase
        .from('courses')
        .select('price')
        .eq('id', lesson.course_id)
        .single();
      
      if (!coursePrice || coursePrice.price > 0) {
        return res.status(403).json({ 
          error: 'Not authorized to view this video. Please enroll in the course.' 
        });
      }
    }

    console.log('Access granted. Generating signed URL for:', lesson.video_path);

    // Generate signed URL for secure streaming (2 hours expiry)
    const { data, error } = await supabase.storage
      .from('videos')
      .createSignedUrl(lesson.video_path, 7200); // 2 hours

    if (error) {
      console.error('Error generating signed URL:', error);
      return res.status(500).json({ 
        error: 'Failed to generate video URL: ' + error.message 
      });
    }

    if (!data || !data.signedUrl) {
      console.error('No signed URL returned');
      return res.status(500).json({ 
        error: 'Failed to generate video URL' 
      });
    }

    console.log('Signed URL generated successfully');

    res.json({ 
      signedUrl: data.signedUrl,
      expiresIn: 7200, // 2 hours
      lessonId: lessonId
    });
  } catch (error) {
    console.error('Stream URL generation error:', error);
    res.status(500).json({ 
      error: 'Internal server error: ' + error.message 
    });
  }
});

// Test storage configuration
router.get('/test-storage', authenticateToken, async (req, res) => {
  try {
    const { data: buckets, error } = await supabase.storage.listBuckets();
    
    if (error) {
      return res.status(500).json({ 
        error: 'Storage error: ' + error.message 
      });
    }

    const videosBucket = buckets.find(b => b.name === 'videos');

    res.json({
      buckets: buckets.map(b => ({
        name: b.name,
        public: b.public,
        created_at: b.created_at
      })),
      hasVideosBucket: !!videosBucket,
      videosBucketDetails: videosBucket || null,
      userCanAccess: true
    });
  } catch (error) {
    res.status(500).json({ 
      error: error.message 
    });
  }
});

// Delete video from storage (called when lesson is deleted)
router.delete('/video/:lessonId', authenticateToken, async (req, res) => {
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
      .eq('courses.instructor_id', user_id)
      .single();

    if (lessonError || !lesson) {
      return res.status(403).json({ 
        error: 'Not authorized to delete this video' 
      });
    }

    if (!lesson.video_path) {
      return res.status(404).json({ 
        error: 'No video found for this lesson' 
      });
    }

    // Delete video from storage
    const { error: storageError } = await supabase.storage
      .from('videos')
      .remove([lesson.video_path]);

    if (storageError) {
      console.error('Error deleting video from storage:', storageError);
      return res.status(500).json({ 
        error: 'Failed to delete video: ' + storageError.message 
      });
    }

    res.json({ 
      message: 'Video deleted successfully',
      videoPath: lesson.video_path
    });
  } catch (error) {
    console.error('Video deletion error:', error);
    res.status(500).json({ 
      error: 'Internal server error: ' + error.message 
    });
  }
});

export default router;