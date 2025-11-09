import { useState, useRef } from 'react';

export default function VideoUploader({ lessonId, courseId, onUploadComplete, onCancel }) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [videoPreview, setVideoPreview] = useState('');
  const videoRef = useRef(null);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'];
    if (!allowedTypes.includes(file.type)) {
      setError('Please select a valid video file (MP4, WebM, MOV, or AVI)');
      return;
    }

    // Validate file size (50MB max for Supabase free tier)
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      setError(`File size must be less than 50MB. Your file is ${(file.size / (1024 * 1024)).toFixed(2)}MB`);
      return;
    }

    // Create preview URL
    const previewUrl = URL.createObjectURL(file);
    setVideoPreview(previewUrl);
    setSelectedFile(file);
    setError('');
  };

  // Add cleanup for preview URL
  const clearSelection = () => {
    if (videoPreview) {
      URL.revokeObjectURL(videoPreview);
    }
    setVideoPreview('');
    setSelectedFile(null);
  };

  // Update the JSX to show preview
  return (
    <div className="bg-white p-6 rounded-lg border border-gray-200">
      <h3 className="text-lg font-semibold mb-4">Upload Video</h3>
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {!selectedFile ? (
        // File selection UI (existing code)
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
          <input
            type="file"
            accept="video/mp4,video/webm,video/quicktime,video/x-msvideo"
            onChange={handleFileSelect}
            className="hidden"
            id="video-upload"
          />
          <label htmlFor="video-upload" className="cursor-pointer block">
            <div className="text-gray-400 mb-2">
              <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-gray-600 mb-1">Click to select video file</p>
            <p className="text-sm text-gray-500">MP4, WebM, MOV, AVI • Max 50MB</p>
          </label>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Video Preview */}
          <div className="bg-gray-100 rounded-lg p-4">
            <h4 className="font-medium mb-2">Video Preview:</h4>
            <video
              ref={videoRef}
              src={videoPreview}
              controls
              className="w-full max-h-64 rounded bg-black"
              onLoadedMetadata={() => {
                if (videoRef.current) {
                  console.log('Video duration:', videoRef.current.duration, 'seconds');
                }
              }}
            >
              Your browser does not support the video tag.
            </video>
          </div>

          {/* File Info */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-gray-900">{selectedFile.name}</p>
                <p className="text-sm text-gray-500">
                  {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • {selectedFile.type}
                </p>
              </div>
            </div>
            <button
              onClick={clearSelection}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Upload Progress */}
          {uploading && (
            <div className="space-y-2">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              <p className="text-sm text-gray-600 text-center">
                Uploading... {progress}%
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-3">
            <button
              onClick={handleUpload}
              disabled={uploading}
              className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? 'Uploading...' : 'Upload Video'}
            </button>
            <button
              onClick={() => {
                clearSelection();
                onCancel();
              }}
              disabled={uploading}
              className="px-4 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}