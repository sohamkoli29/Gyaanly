import { useState, useEffect, useRef } from 'react';
import { uploadAPI } from '../services/api';

export default function VideoPlayer({ lessonId, videoPath, className = '' }) {
  const [signedUrl, setSignedUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const videoRef = useRef(null);

  useEffect(() => {
    fetchSignedUrl();
  }, [lessonId, videoPath]);

  const fetchSignedUrl = async () => {
    if (!lessonId || !videoPath) {
      setLoading(false);
      setError('No video available for this lesson');
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      console.log('Fetching signed URL for lesson:', lessonId);
      const response = await uploadAPI.getStreamUrl(lessonId);
      
      if (!response.signedUrl) {
        throw new Error('No signed URL received from server');
      }
      
      console.log('Signed URL received:', response.signedUrl.substring(0, 100) + '...');
      setSignedUrl(response.signedUrl);
    } catch (err) {
      console.error('Error fetching signed URL:', err);
      setError('Failed to load video: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const handleVideoError = (e) => {
    const video = e.target;
    console.error('Video playback error:', {
      error: video.error,
      errorCode: video.error?.code,
      errorMessage: video.error?.message,
      networkState: video.networkState,
      readyState: video.readyState,
      src: video.src
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
          errorMessage += 'Video format not supported. Try MP4 with H.264 codec.';
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

  const handleRetry = () => {
    setError('');
    setLoading(true);
    fetchSignedUrl();
  };

  if (loading) {
    return (
      <div className={`bg-gray-800 flex items-center justify-center ${className}`}>
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Loading video...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-gray-800 flex items-center justify-center ${className}`}>
        <div className="text-white text-center p-4">
          <div className="text-4xl mb-2">❌</div>
          <p className="text-lg mb-2">{error}</p>
          <div className="space-x-2">
            <button
              onClick={handleRetry}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Retry
            </button>
            <button
              onClick={() => window.location.reload()}
              className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
            >
              Reload Page
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!signedUrl) {
    return (
      <div className={`bg-gray-800 flex items-center justify-center ${className}`}>
        <div className="text-white text-center">
          <div className="text-4xl mb-2">🎬</div>
          <p className="text-lg">Video not available</p>
          <p className="text-sm text-gray-300 mt-1">The video may still be processing</p>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <video
        ref={videoRef}
        controls
        controlsList="nodownload"
        className="w-full h-full bg-black rounded"
        onError={handleVideoError}
        onLoadStart={() => console.log('Video loading started')}
        onCanPlay={() => console.log('Video can start playing')}
        onPlaying={() => console.log('Video started playing')}
      >
        <source src={signedUrl} type="video/mp4" />
        <source src={signedUrl} type="video/webm" />
        <source src={signedUrl} type="video/quicktime" />
        Your browser does not support the video tag.
        <track kind="captions" src="" srcLang="en" label="English" default />
      </video>
      
      {/* Video Info Debug */}
      <div className="mt-2 text-xs text-gray-500 bg-gray-100 p-2 rounded">
        <div>Video Source: {signedUrl.substring(0, 80)}...</div>
        <div>Lesson ID: {lessonId}</div>
        <div>Path: {videoPath}</div>
      </div>
    </div>
  );
}