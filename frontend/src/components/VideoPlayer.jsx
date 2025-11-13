import { useState, useEffect, useRef } from 'react';
import { uploadAPI } from '../services/api';
import { progressAPI } from '../services/api'; 

export default function VideoPlayer({ 
  lessonId, 
  videoPath, 
  className = '', 
  autoPlay = false,
  lessons = [],
  currentLessonIndex = 0,
  onLessonChange,
  courseId,
  onProgressUpdate
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
  const [showShortcuts, setShowShortcuts] = useState(false);

  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const controlsTimeoutRef = useRef(null);
  const progressBarRef = useRef(null);
  const lessonListRef = useRef(null);

  const hasPreviousLesson = currentLessonIndex > 0;
  const hasNextLesson = currentLessonIndex < lessons.length - 1;
  const currentLesson = lessons[currentLessonIndex];

  useEffect(() => {
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
    
    fetchSignedUrl();
  }, [lessonId, videoPath]);

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

  useEffect(() => {
    if (duration > 0 && currentTime > 0) {
      const newProgress = Math.round((currentTime / duration) * 100);
      setLessonProgress(newProgress);

      if (newProgress >= 95 && !isCompleted) {
        setIsCompleted(true);
        updateProgress(newProgress, true);
      } else if (newProgress > 0) {
        updateProgress(newProgress, false);
      }
    }
  }, [currentTime, duration]);

  useEffect(() => {
    if (courseId && lessonId) {
      loadProgress();
    }
  }, [courseId, lessonId]);

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
        case '?':
          e.preventDefault();
          setShowShortcuts(prev => !prev);
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

  const updateProgress = async (progress, completed = false) => {
    try {
      if (!courseId || !lessonId) {
        console.log('Missing courseId or lessonId for progress update');
        return;
      }

      const progressChanged = Math.abs(progress - lessonProgress) >= 5;
      const completionChanged = completed !== isCompleted;
      
      if (!progressChanged && !completionChanged) {
        return;
      }

      await progressAPI.updateProgress({
        course_id: courseId,
        lesson_id: lessonId,
        progress_percent: progress,
        completed: completed
      });

      setLessonProgress(progress);
      setIsCompleted(completed);

      if (onProgressUpdate) {
        onProgressUpdate({
          lessonId,
          progress,
          completed,
          courseId
        });
      }
    } catch (error) {
      console.error('Error updating progress:', error);
    }
  };

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
        
        if (videoRef.current && lessonProgress.progress_percent > 0 && !lessonProgress.completed) {
          const resumeTime = (lessonProgress.progress_percent / 100) * duration;
          if (resumeTime < duration - 10) {
            videoRef.current.currentTime = resumeTime;
          }
        }
      } else {
        setLessonProgress(0);
        setIsCompleted(false);
      }
    } catch (error) {
      console.error('Error loading progress:', error);
      setLessonProgress(0);
      setIsCompleted(false);
    }
  };

  const renderProgressIndicator = () => (
    <div className="absolute top-3 left-3 z-20">
      <div className="badge-cyber bg-cyan-400/20 text-cyan-400 border-cyan-400/40">
        {isCompleted ? '✅ Completed' : `📊 ${lessonProgress}% Watched`}
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
      <div className={`bg-gradient-to-br from-gray-900 to-deep-space flex items-center justify-center rounded-xl border-2 border-cyan-400/20 ${className}`}>
        <div className="text-center p-8">
          <div className="relative mb-4">
            <div className="w-16 h-16 border-4 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin mx-auto"></div>
            <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-t-purple-400 rounded-full animate-spin mx-auto" style={{ animationDelay: '0.5s' }}></div>
          </div>
          <p className="text-cyan-400 text-lg font-semibold mb-2">Initializing Video Stream</p>
          <p className="text-gray-400 text-sm">Establishing secure connection...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-gradient-to-br from-gray-900 to-deep-space flex items-center justify-center rounded-xl border-2 border-cyan-400/20 ${className}`}>
        <div className="text-center p-8 max-w-md">
          <div className="text-6xl mb-4">⚠️</div>
          <p className="text-cyan-400 text-lg font-semibold mb-4">{error}</p>
          <div className="space-x-3">
            <button
              onClick={handleRetry}
              className="btn-cyber group"
            >
              <span>🔄 Retry Connection</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!signedUrl) {
    return (
      <div className={`bg-gradient-to-br from-gray-900 to-deep-space flex items-center justify-center rounded-xl border-2 border-cyan-400/20 ${className}`}>
        <div className="text-center p-8">
          <div className="text-6xl mb-4">🎬</div>
          <p className="text-cyan-400 text-xl font-semibold mb-2">Stream Unavailable</p>
          <p className="text-gray-400">Video content is being processed</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className={`relative bg-gradient-to-br from-deep-space to-dark-void rounded-xl overflow-hidden group border-2 border-cyan-400/20 ${className}`}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => playing && setShowControls(false)}
    >
      {renderProgressIndicator()}

      {/* Cyber Grid Overlay */}
      <div className="absolute inset-0 bg-grid opacity-10 pointer-events-none"></div>

      {/* Navigation Arrows */}
      <div className="absolute inset-0 flex items-center justify-between z-10 pointer-events-none">
        {hasPreviousLesson && (
          <button
            onClick={handlePreviousLesson}
            className="pointer-events-auto ml-4 glass-card p-4 text-cyan-400 hover:text-cyan-300 transition-all transform hover:scale-110 opacity-0 group-hover:opacity-100 border border-cyan-400/30 hover:border-cyan-400/60"
            title="Previous Lesson (Ctrl+←)"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}

        {hasNextLesson && (
          <button
            onClick={handleNextLesson}
            className="pointer-events-auto mr-4 glass-card p-4 text-cyan-400 hover:text-cyan-300 transition-all transform hover:scale-110 opacity-0 group-hover:opacity-100 border border-cyan-400/30 hover:border-cyan-400/60"
            title="Next Lesson (Ctrl+→)"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}
      </div>

      {/* Video Element */}
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
          if (hasNextLesson && onLessonChange) {
            setTimeout(() => handleNextLesson(), 2000);
          }
        }}
        autoPlay={autoPlay}
        preload="metadata"
      />

      {/* Play/Pause Overlay */}
      <div 
        className="absolute inset-0 flex items-center justify-center cursor-pointer"
        onClick={togglePlay}
      >
        {!playing && (
          <div className="glass-card p-6 md:p-8 border-2 border-cyan-400/50 transition-all hover:scale-110 hover:border-cyan-400 hover:shadow-neon-lg">
            <svg className="w-12 h-12 md:w-16 md:h-16 text-cyan-400" fill="currentColor" viewBox="0 0 20 20">
              <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
            </svg>
          </div>
        )}
      </div>

      {/* Lesson List */}
      {lessons.length > 0 && (
        <div ref={lessonListRef} className="absolute top-3 right-3 z-20">
          <button
            onClick={() => setShowLessonList(!showLessonList)}
            className="glass-card px-4 py-2 text-cyan-400 hover:text-cyan-300 transition-all border border-cyan-400/30 hover:border-cyan-400/60 flex items-center space-x-2 group"
            title="Lesson List (L)"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
            <span className="hidden sm:inline">Modules</span>
            <span className="text-cyan-400/75 group-hover:text-cyan-300">({currentLessonIndex + 1}/{lessons.length})</span>
          </button>

          {showLessonList && (
            <div className="absolute top-full right-0 mt-2 w-80 max-h-96 overflow-y-auto glass-card border-2 border-cyan-400/30 shadow-neon-lg z-30">
              <div className="p-4">
                <h3 className="text-cyan-400 font-bold mb-3 text-lg">Course Modules</h3>
                <div className="space-y-2">
                  {lessons.map((lesson, index) => (
                    <button
                      key={lesson.id}
                      onClick={() => handleLessonSelect(index)}
                      className={`w-full text-left p-3 rounded-lg transition-all border-2 ${
                        index === currentLessonIndex
                          ? 'bg-cyan-400/20 text-cyan-400 border-cyan-400/50 shadow-neon-sm'
                          : 'bg-dark-void/50 text-gray-300 border-cyan-400/20 hover:border-cyan-400/40 hover:bg-cyan-400/10'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 ${
                            index === currentLessonIndex
                              ? 'bg-cyan-400 text-black border-cyan-400'
                              : 'bg-dark-void text-cyan-400 border-cyan-400/40'
                          }`}>
                            {index + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold truncate">{lesson.title}</p>
                            <p className="text-sm text-cyan-400/75 truncate">
                              {formatDuration(lesson.duration_minutes)}
                              {lesson.video_path && ' • 🎬'}
                            </p>
                          </div>
                        </div>
                        {index === currentLessonIndex && (
                          <div className="flex-shrink-0">
                            <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></div>
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
        <div className="absolute top-3 left-20 glass-card px-3 py-2 text-cyan-400 border border-cyan-400/30 max-w-xs">
          <p className="font-semibold text-sm truncate">{currentLesson.title}</p>
          <p className="text-xs text-cyan-400/75">
            Module {currentLessonIndex + 1} of {lessons.length}
          </p>
        </div>
      )}

      {/* Controls Panel */}
      <div 
        className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-deep-space/90 via-dark-void/80 to-transparent transition-all duration-300 ${
          showControls ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}
      >
        {/* Progress Bar */}
        <div className="px-4 md:px-6 pt-3">
          <div 
            ref={progressBarRef}
            className="h-2 bg-cyan-400/20 rounded-full cursor-pointer hover:h-3 transition-all group/progress border border-cyan-400/30"
            onClick={handleProgressBarClick}
          >
            <div 
              className="absolute h-full bg-cyan-400/40 rounded-full"
              style={{ width: `${buffered}%` }}
            />
            <div 
              className="relative h-full bg-gradient-to-r from-cyan-400 to-purple-400 rounded-full shadow-neon-sm"
              style={{ width: `${(currentTime / duration) * 100}%` }}
            >
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-cyan-400 rounded-full opacity-0 group-hover/progress:opacity-100 transition-opacity shadow-neon-sm" />
            </div>
          </div>
        </div>

        {/* Control Buttons */}
        <div className="flex items-center justify-between px-4 md:px-6 py-3">
          {/* Left Controls */}
          <div className="flex items-center space-x-3 md:space-x-4 flex-1">
            {/* Play/Pause */}
            <button
              onClick={togglePlay}
              className="text-cyan-400 hover:text-cyan-300 transition-all hover:scale-110"
              title={playing ? 'Pause (K)' : 'Play (K)'}
            >
              {playing ? (
                <div className="glass-card p-2 border border-cyan-400/30">
                  <svg className="w-6 h-6 md:w-7 md:h-7" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
              ) : (
                <div className="glass-card p-2 border border-cyan-400/30">
                  <svg className="w-6 h-6 md:w-7 md:h-7" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </button>

            {/* Skip Buttons */}
            <button
              onClick={() => seek(-10)}
              className="text-cyan-400 hover:text-cyan-300 transition-all hover:scale-110 hidden sm:block"
              title="Rewind 10s (←)"
            >
              <div className="glass-card p-2 border border-cyan-400/30">
                <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0019 16V8a1 1 0 00-1.6-.8l-5.333 4zM4.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0011 16V8a1 1 0 00-1.6-.8l-5.334 4z" />
                </svg>
              </div>
            </button>
            <button
              onClick={() => seek(10)}
              className="text-cyan-400 hover:text-cyan-300 transition-all hover:scale-110 hidden sm:block"
              title="Forward 10s (→)"
            >
              <div className="glass-card p-2 border border-cyan-400/30">
                <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.933 12.8a1 1 0 000-1.6L6.6 7.2A1 1 0 005 8v8a1 1 0 001.6.8l5.333-4zM19.933 12.8a1 1 0 000-1.6l-5.333-4A1 1 0 0013 8v8a1 1 0 001.6.8l5.333-4z" />
                </svg>
              </div>
            </button>

            {/* Volume */}
            <div className="flex items-center space-x-2 group/volume">
              <button
                onClick={toggleMute}
                className="text-cyan-400 hover:text-cyan-300 transition-all hover:scale-110"
                title={muted ? 'Unmute (M)' : 'Mute (M)'}
              >
                <div className="glass-card p-2 border border-cyan-400/30">
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
                </div>
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
                className="w-0 md:group-hover/volume:w-16 lg:group-hover/volume:w-20 transition-all duration-300 accent-cyan-400"
              />
            </div>

            {/* Time Display */}
            <div className="text-cyan-400 text-sm font-semibold flex-shrink-0 glass-card px-3 py-1 border border-cyan-400/30">
              <span className="hidden xs:inline">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
              <span className="xs:hidden">
                {formatTime(currentTime)}
              </span>
            </div>
          </div>

          {/* Right Controls */}
          <div className="flex items-center space-x-3 md:space-x-4 flex-shrink-0">
            {/* Playback Speed */}
            <div className="relative group/speed">
              <button className="text-cyan-400 hover:text-cyan-300 transition-all glass-card px-3 py-1 border border-cyan-400/30 hover:border-cyan-400/60 text-sm font-semibold">
                {playbackRate}x
              </button>
              <div className="absolute bottom-full right-0 mb-2 glass-card border-2 border-cyan-400/30 shadow-neon-lg py-2 opacity-0 group-hover/speed:opacity-100 transition-opacity pointer-events-none group-hover/speed:pointer-events-auto min-w-32">
                {[0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map(rate => (
                  <button
                    key={rate}
                    onClick={() => handlePlaybackRateChange(rate)}
                    className={`block w-full px-4 py-2 text-left text-sm transition-all ${
                      playbackRate === rate ? 'text-cyan-400 bg-cyan-400/20' : 'text-gray-300 hover:text-cyan-400 hover:bg-cyan-400/10'
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
              className="text-cyan-400 hover:text-cyan-300 transition-all hover:scale-110"
              title="Fullscreen (F)"
            >
              <div className="glass-card p-2 border border-cyan-400/30">
                {fullscreen ? (
                  <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                  </svg>
                )}
              </div>
            </button>
          </div>
        </div>

        {/* Mobile Lesson Navigation */}
        {lessons.length > 0 && (
          <div className="flex items-center justify-between px-4 pb-3 md:hidden">
            <button
              onClick={handlePreviousLesson}
              disabled={!hasPreviousLesson}
              className={`flex items-center space-x-1 px-3 py-2 rounded text-sm border-2 transition-all ${
                hasPreviousLesson
                  ? 'btn-cyber text-sm'
                  : 'bg-gray-600 text-gray-400 cursor-not-allowed border-gray-600'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span>Prev</span>
            </button>

            <span className="text-cyan-400 text-sm font-semibold glass-card px-3 py-1 border border-cyan-400/30">
              {currentLessonIndex + 1} / {lessons.length}
            </span>

            <button
              onClick={handleNextLesson}
              disabled={!hasNextLesson}
              className={`flex items-center space-x-1 px-3 py-2 rounded text-sm border-2 transition-all ${
                hasNextLesson
                  ? 'btn-cyber text-sm'
                  : 'bg-gray-600 text-gray-400 cursor-not-allowed border-gray-600'
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
      {showShortcuts && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-xl flex items-center justify-center z-40">
          <div className="glass-card border-2 border-cyan-400/30 p-6 max-w-md mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-cyan-400 text-xl font-bold">Keyboard Shortcuts</h3>
              <button
                onClick={() => setShowShortcuts(false)}
                className="text-cyan-400 hover:text-cyan-300 text-2xl"
              >
                ×
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-300">Space/K</span>
                <span className="text-cyan-400">Play/Pause</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">← →</span>
                <span className="text-cyan-400">Skip 10s</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Ctrl+← →</span>
                <span className="text-cyan-400">Navigate lessons</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">↑ ↓</span>
                <span className="text-cyan-400">Volume</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">M</span>
                <span className="text-cyan-400">Mute</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">F</span>
                <span className="text-cyan-400">Fullscreen</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">L</span>
                <span className="text-cyan-400">Lesson list</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">0-9</span>
                <span className="text-cyan-400">Jump to %</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">?</span>
                <span className="text-cyan-400">This help</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Help Button */}
      <button
        onClick={() => setShowShortcuts(true)}
        className="absolute bottom-4 right-4 z-30 glass-card p-2 border border-cyan-400/30 text-cyan-400 hover:text-cyan-300 transition-all opacity-0 group-hover:opacity-100"
        title="Show Keyboard Shortcuts (?)"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </button>
    </div>
  );
}