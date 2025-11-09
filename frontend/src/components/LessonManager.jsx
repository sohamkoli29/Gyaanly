import { useState } from 'react';
import VideoUploader from './VideoUploader';
import { coursesAPI } from '../services/api';

export default function LessonManager({ courseId, lessons: initialLessons, onLessonsUpdate }) {
  const [lessons, setLessons] = useState(initialLessons || []);
  const [showAddLesson, setShowAddLesson] = useState(false);
  const [editingLesson, setEditingLesson] = useState(null);
  const [uploadingLesson, setUploadingLesson] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAddLesson = async (lessonData) => {
    setLoading(true);
    setError('');

    try {
      const response = await coursesAPI.createLesson(courseId, lessonData);
      const newLesson = response.lesson;
      
      setLessons(prev => [...prev, newLesson]);
      setShowAddLesson(false);
      onLessonsUpdate?.([...lessons, newLesson]);
    } catch (error) {
      setError('Failed to create lesson: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateLesson = async (lessonId, lessonData) => {
    setLoading(true);
    setError('');

    try {
      const response = await coursesAPI.updateLesson(lessonId, lessonData);
      const updatedLesson = response.lesson;
      
      setLessons(prev => prev.map(lesson => 
        lesson.id === lessonId ? updatedLesson : lesson
      ));
      setEditingLesson(null);
      onLessonsUpdate?.(lessons.map(lesson => 
        lesson.id === lessonId ? updatedLesson : lesson
      ));
    } catch (error) {
      setError('Failed to update lesson: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteLesson = async (lessonId) => {
    if (!confirm('Are you sure you want to delete this lesson?')) return;

    setLoading(true);
    setError('');

    try {
      await coursesAPI.deleteLesson(lessonId);
      
      setLessons(prev => prev.filter(lesson => lesson.id !== lessonId));
      onLessonsUpdate?.(lessons.filter(lesson => lesson.id !== lessonId));
    } catch (error) {
      setError('Failed to delete lesson: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadComplete = (lessonId, videoData) => {
    setLessons(prev => prev.map(lesson => 
      lesson.id === lessonId ? { ...lesson, ...videoData } : lesson
    ));
    setUploadingLesson(null);
    onLessonsUpdate?.(lessons.map(lesson => 
      lesson.id === lessonId ? { ...lesson, ...videoData } : lesson
    ));
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-semibold">Course Lessons</h3>
        <button
          onClick={() => setShowAddLesson(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700"
        >
          Add Lesson
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Add Lesson Form */}
      {showAddLesson && (
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h4 className="text-lg font-semibold mb-4">Add New Lesson</h4>
          <LessonForm
            onSubmit={handleAddLesson}
            onCancel={() => setShowAddLesson(false)}
            loading={loading}
          />
        </div>
      )}

      {/* Edit Lesson Form */}
      {editingLesson && (
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h4 className="text-lg font-semibold mb-4">Edit Lesson</h4>
          <LessonForm
            lesson={editingLesson}
            onSubmit={(data) => handleUpdateLesson(editingLesson.id, data)}
            onCancel={() => setEditingLesson(null)}
            loading={loading}
          />
        </div>
      )}

      {/* Video Uploader */}
      {uploadingLesson && (
        <VideoUploader
          lessonId={uploadingLesson.id}
          courseId={courseId}
          onUploadComplete={(videoData) => handleUploadComplete(uploadingLesson.id, videoData)}
          onCancel={() => setUploadingLesson(null)}
        />
      )}

      {/* Lessons List */}
      <div className="space-y-4">
        {lessons
          .sort((a, b) => a.order_index - b.order_index)
          .map((lesson, index) => (
            <div key={lesson.id} className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <span className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
                      {index + 1}
                    </span>
                    <h4 className="text-lg font-semibold">{lesson.title}</h4>
                  </div>
                  
                  {lesson.description && (
                    <p className="text-gray-600 mb-3">{lesson.description}</p>
                  )}

                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    <span>Duration: {lesson.duration_minutes} minutes</span>
                    {lesson.video_path && (
                      <span className="flex items-center">
                        <svg className="w-4 h-4 mr-1 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Video uploaded
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {!lesson.video_path && (
                    <button
                      onClick={() => setUploadingLesson(lesson)}
                      className="text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Upload Video
                    </button>
                  )}
                  <button
                    onClick={() => setEditingLesson(lesson)}
                    className="text-gray-600 hover:text-gray-700"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteLesson(lesson.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    Delete
                  </button>
                </div>
              </div>

              {lesson.video_path && (
                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded">
                  <p className="text-green-700 text-sm">
                    ✅ Video ready: {(lesson.video_size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                </div>
              )}
            </div>
          ))}

        {lessons.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No lessons added yet. Add your first lesson to get started.
          </div>
        )}
      </div>
    </div>
  );
}

// Lesson Form Component
function LessonForm({ lesson, onSubmit, onCancel, loading }) {
  const [formData, setFormData] = useState({
    title: lesson?.title || '',
    description: lesson?.description || '',
    duration_minutes: lesson?.duration_minutes || 0,
    order_index: lesson?.order_index || 0
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Lesson Title *
        </label>
        <input
          type="text"
          name="title"
          value={formData.title}
          onChange={handleChange}
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Enter lesson title"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Description
        </label>
        <textarea
          name="description"
          value={formData.description}
          onChange={handleChange}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Describe what students will learn in this lesson"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Duration (minutes)
          </label>
          <input
            type="number"
            name="duration_minutes"
            value={formData.duration_minutes}
            onChange={handleChange}
            min="0"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Order Index
          </label>
          <input
            type="number"
            name="order_index"
            value={formData.order_index}
            onChange={handleChange}
            min="0"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="flex space-x-3 pt-4">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Saving...' : (lesson ? 'Update Lesson' : 'Create Lesson')}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="px-4 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}