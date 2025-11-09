import { useState, useEffect, useRef } from 'react';
import { uploadAPI } from '../services/api';

export default function VideoPlayer({ lessonId, videoPath, className = '' }) {
  const [signedUrl, setSignedUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const videoRef = useRef(null);

  useEffect(() => {
    if (lessonId && videoPath) {
      fetchSignedUrl();
    } else {
      setLoading(false);
      setError('No video available for this lesson');
    }
  }, [lessonId, videoPath]);

  const fetchSignedUrl = async () => {
    try {
      setLoading(true);
      setError('');
      
      console.log('Fetching signed URL for lesson:', lessonId);
      const response = await uploadAPI.getStreamUrl(lessonId);
      
      if (!response.signedUrl) {
        throw new Error('No signed URL received from server');
      }
      
      console.log('Signed URL received successfully');
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

  const handleRetry = () => {
    setError('');
    setLoading(true);
    fetchSignedUrl();
  };

  if (loading) {
    return (
      <div className={`bg-gray-900 flex items-center justify-center rounded-lg ${className}`}>
        <div className="text-white text-center p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-lg">Loading video...</p>
          <p className="text-sm text-gray-400 mt-2">Please wait</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-gray-900 flex items-center justify-center rounded-lg ${className}`}>
        <div className="text-white text-center p-6">
          <div className="text-4xl mb-3">❌</div>
          <p className="text-lg font-medium mb-3">{error}</p>
          <div className="space-x-3">
            <button
              onClick={handleRetry}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!signedUrl) {
    return (
      <div className={`bg-gray-900 flex items-center justify-center rounded-lg ${className}`}>
        <div className="text-white text-center p-6">
          <div className="text-4xl mb-3">🎬</div>
          <p className="text-lg font-medium mb-2">Video Not Available</p>
          <p className="text-gray-400">The video may still be processing or is not available</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-black rounded-lg overflow-hidden ${className}`}>
      <video
        ref={videoRef}
        controls
        controlsList="nodownload"
        className="w-full h-full"
        onError={handleVideoError}
        onLoadStart={() => console.log('Video loading started')}
        onCanPlay={() => console.log('Video can start playing')}
        onPlaying={() => console.log('Video started playing')}
        preload="metadata"
      >
        <source src={signedUrl} type="video/mp4" />
        <source src={signedUrl} type="video/webm" />
        Your browser does not support the video tag.
      </video>
    </div>
  );
}