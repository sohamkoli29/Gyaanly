import { useState, useRef } from 'react';
import VideoUploader from './VideoUploader';
import VideoPlayer from './VideoPlayer';
import { coursesAPI } from '../services/api';

export default function LessonManager({ courseId, lessons: initialLessons, onLessonsUpdate }) {
  const [lessons, setLessons] = useState(initialLessons || []);
  const [showAddLesson, setShowAddLesson] = useState(false);
  const [editingLesson, setEditingLesson] = useState(null);
  const [uploadingLesson, setUploadingLesson] = useState(null);
  const [previewingLesson, setPreviewingLesson] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [draggedLesson, setDraggedLesson] = useState(null);
  const [selectedLessons, setSelectedLessons] = useState(new Set());
  const [bulkAction, setBulkAction] = useState('');

  const handleAddLesson = async (lessonData) => {
    setLoading(true);
    setError('');

    try {
      const response = await coursesAPI.createLesson(courseId, lessonData);
      const newLesson = response.lesson;
      
      const updatedLessons = [...lessons, newLesson];
      setLessons(updatedLessons);
      setShowAddLesson(false);
      onLessonsUpdate?.(updatedLessons);
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
      
      const updatedLessons = lessons.map(lesson => 
        lesson.id === lessonId ? updatedLesson : lesson
      );
      setLessons(updatedLessons);
      setEditingLesson(null);
      onLessonsUpdate?.(updatedLessons);
    } catch (error) {
      setError('Failed to update lesson: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteLesson = async (lessonId) => {
    if (!confirm('Are you sure you want to delete this lesson? This action cannot be undone.')) return;

    setLoading(true);
    setError('');

    try {
      await coursesAPI.deleteLesson(lessonId);
      
      const updatedLessons = lessons.filter(lesson => lesson.id !== lessonId);
      setLessons(updatedLessons);
      selectedLessons.delete(lessonId);
      setSelectedLessons(new Set(selectedLessons));
      onLessonsUpdate?.(updatedLessons);
    } catch (error) {
      setError('Failed to delete lesson: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedLessons.size === 0) return;
    if (!confirm(`Delete ${selectedLessons.size} selected lesson(s)?`)) return;

    setLoading(true);
    setError('');

    try {
      await Promise.all(
        Array.from(selectedLessons).map(id => coursesAPI.deleteLesson(id))
      );
      
      const updatedLessons = lessons.filter(lesson => !selectedLessons.has(lesson.id));
      setLessons(updatedLessons);
      setSelectedLessons(new Set());
      onLessonsUpdate?.(updatedLessons);
    } catch (error) {
      setError('Failed to delete lessons: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadComplete = (lessonId, videoData) => {
    const updatedLessons = lessons.map(lesson => 
      lesson.id === lessonId ? { ...lesson, ...videoData } : lesson
    );
    setLessons(updatedLessons);
    setUploadingLesson(null);
    onLessonsUpdate?.(updatedLessons);
  };

  // Drag and drop for reordering
  const handleDragStart = (e, lesson) => {
    setDraggedLesson(lesson);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e, targetLesson) => {
    e.preventDefault();
    if (!draggedLesson || draggedLesson.id === targetLesson.id) return;

    const draggedIndex = lessons.findIndex(l => l.id === draggedLesson.id);
    const targetIndex = lessons.findIndex(l => l.id === targetLesson.id);

    // Reorder lessons
    const reorderedLessons = [...lessons];
    reorderedLessons.splice(draggedIndex, 1);
    reorderedLessons.splice(targetIndex, 0, draggedLesson);

    // Update order_index for all lessons
    const updatedLessons = reorderedLessons.map((lesson, index) => ({
      ...lesson,
      order_index: index
    }));

    setLessons(updatedLessons);
    setDraggedLesson(null);

    // Update order in backend
    try {
      await Promise.all(
        updatedLessons.map(lesson => 
          coursesAPI.updateLesson(lesson.id, { order_index: lesson.order_index })
        )
      );
      onLessonsUpdate?.(updatedLessons);
    } catch (error) {
      setError('Failed to update lesson order: ' + error.message);
      setLessons(lessons); // Revert on error
    }
  };

  const toggleLessonSelection = (lessonId) => {
    const newSelected = new Set(selectedLessons);
    if (newSelected.has(lessonId)) {
      newSelected.delete(lessonId);
    } else {
      newSelected.add(lessonId);
    }
    setSelectedLessons(newSelected);
  };

  const selectAllLessons = () => {
    if (selectedLessons.size === lessons.length) {
      setSelectedLessons(new Set());
    } else {
      setSelectedLessons(new Set(lessons.map(l => l.id)));
    }
  };

  const formatDuration = (minutes) => {
    if (!minutes) return '0 min';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const sortedLessons = [...lessons].sort((a, b) => a.order_index - b.order_index);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-2xl font-bold text-gray-900">Course Lessons</h3>
          <p className="text-sm text-gray-600 mt-1">
            {lessons.length} lesson{lessons.length !== 1 ? 's' : ''} • 
            {lessons.filter(l => l.video_path).length} with videos • 
            Total duration: {formatDuration(lessons.reduce((acc, l) => acc + (l.duration_minutes || 0), 0))}
          </p>
        </div>
        <button
          onClick={() => setShowAddLesson(true)}
          className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-indigo-700 shadow-md hover:shadow-lg transition-all flex items-center"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Lesson
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
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

      {/* Bulk Actions */}
      {selectedLessons.size > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <span className="text-sm font-medium text-blue-900">
              {selectedLessons.size} lesson{selectedLessons.size !== 1 ? 's' : ''} selected
            </span>
            <button
              onClick={() => setSelectedLessons(new Set())}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              Clear selection
            </button>
          </div>
          <button
            onClick={handleBulkDelete}
            className="bg-red-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-700 transition-colors flex items-center"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Delete Selected
          </button>
        </div>
      )}

      {/* Add Lesson Form */}
      {showAddLesson && (
        <div className="bg-white p-6 rounded-lg border-2 border-blue-200 shadow-lg">
          <h4 className="text-lg font-semibold mb-4 text-gray-900">Add New Lesson</h4>
          <LessonForm
            onSubmit={handleAddLesson}
            onCancel={() => setShowAddLesson(false)}
            loading={loading}
            nextOrderIndex={lessons.length}
          />
        </div>
      )}

      {/* Edit Lesson Form */}
      {editingLesson && (
        <div className="bg-white p-6 rounded-lg border-2 border-blue-200 shadow-lg">
          <h4 className="text-lg font-semibold mb-4 text-gray-900">Edit Lesson</h4>
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

      {/* Video Preview Modal */}
      {previewingLesson && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-5xl w-full max-h-[90vh] overflow-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold">
                  Preview: {previewingLesson.title}
                </h3>
                <button
                  onClick={() => setPreviewingLesson(null)}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ×
                </button>
              </div>
              <VideoPlayer
                lessonId={previewingLesson.id}
                videoPath={previewingLesson.video_path}
                className="w-full h-96"
              />
              <div className="mt-4 text-center">
                <button
                  onClick={() => setPreviewingLesson(null)}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
                >
                  Close Preview
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lessons List */}
      <div className="space-y-3">
        {/* Select All Checkbox */}
        {lessons.length > 0 && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 flex items-center">
            <input
              type="checkbox"
              checked={selectedLessons.size === lessons.length && lessons.length > 0}
              onChange={selectAllLessons}
              className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label className="ml-3 text-sm font-medium text-gray-700">
              Select all lessons
            </label>
          </div>
        )}

        {sortedLessons.map((lesson, index) => (
          <div 
            key={lesson.id}
            draggable
            onDragStart={(e) => handleDragStart(e, lesson)}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, lesson)}
            className={`bg-white border-2 rounded-lg p-6 transition-all hover:shadow-md ${
              selectedLessons.has(lesson.id) 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-gray-200'
            } ${
              draggedLesson?.id === lesson.id ? 'opacity-50' : 'opacity-100'
            }`}
          >
            <div className="flex items-start">
              {/* Checkbox */}
              <input
                type="checkbox"
                checked={selectedLessons.has(lesson.id)}
                onChange={() => toggleLessonSelection(lesson.id)}
                className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mt-1 mr-4"
              />

              {/* Drag Handle */}
              <div className="cursor-move text-gray-400 hover:text-gray-600 mr-3 mt-1">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                </svg>
              </div>

              {/* Lesson Number Badge */}
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-full flex items-center justify-center text-sm font-bold mr-4 flex-shrink-0">
                {index + 1}
              </div>

              {/* Lesson Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h4 className="text-lg font-semibold text-gray-900 mb-1">{lesson.title}</h4>
                    {lesson.description && (
                      <p className="text-gray-600 text-sm mb-2">{lesson.description}</p>
                    )}
                    
                    {/* Lesson Stats */}
                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                      <div className="flex items-center">
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {formatDuration(lesson.duration_minutes)}
                      </div>
                      {lesson.video_path && (
                        <>
                          <div className="flex items-center text-green-600 font-medium">
                            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                            Video uploaded
                          </div>
                          {lesson.video_size && (
                            <div className="flex items-center">
                              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                              </svg>
                              {(lesson.video_size / (1024 * 1024)).toFixed(1)} MB
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center space-x-2 ml-4">
                    {lesson.video_path ? (
                      <button
                        onClick={() => setPreviewingLesson(lesson)}
                        className="bg-green-100 text-green-700 px-4 py-2 rounded-lg font-medium hover:bg-green-200 transition-colors flex items-center"
                      >
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Preview
                      </button>
                    ) : (
                      <button
                        onClick={() => setUploadingLesson(lesson)}
                        className="bg-blue-100 text-blue-700 px-4 py-2 rounded-lg font-medium hover:bg-blue-200 transition-colors flex items-center"
                      >
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        Upload Video
                      </button>
                    )}
                    <button
                      onClick={() => setEditingLesson(lesson)}
                      className="text-gray-600 hover:text-blue-600 p-2 rounded-lg hover:bg-gray-100 transition-colors"
                      title="Edit lesson"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDeleteLesson(lesson.id)}
                      className="text-gray-600 hover:text-red-600 p-2 rounded-lg hover:bg-gray-100 transition-colors"
                      title="Delete lesson"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1-1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}

        {lessons.length === 0 && (
          <div className="text-center py-12 bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg">
            <div className="text-6xl mb-4">📚</div>
            <h3 className="text-xl font-semibold text-gray-600 mb-2">No lessons yet</h3>
            <p className="text-gray-500 mb-6">Get started by adding your first lesson</p>
            <button
              onClick={() => setShowAddLesson(true)}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 inline-flex items-center"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add First Lesson
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// Lesson Form Component
function LessonForm({ lesson, onSubmit, onCancel, loading, nextOrderIndex = 0 }) {
  const [formData, setFormData] = useState({
    title: lesson?.title || '',
    description: lesson?.description || '',
    duration_minutes: lesson?.duration_minutes || 0,
    order_index: lesson?.order_index ?? nextOrderIndex
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
          className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="e.g., Introduction to React Hooks"
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
          className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Describe what students will learn in this lesson..."
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
            className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Order
          </label>
          <input
            type="number"
            name="order_index"
            value={formData.order_index}
            onChange={handleChange}
            min="0"
            className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      <div className="flex space-x-3 pt-4">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 px-4 rounded-lg font-semibold hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 transition-all shadow-md hover:shadow-lg"
        >
          {loading ? 'Saving...' : (lesson ? 'Update Lesson' : 'Create Lesson')}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="px-6 py-3 border-2 border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-400 disabled:opacity-50 transition-all"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}