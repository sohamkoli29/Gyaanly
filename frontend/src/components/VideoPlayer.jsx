import { useState, useEffect, useRef } from 'react';
import { uploadAPI } from '../services/api';
import { progressAPI } from '../services/api'; 
export default function VideoPlayer({ 
  lessonId, 
  videoPath, 
  className = '', 
  autoPlay = false,
  lessons = [], // Array of all lessons in the course
  currentLessonIndex = 0, // Current lesson index in the array
  onLessonChange ,// Callback when user changes lesson
    courseId, // Add courseId prop
  onProgressUpdate // Callback when progress changes
}) {
  const [signedUrl, setSignedUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showControls, setShowControls] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const [buffered, setBuffered] = useState(0);
  const [showLessonList, setShowLessonList] = useState(false);
    const [lessonProgress, setLessonProgress] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);


  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const controlsTimeoutRef = useRef(null);
  const progressBarRef = useRef(null);
  const lessonListRef = useRef(null);

  // Navigation states
  const hasPreviousLesson = currentLessonIndex > 0;
  const hasNextLesson = currentLessonIndex < lessons.length - 1;
  const currentLesson = lessons[currentLessonIndex];

  useEffect(() => {
    // Validate props before fetching
    if (!lessonId) {
      console.error('VideoPlayer: lessonId is required but not provided');
      setLoading(false);
      setError('Invalid lesson configuration');
      return;
    }
    
    if (!videoPath) {
      console.log('VideoPlayer: No video path provided for lesson', lessonId);
      setLoading(false);
      setError('No video available for this lesson');
      return;
    }
    
    // Only fetch if we have valid props
    fetchSignedUrl();
  }, [lessonId, videoPath]);

  // Close lesson list when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (lessonListRef.current && !lessonListRef.current.contains(event.target)) {
        setShowLessonList(false);
      }
    };

    if (showLessonList) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showLessonList]);

  // Save progress periodically
  useEffect(() => {
    if (duration > 0 && currentTime > 0) {
      const newProgress = Math.round((currentTime / duration) * 100);
      setLessonProgress(newProgress);

      // Mark as completed if watched 95% or more
      if (newProgress >= 95 && !isCompleted) {
        setIsCompleted(true);
        updateProgress(newProgress, true);
      } else if (newProgress > 0) {
        updateProgress(newProgress, false);
      }
    }
  }, [currentTime, duration]);

  // Load saved progress
 useEffect(() => {
    if (courseId && lessonId) {
      loadProgress();
    }
  }, [courseId, lessonId]);
  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (!videoRef.current) return;
      
      switch(e.key) {
        case ' ':
        case 'k':
          e.preventDefault();
          togglePlay();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          if (e.ctrlKey || e.metaKey) {
            handlePreviousLesson();
          } else {
            seek(-10);
          }
          break;
        case 'ArrowRight':
          e.preventDefault();
          if (e.ctrlKey || e.metaKey) {
            handleNextLesson();
          } else {
            seek(10);
          }
          break;
        case 'ArrowUp':
          e.preventDefault();
          changeVolume(0.1);
          break;
        case 'ArrowDown':
          e.preventDefault();
          changeVolume(-0.1);
          break;
        case 'm':
          e.preventDefault();
          toggleMute();
          break;
        case 'f':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'l':
          e.preventDefault();
          setShowLessonList(prev => !prev);
          break;
        case '0':
        case '1':
        case '2':
        case '3':
        case '4':
        case '5':
        case '6':
        case '7':
        case '8':
        case '9':
          e.preventDefault();
          const percent = parseInt(e.key) / 10;
          videoRef.current.currentTime = duration * percent;
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [duration, hasPreviousLesson, hasNextLesson]);

  // Auto-hide controls
  useEffect(() => {
    const handleMouseMove = () => {
      setShowControls(true);
      clearTimeout(controlsTimeoutRef.current);
      if (playing) {
        controlsTimeoutRef.current = setTimeout(() => {
          setShowControls(false);
        }, 3000);
      }
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('mousemove', handleMouseMove);
      return () => {
        container.removeEventListener('mousemove', handleMouseMove);
        clearTimeout(controlsTimeoutRef.current);
      };
    }
  }, [playing]);

  const fetchSignedUrl = async () => {
    try {
      setLoading(true);
      setError('');
      
      if (!lessonId || lessonId === 'undefined') {
        throw new Error('Invalid lesson ID');
      }
      
      console.log('Fetching signed URL for lesson:', lessonId);
      const response = await uploadAPI.getStreamUrl(lessonId);
      
      if (!response || !response.signedUrl) {
        throw new Error('No signed URL received from server');
      }
      
      console.log('Signed URL received successfully');
      setSignedUrl(response.signedUrl);
    } catch (err) {
      console.error('Error fetching signed URL:', err);
      const errorMessage = err.message || 'Unknown error';
      
      if (errorMessage.includes('Access token required') || errorMessage.includes('401')) {
        setError('Please log in to watch this video');
      } else if (errorMessage.includes('Invalid lesson ID')) {
        setError('Video configuration error. Please refresh the page.');
      } else {
        setError('Failed to load video: ' + errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (playing) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
    }
  };

  const seek = (seconds) => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.max(0, Math.min(videoRef.current.currentTime + seconds, duration));
    }
  };

  const changeVolume = (delta) => {
    if (videoRef.current) {
      const newVolume = Math.max(0, Math.min(1, volume + delta));
      setVolume(newVolume);
      videoRef.current.volume = newVolume;
      if (newVolume > 0 && muted) {
        setMuted(false);
        videoRef.current.muted = false;
      }
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !muted;
      setMuted(!muted);
    }
  };

  const handlePlaybackRateChange = (rate) => {
    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
      setPlaybackRate(rate);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setFullscreen(true);
    } else {
      document.exitFullscreen();
      setFullscreen(false);
    }
  };

  const handleProgressBarClick = (e) => {
    if (progressBarRef.current && videoRef.current) {
      const rect = progressBarRef.current.getBoundingClientRect();
      const pos = (e.clientX - rect.left) / rect.width;
      videoRef.current.currentTime = pos * duration;
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
      
      const bufferedEnd = videoRef.current.buffered.length > 0 
        ? videoRef.current.buffered.end(videoRef.current.buffered.length - 1)
        : 0;
      setBuffered((bufferedEnd / duration) * 100);
    }
  };

  const handlePreviousLesson = () => {
    if (hasPreviousLesson && onLessonChange) {
      onLessonChange(currentLessonIndex - 1);
    }
  };

  const handleNextLesson = () => {
    if (hasNextLesson && onLessonChange) {
      onLessonChange(currentLessonIndex + 1);
    }
  };

  const handleLessonSelect = (index) => {
    if (onLessonChange) {
      onLessonChange(index);
      setShowLessonList(false);
    }
  };

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDuration = (minutes) => {
    if (!minutes) return '0 min';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const handleVideoError = (e) => {
    const video = e.target;
    console.error('Video playback error:', {
      error: video.error,
      errorCode: video.error?.code,
      networkState: video.networkState,
      readyState: video.readyState
    });

    let errorMessage = 'Video playback failed. ';
    
    if (video.error) {
      switch (video.error.code) {
        case video.error.MEDIA_ERR_ABORTED:
          errorMessage += 'Video loading was aborted.';
          break;
        case video.error.MEDIA_ERR_NETWORK:
          errorMessage += 'Network error occurred.';
          break;
        case video.error.MEDIA_ERR_DECODE:
          errorMessage += 'Video format not supported.';
          break;
        case video.error.MEDIA_ERR_SRC_NOT_SUPPORTED:
          errorMessage += 'Video format not supported by your browser.';
          break;
        default:
          errorMessage += 'Unknown error occurred.';
      }
    }
    
    setError(errorMessage);
  };
// Replace the updateProgress
const updateProgress = async (progress, completed = false) => {
  try {
    if (!courseId || !lessonId) {
      console.log('Missing courseId or lessonId for progress update');
      return;
    }

    // Only update if progress changed significantly (to avoid too many API calls)
    const progressChanged = Math.abs(progress - lessonProgress) >= 5;
    const completionChanged = completed !== isCompleted;
    
    if (!progressChanged && !completionChanged) {
      return;
    }

    console.log('Updating progress:', { 
      progress, 
      completed, 
      previousProgress: lessonProgress,
      previousCompleted: isCompleted 
    });

    await progressAPI.updateProgress({
      course_id: courseId,
      lesson_id: lessonId,
      progress_percent: progress,
      completed: completed
    });

    // Update local state immediately for better UX
    setLessonProgress(progress);
    setIsCompleted(completed);

    // Notify parent component
    if (onProgressUpdate) {
      onProgressUpdate({
        lessonId,
        progress,
        completed,
        courseId
      });
    }

    console.log('Progress updated successfully:', { progress, completed });
  } catch (error) {
    console.error('Error updating progress:', error);
    // Don't break the video player if progress tracking fails
  }
};

// Also update the useEffect that calls updateProgress:
useEffect(() => {
  if (duration > 0 && currentTime > 0) {
    const newProgress = Math.round((currentTime / duration) * 100);
    
    // Only update if progress actually changed
    if (newProgress !== lessonProgress) {
      setLessonProgress(newProgress);

      // Mark as completed if watched 95% or more
      const shouldComplete = newProgress >= 95 && !isCompleted;
      
      if (shouldComplete || newProgress > 0) {
        updateProgress(newProgress, shouldComplete || isCompleted);
      }
    }
  }
}, [currentTime, duration]);
const loadProgress = async () => {
  try {
    if (!courseId) {
      console.log('No courseId provided for progress tracking');
      return;
    }

    const progressData = await progressAPI.getCourseProgress(courseId);
    const lessonProgress = progressData.lessonProgress?.find(
      lp => lp.lesson_id === lessonId
    );
    
    if (lessonProgress) {
      setLessonProgress(lessonProgress.progress_percent);
      setIsCompleted(lessonProgress.completed);
      
      console.log('Loaded progress:', {
        progress: lessonProgress.progress_percent,
        completed: lessonProgress.completed
      });

      // Resume from saved position if not completed
      if (videoRef.current && lessonProgress.progress_percent > 0 && !lessonProgress.completed) {
        const resumeTime = (lessonProgress.progress_percent / 100) * duration;
        if (resumeTime < duration - 10) { // Don't resume if < 10s remaining
          videoRef.current.currentTime = resumeTime;
          console.log('Resumed from:', resumeTime, 'seconds');
        }
      }
    } else {
      console.log('No progress found for this lesson');
      // Initialize with default values
      setLessonProgress(0);
      setIsCompleted(false);
    }
  } catch (error) {
    console.error('Error loading progress:', error);
    // Initialize with default values on error
    setLessonProgress(0);
    setIsCompleted(false);
  }
};


    const renderProgressIndicator = () => (
    <div className="absolute top-2 left-2 z-10">
      <div className="bg-black bg-opacity-75 rounded-full px-3 py-1 text-white text-xs font-medium">
        {isCompleted ? '✅ Completed' : `${lessonProgress}% Watched`}
      </div>
    </div>
  );
  const handleRetry = () => {
    setError('');
    setLoading(true);
    fetchSignedUrl();
  };

  if (loading) {
    return (
      
      <div className={`bg-gray-900 flex items-center justify-center rounded-lg ${className}`}>
        
        <div className="text-white text-center p-8">

          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500 mx-auto mb-4"></div>
          <p className="text-lg font-medium">Loading video...</p>
          <p className="text-sm text-gray-400 mt-2">Please wait</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-gray-900 flex items-center justify-center rounded-lg ${className}`}>
        <div className="text-white text-center p-8 max-w-md">
          <div className="text-6xl mb-4">⚠️</div>
          <p className="text-lg font-medium mb-4">{error}</p>
          <div className="space-x-3">
            <button
              onClick={handleRetry}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              🔄 Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!signedUrl) {
    return (
      <div className={`bg-gray-900 flex items-center justify-center rounded-lg ${className}`}>
        <div className="text-white text-center p-8">
          <div className="text-6xl mb-4">🎬</div>
          <p className="text-xl font-medium mb-2">Video Not Available</p>
          <p className="text-gray-400">The video may still be processing</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className={`relative bg-black rounded-lg overflow-hidden group ${className}`}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => playing && setShowControls(false)}
    >
      {renderProgressIndicator()}
      {/* Lesson Navigation Overlay */}
      <div className="absolute inset-0 flex items-center justify-between z-10 pointer-events-none">
        {/* Previous Lesson Arrow */}
        {hasPreviousLesson && (
          <button
            onClick={handlePreviousLesson}
            className="pointer-events-auto ml-4 bg-black bg-opacity-50 hover:bg-opacity-70 text-white p-3 rounded-full transition-all transform hover:scale-110 opacity-0 group-hover:opacity-100"
            title="Previous Lesson (Ctrl+←)"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}

        {/* Next Lesson Arrow */}
        {hasNextLesson && (
          <button
            onClick={handleNextLesson}
            className="pointer-events-auto mr-4 bg-black bg-opacity-50 hover:bg-opacity-70 text-white p-3 rounded-full transition-all transform hover:scale-110 opacity-0 group-hover:opacity-100"
            title="Next Lesson (Ctrl+→)"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}
      </div>

      <video
        ref={videoRef}
        className="w-full h-full"
        src={signedUrl}
        onError={handleVideoError}
        onLoadedMetadata={(e) => setDuration(e.target.duration)}
        onTimeUpdate={handleTimeUpdate}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => {
          setPlaying(false);
          // Auto-advance to next lesson when video ends
          if (hasNextLesson && onLessonChange) {
            setTimeout(() => handleNextLesson(), 2000);
          }
        }}
        autoPlay={autoPlay}
        preload="metadata"
      />

      {/* Click to play/pause overlay */}
      <div 
        className="absolute inset-0 flex items-center justify-center cursor-pointer"
        onClick={togglePlay}
      >
        {!playing && (
          <div className="bg-black bg-opacity-50 rounded-full p-4 md:p-6 transition-transform hover:scale-110">
            <svg className="w-12 h-12 md:w-16 md:h-16 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
            </svg>
          </div>
        )}
      </div>

      {/* Lesson List Dropdown */}
      {lessons.length > 0 && (
        <div ref={lessonListRef} className="absolute top-4 left-4 z-20">
          <button
            onClick={() => setShowLessonList(!showLessonList)}
            className="bg-black bg-opacity-75 text-white px-3 py-2 rounded-lg font-medium hover:bg-opacity-90 transition-all flex items-center space-x-2"
            title="Lesson List (L)"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
            <span className="hidden sm:inline">Lessons</span>
            <span className="text-sm opacity-75">({currentLessonIndex + 1}/{lessons.length})</span>
          </button>

          {showLessonList && (
            <div className="absolute top-full left-0 mt-2 w-80 max-h-96 overflow-y-auto bg-gray-900 rounded-lg shadow-xl z-30">
              <div className="p-4">
                <h3 className="text-white font-semibold mb-3">Course Lessons</h3>
                <div className="space-y-2">
                  {lessons.map((lesson, index) => (
                    <button
                      key={lesson.id}
                      onClick={() => handleLessonSelect(index)}
                      className={`w-full text-left p-3 rounded-lg transition-all ${
                        index === currentLessonIndex
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                            index === currentLessonIndex
                              ? 'bg-white text-blue-600'
                              : 'bg-gray-700 text-gray-300'
                          }`}>
                            {index + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{lesson.title}</p>
                            <p className="text-sm opacity-75 truncate">
                              {formatDuration(lesson.duration_minutes)}
                              {lesson.video_path && ' • 🎬'}
                            </p>
                          </div>
                        </div>
                        {index === currentLessonIndex && (
                          <div className="flex-shrink-0">
                            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Current Lesson Info */}
      {currentLesson && (
        <div className="absolute top-4 right-4 bg-black bg-opacity-75 text-white px-3 py-2 rounded-lg max-w-xs">
          <p className="font-medium text-sm truncate">{currentLesson.title}</p>
          <p className="text-xs opacity-75">
            Lesson {currentLessonIndex + 1} of {lessons.length}
          </p>
        </div>
      )}

      {/* Custom Controls */}
      <div 
        className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/80 to-transparent transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {/* Progress Bar */}
        <div className="px-3 md:px-4 pt-2">
          <div 
            ref={progressBarRef}
            className="h-1.5 bg-gray-600 rounded-full cursor-pointer hover:h-2 transition-all group/progress"
            onClick={handleProgressBarClick}
          >
            <div 
              className="absolute bg-gray-500 rounded-full"
              style={{ width: `${buffered}%` }}
            />
            <div 
              className="relative h-full bg-blue-600 rounded-full"
              style={{ width: `${(currentTime / duration) * 100}%` }}
            >
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-blue-600 rounded-full opacity-0 group-hover/progress:opacity-100 transition-opacity" />
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between px-3 md:px-4 py-2 md:py-3">
          {/* Left Controls */}
          <div className="flex items-center space-x-2 md:space-x-3 flex-1">
            {/* Play/Pause */}
            <button
              onClick={togglePlay}
              className="text-white hover:text-blue-400 transition-colors flex-shrink-0"
              title={playing ? 'Pause (K)' : 'Play (K)'}
            >
              {playing ? (
                <svg className="w-6 h-6 md:w-8 md:h-8" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-6 h-6 md:w-8 md:h-8" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                </svg>
              )}
            </button>

            {/* Skip buttons */}
            <button
              onClick={() => seek(-10)}
              className="text-white hover:text-blue-400 transition-colors hidden sm:block"
              title="Rewind 10s (←)"
            >
              <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0019 16V8a1 1 0 00-1.6-.8l-5.333 4zM4.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0011 16V8a1 1 0 00-1.6-.8l-5.334 4z" />
              </svg>
            </button>
            <button
              onClick={() => seek(10)}
              className="text-white hover:text-blue-400 transition-colors hidden sm:block"
              title="Forward 10s (→)"
            >
              <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.933 12.8a1 1 0 000-1.6L6.6 7.2A1 1 0 005 8v8a1 1 0 001.6.8l5.333-4zM19.933 12.8a1 1 0 000-1.6l-5.333-4A1 1 0 0013 8v8a1 1 0 001.6.8l5.333-4z" />
              </svg>
            </button>

            {/* Volume */}
            <div className="flex items-center space-x-2 group/volume">
              <button
                onClick={toggleMute}
                className="text-white hover:text-blue-400 transition-colors"
                title={muted ? 'Unmute (M)' : 'Mute (M)'}
              >
                {muted || volume === 0 ? (
                  <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" clipRule="evenodd" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                  </svg>
                ) : volume < 0.5 ? (
                  <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  </svg>
                )}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={muted ? 0 : volume}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setVolume(val);
                  if (videoRef.current) {
                    videoRef.current.volume = val;
                    if (val > 0 && muted) {
                      setMuted(false);
                      videoRef.current.muted = false;
                    }
                  }
                }}
                className="w-0 md:group-hover/volume:w-16 lg:group-hover/volume:w-20 transition-all duration-300 accent-blue-600"
              />
            </div>

            {/* Time */}
            <div className="text-white text-sm font-medium flex-shrink-0">
              <span className="hidden xs:inline">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
              <span className="xs:hidden">
                {formatTime(currentTime)}
              </span>
            </div>
          </div>

          {/* Right Controls */}
          <div className="flex items-center space-x-2 md:space-x-3 flex-shrink-0">
            {/* Playback Speed */}
            <div className="relative group/speed">
              <button className="text-white hover:text-blue-400 transition-colors text-sm font-medium px-2 py-1 rounded bg-white/10 hover:bg-white/20">
                {playbackRate}x
              </button>
              <div className="absolute bottom-full right-0 mb-2 bg-gray-900 rounded-lg shadow-xl py-2 opacity-0 group-hover/speed:opacity-100 transition-opacity pointer-events-none group-hover/speed:pointer-events-auto min-w-32">
                {[0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map(rate => (
                  <button
                    key={rate}
                    onClick={() => handlePlaybackRateChange(rate)}
                    className={`block w-full px-4 py-2 text-left text-sm ${
                      playbackRate === rate ? 'text-blue-400 bg-white/10' : 'text-white hover:bg-white/10'
                    }`}
                  >
                    {rate}x {rate === 1 && '(Normal)'}
                  </button>
                ))}
              </div>
            </div>

            {/* Fullscreen */}
            <button
              onClick={toggleFullscreen}
              className="text-white hover:text-blue-400 transition-colors"
              title="Fullscreen (F)"
            >
              {fullscreen ? (
                <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Lesson Navigation for Small Screens */}
        {lessons.length > 0 && (
          <div className="flex items-center justify-between px-3 md:px-4 pb-2 md:hidden">
            <button
              onClick={handlePreviousLesson}
              disabled={!hasPreviousLesson}
              className={`flex items-center space-x-1 px-3 py-1 rounded text-sm ${
                hasPreviousLesson
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-600 text-gray-400 cursor-not-allowed'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span>Previous</span>
            </button>

            <span className="text-white text-sm">
              {currentLessonIndex + 1} / {lessons.length}
            </span>

            <button
              onClick={handleNextLesson}
              disabled={!hasNextLesson}
              className={`flex items-center space-x-1 px-3 py-1 rounded text-sm ${
                hasNextLesson
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-600 text-gray-400 cursor-not-allowed'
              }`}
            >
              <span>Next</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Keyboard Shortcuts Help */}
      <div className={`absolute top-16 right-4 bg-black bg-opacity-75 rounded-lg p-3 text-white text-xs transition-opacity duration-300 hidden lg:block ${
        showControls ? 'opacity-0 group-hover:opacity-100' : 'opacity-0'
      }`}>
        <p className="font-semibold mb-1">Keyboard Shortcuts</p>
        <p>Space/K - Play/Pause</p>
        <p>← → - Skip 10s</p>
        <p>Ctrl+← → - Navigate lessons</p>
        <p>↑ ↓ - Volume</p>
        <p>M - Mute</p>
        <p>F - Fullscreen</p>
        <p>L - Lesson list</p>
        <p>0-9 - Jump to %</p>
      </div>
    </div>
  );
}