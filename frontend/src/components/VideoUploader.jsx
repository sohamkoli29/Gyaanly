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
    <div className="glass-card border-2 border-cyan-400/30 p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-2xl font-bold gradient-text">Upload Video Content</h3>
        <button
          onClick={handleCancel}
          className="text-cyan-400 hover:text-cyan-300 transition-colors text-2xl"
          title="Close"
        >
          ×
        </button>
      </div>
      
      {error && (
        <div className="glass-card bg-red-400/10 border-red-400/30 text-red-400 px-4 py-3 rounded-xl mb-6 backdrop-blur-xl">
          <div className="flex items-center gap-2">
            <span>⚠️</span>
            <span className="font-semibold">Upload Error:</span>
            <span>{error}</span>
          </div>
        </div>
      )}

      {!selectedFile ? (
        <div
          className={`
            border-2 border-dashed rounded-xl p-12 text-center transition-all duration-300 cursor-pointer
            ${dragActive 
              ? 'border-cyan-400 bg-cyan-400/10 shadow-neon-md' 
              : 'border-cyan-400/30 hover:border-cyan-400 hover:bg-cyan-400/5'
            }
          `}
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
            <div className="text-cyan-400 mb-4">
              <svg className="w-20 h-20 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <p className="text-xl font-bold gradient-text mb-2">
              {dragActive ? '🚀 Drop Video Here' : '📤 Upload Video Content'}
            </p>
            <p className="text-cyan-400 text-sm mb-4">Drag & drop or click to browse files</p>
            <div className="btn-cyber group">
              <span>Browse Files</span>
              <span className="inline-block ml-2 transition-transform group-hover:scale-110">🔍</span>
            </div>
            <p className="text-xs text-gray-400 mt-4">
              Supported: MP4, WebM, MOV, AVI • Max size: 100MB
            </p>
          </label>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Video Preview */}
          <div className="bg-gradient-to-br from-deep-space to-dark-void rounded-xl overflow-hidden border-2 border-cyan-400/20">
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
          <div className="glass-card border-2 border-cyan-400/20 p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-4 flex-1">
                <div className="w-14 h-14 bg-gradient-to-br from-cyan-400 to-purple-600 rounded-xl flex items-center justify-center flex-shrink-0">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-white text-lg truncate mb-2">{selectedFile.name}</p>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                    <div className="flex items-center text-cyan-400">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                      <span>{formatFileSize(selectedFile.size)}</span>
                    </div>
                    {videoMetadata && (
                      <>
                        <div className="flex items-center text-cyan-400">
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>{formatTime(videoMetadata.duration)}</span>
                        </div>
                        <div className="flex items-center text-cyan-400">
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span>{videoMetadata.width}×{videoMetadata.height}</span>
                        </div>
                        <div className="flex items-center text-cyan-400">
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                  className="text-cyan-400 hover:text-red-400 transition-colors p-2 ml-2 glass-card border border-cyan-400/20 rounded-lg"
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
            <div className="glass-card border-2 border-cyan-400/20 p-6">
              <div className="flex justify-between text-sm mb-3">
                <span className="font-semibold text-cyan-400">🚀 Uploading to Cloud Storage...</span>
                <span className="font-bold text-cyan-400 neon-text">{progress}%</span>
              </div>
              <div className="w-full bg-cyan-400/20 rounded-full h-3 mb-4 overflow-hidden border border-cyan-400/30">
                <div 
                  className="bg-gradient-to-r from-cyan-400 to-purple-400 h-3 rounded-full transition-all duration-300 ease-out relative overflow-hidden"
                  style={{ width: `${progress}%` }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30 animate-shimmer"></div>
                </div>
              </div>
              <div className="flex justify-between text-sm text-cyan-400">
                <span className="flex items-center gap-2">
                  <span>⚡</span>
                  <span>Speed: {(uploadSpeed / 1024 / 1024).toFixed(2)} MB/s</span>
                </span>
                <span className={progress < 100 ? 'animate-pulse' : ''}>
                  {progress < 100 ? '🔄 Processing...' : '✅ Complete!'}
                </span>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-4 pt-4 border-t border-cyan-400/20">
            <button
              onClick={handleUpload}
              disabled={uploading}
              className="btn-neon flex-1 group disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  <span>Uploading {progress}%</span>
                </div>
              ) : (
                <>
                  <span>Launch Upload</span>
                  <span className="inline-block ml-2 text-xl transition-transform group-hover:scale-110">🚀</span>
                </>
              )}
            </button>
            <button
              onClick={handleCancel}
              disabled={uploading}
              className="btn-ghost px-8 disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <style jsx>{`
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