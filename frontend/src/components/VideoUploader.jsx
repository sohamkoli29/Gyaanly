import { useState, useRef, useEffect } from 'react';
import { uploadAPI } from '../services/api';

export default function VideoUploader({ lessonId, courseId, onUploadComplete, onCancel }) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadSpeed, setUploadSpeed] = useState(0);
  const [error, setError] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [videoPreview, setVideoPreview] = useState('');
  const [videoMetadata, setVideoMetadata] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);
  const abortControllerRef = useRef(null);
  const startTimeRef = useRef(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (videoPreview) {
        URL.revokeObjectURL(videoPreview);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [videoPreview]);

  // Extract video metadata
  const extractVideoMetadata = (file) => {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      
      video.onloadedmetadata = () => {
        const metadata = {
          duration: Math.round(video.duration),
          width: video.videoWidth,
          height: video.videoHeight,
          aspectRatio: (video.videoWidth / video.videoHeight).toFixed(2)
        };
        URL.revokeObjectURL(video.src);
        resolve(metadata);
      };

      video.onerror = () => {
        URL.revokeObjectURL(video.src);
        resolve(null);
      };

      video.src = URL.createObjectURL(file);
    });
  };

  // Format file size
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  // Format time
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Calculate upload speed and ETA
  const calculateUploadStats = (loaded, total) => {
    if (!startTimeRef.current) return { speed: 0, eta: 0 };
    
    const elapsed = (Date.now() - startTimeRef.current) / 1000; // seconds
    const speed = loaded / elapsed; // bytes per second
    const remaining = total - loaded;
    const eta = remaining / speed; // seconds
    
    return { speed, eta };
  };

  const handleFileSelect = async (file) => {
    if (!file) return;

    // Validate file type
    const allowedTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'];
    if (!allowedTypes.includes(file.type)) {
      setError('Please select a valid video file (MP4, WebM, MOV, or AVI)');
      return;
    }

    // Validate file size (100MB max)
    const maxSize = 100 * 1024 * 1024;
    if (file.size > maxSize) {
      setError(`File size must be less than 100MB. Your file is ${formatFileSize(file.size)}`);
      return;
    }

    // Create preview URL
    const previewUrl = URL.createObjectURL(file);
    setVideoPreview(previewUrl);
    setSelectedFile(file);
    setError('');

    // Extract metadata
    const metadata = await extractVideoMetadata(file);
    setVideoMetadata(metadata);
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Please select a file first');
      return;
    }

    setUploading(true);
    setError('');
    setProgress(0);
    startTimeRef.current = Date.now();
    abortControllerRef.current = new AbortController();

    try {
      console.log('Starting upload process...', {
        lessonId,
        courseId,
        fileName: selectedFile.name,
        fileSize: selectedFile.size
      });

      // Step 1: Get signed URL from backend
      const signedUrlResponse = await uploadAPI.getSignedUrl({
        fileName: selectedFile.name,
        fileType: selectedFile.type,
        courseId: courseId,
        lessonId: lessonId
      });

      console.log('Signed URL received:', signedUrlResponse);

      if (!signedUrlResponse.signedUrl) {
        throw new Error('No signed URL received from server');
      }

      // Step 2: Upload file with progress tracking
      await uploadWithProgress(
        signedUrlResponse.signedUrl,
        selectedFile,
        (progressPercent, speed) => {
          setProgress(progressPercent);
          setUploadSpeed(speed);
        }
      );

      console.log('Upload completed, confirming with backend...');

      // Step 3: Confirm upload with backend
      const confirmResponse = await uploadAPI.confirmUpload({
        lessonId: lessonId,
        filePath: signedUrlResponse.filePath,
        fileSize: selectedFile.size,
        fileName: selectedFile.name,
        duration: videoMetadata?.duration || 0
      });

      console.log('Backend confirmation:', confirmResponse);

      if (confirmResponse.lesson) {
        onUploadComplete(confirmResponse.lesson);
        clearSelection();
      } else {
        throw new Error('Failed to update lesson with video info');
      }

    } catch (error) {
      if (error.name === 'AbortError') {
        setError('Upload cancelled');
      } else {
        console.error('Upload process error:', error);
        setError('Upload failed: ' + (error.message || 'Unknown error'));
      }
    } finally {
      setUploading(false);
      setProgress(0);
      setUploadSpeed(0);
      startTimeRef.current = null;
    }
  };

  const uploadWithProgress = (url, file, onProgress) => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const percentComplete = Math.round((e.loaded / e.total) * 100);
          const stats = calculateUploadStats(e.loaded, e.total);
          onProgress(percentComplete, stats.speed);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve();
        } else {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Network error during upload'));
      });

      xhr.addEventListener('abort', () => {
        reject(new Error('Upload cancelled'));
      });

      xhr.open('PUT', url);
      xhr.setRequestHeader('Content-Type', file.type);
      xhr.send(file);

      // Store xhr in abort controller
      abortControllerRef.current = {
        abort: () => xhr.abort()
      };
    });
  };

  const handleCancel = () => {
    if (uploading && abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    clearSelection();
    onCancel();
  };

  const clearSelection = () => {
    if (videoPreview) {
      URL.revokeObjectURL(videoPreview);
    }
    setVideoPreview('');
    setSelectedFile(null);
    setVideoMetadata(null);
    setError('');
    setProgress(0);
    setUploadSpeed(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg border-2 border-gray-200 shadow-lg">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-semibold text-gray-900">Upload Video</h3>
        <button
          onClick={handleCancel}
          className="text-gray-400 hover:text-gray-600 transition-colors"
          title="Close"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded mb-4">
          <div className="flex items-start">
            <svg className="w-5 h-5 text-red-500 mt-0.5 mr-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <div>
              <p className="text-sm font-medium text-red-800">Error</p>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {!selectedFile ? (
        <div
          className={`border-2 border-dashed rounded-lg p-12 text-center transition-all ${
            dragActive 
              ? 'border-blue-500 bg-blue-50' 
              : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="video/mp4,video/webm,video/quicktime,video/x-msvideo"
            onChange={(e) => handleFileSelect(e.target.files[0])}
            className="hidden"
            id="video-upload"
          />
          <label htmlFor="video-upload" className="cursor-pointer block">
            <div className="text-gray-400 mb-4">
              <svg className="w-20 h-20 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <p className="text-lg font-semibold text-gray-700 mb-2">
              {dragActive ? 'Drop video here' : 'Drag & drop video here'}
            </p>
            <p className="text-sm text-gray-500 mb-4">or click to browse</p>
            <div className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors">
              Choose Video
            </div>
            <p className="text-xs text-gray-500 mt-4">
              Supported: MP4, WebM, MOV, AVI • Max size: 100MB
            </p>
          </label>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Video Preview */}
          <div className="bg-gray-900 rounded-lg overflow-hidden">
            <video
              src={videoPreview}
              controls
              className="w-full max-h-80"
              preload="metadata"
            >
              Your browser does not support the video tag.
            </video>
          </div>

          {/* File Info Card */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-3 flex-1">
                <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{selectedFile.name}</p>
                  <div className="grid grid-cols-2 gap-2 mt-2 text-sm text-gray-600">
                    <div className="flex items-center">
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                      <span>{formatFileSize(selectedFile.size)}</span>
                    </div>
                    {videoMetadata && (
                      <>
                        <div className="flex items-center">
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>{formatTime(videoMetadata.duration)}</span>
                        </div>
                        <div className="flex items-center">
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span>{videoMetadata.width}×{videoMetadata.height}</span>
                        </div>
                        <div className="flex items-center">
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <span>{selectedFile.type.split('/')[1].toUpperCase()}</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
              {!uploading && (
                <button
                  onClick={clearSelection}
                  className="text-gray-400 hover:text-red-500 transition-colors p-1 ml-2"
                  title="Remove file"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Upload Progress */}
          {uploading && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex justify-between text-sm mb-2">
                <span className="font-medium text-blue-900">Uploading...</span>
                <span className="font-bold text-blue-900">{progress}%</span>
              </div>
              <div className="w-full bg-blue-200 rounded-full h-3 mb-3 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 h-3 rounded-full transition-all duration-300 ease-out relative overflow-hidden"
                  style={{ width: `${progress}%` }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30 animate-shimmer"></div>
                </div>
              </div>
              <div className="flex justify-between text-xs text-gray-600">
                <span>Upload Speed: {(uploadSpeed / 1024 / 1024).toFixed(2)} MB/s</span>
                <span>{progress < 100 ? 'Please wait...' : 'Processing...'}</span>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-3 pt-2">
            <button
              onClick={handleUpload}
              disabled={uploading}
              className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 px-4 rounded-lg font-semibold hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center shadow-md hover:shadow-lg"
            >
              {uploading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Uploading {progress}%
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  Upload Video
                </>
              )}
            </button>
            <button
              onClick={handleCancel}
              disabled={uploading}
              className="px-6 py-3 border-2 border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-400 disabled:opacity-50 transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <style >{`
        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
        .animate-shimmer {
          animation: shimmer 2s infinite;
        }
      `}</style>
    </div>
  );
}