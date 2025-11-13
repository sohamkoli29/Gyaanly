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
    if (!confirm('Are you sure you want to delete this module? This action cannot be undone.')) return;

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
      setError('Failed to delete module: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedLessons.size === 0) return;
    if (!confirm(`Delete ${selectedLessons.size} selected module(s)?`)) return;

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
      setError('Failed to delete modules: ' + error.message);
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
      setError('Failed to update module order: ' + error.message);
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
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h3 className="text-3xl font-bold gradient-text">Course Modules</h3>
          <p className="text-cyan-400 text-sm mt-2">
            <span className="font-semibold">{lessons.length}</span> module{lessons.length !== 1 ? 's' : ''} • 
            <span className="font-semibold text-green-400 ml-2">{lessons.filter(l => l.video_path).length}</span> with content • 
            Total duration: <span className="font-semibold text-purple-400">{formatDuration(lessons.reduce((acc, l) => acc + (l.duration_minutes || 0), 0))}</span>
          </p>
        </div>
        <button
          onClick={() => setShowAddLesson(true)}
          className="btn-cyber group"
        >
          <span>+ Create Module</span>
          <span className="inline-block ml-2 text-xl transition-transform group-hover:scale-110">🚀</span>
        </button>
      </div>

      {error && (
        <div className="glass-card bg-red-400/10 border-red-400/30 text-red-400 px-4 py-3 rounded-xl backdrop-blur-xl">
          <div className="flex items-center gap-2">
            <span>⚠️</span>
            <span className="font-semibold">System Error:</span>
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Bulk Actions */}
      {selectedLessons.size > 0 && (
        <div className="glass-card border-2 border-cyan-400/30 p-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <span className="text-sm font-semibold text-cyan-400">
              {selectedLessons.size} module{selectedLessons.size !== 1 ? 's' : ''} selected
            </span>
            <button
              onClick={() => setSelectedLessons(new Set())}
              className="text-sm text-cyan-400 hover:text-cyan-300 font-semibold transition-colors"
            >
              Clear selection
            </button>
          </div>
          <button
            onClick={handleBulkDelete}
            className="btn-ghost bg-red-400/10 text-red-400 border-red-400/30 hover:bg-red-400/20 hover:border-red-400/50 group"
          >
            <span>Delete Selected</span>
            <span className="inline-block ml-2 transition-transform group-hover:scale-110">🗑️</span>
          </button>
        </div>
      )}

      {/* Add Module Form */}
      {showAddLesson && (
        <div className="glass-card border-2 border-cyan-400/30 p-6">
          <h4 className="text-xl font-bold gradient-text mb-6">Create New Module</h4>
          <LessonForm
            onSubmit={handleAddLesson}
            onCancel={() => setShowAddLesson(false)}
            loading={loading}
            nextOrderIndex={lessons.length}
          />
        </div>
      )}

      {/* Edit Module Form */}
      {editingLesson && (
        <div className="glass-card border-2 border-cyan-400/30 p-6">
          <h4 className="text-xl font-bold gradient-text mb-6">Edit Module</h4>
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
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xl flex items-center justify-center z-50 p-4">
          <div className="glass-card border-2 border-cyan-400/30 max-w-5xl w-full max-h-[90vh] overflow-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold gradient-text">
                  Preview: {previewingLesson.title}
                </h3>
                <button
                  onClick={() => setPreviewingLesson(null)}
                  className="text-cyan-400 hover:text-cyan-300 text-2xl transition-colors"
                >
                  ×
                </button>
              </div>
              <VideoPlayer
                lessonId={previewingLesson.id}
                videoPath={previewingLesson.video_path}
                className="w-full h-96"
              />
              <div className="mt-6 text-center">
                <button
                  onClick={() => setPreviewingLesson(null)}
                  className="btn-ghost"
                >
                  Close Preview
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modules List */}
      <div className="space-y-4">
        {/* Select All Checkbox */}
        {lessons.length > 0 && (
          <div className="glass-card border-2 border-cyan-400/20 p-4 flex items-center">
            <input
              type="checkbox"
              checked={selectedLessons.size === lessons.length && lessons.length > 0}
              onChange={selectAllLessons}
              className="w-5 h-5 text-cyan-400 bg-transparent border-cyan-400/40 rounded focus:ring-cyan-400 focus:ring-2"
            />
            <label className="ml-3 text-sm font-semibold text-cyan-400">
              Select all modules
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
            className={`
              glass-card border-2 p-6 rounded-xl transition-all duration-300 hover:scale-[1.02] hover:shadow-neon-md
              ${selectedLessons.has(lesson.id) 
                ? 'border-cyan-400 bg-cyan-400/10 shadow-neon-sm' 
                : 'border-cyan-400/20 hover:border-cyan-400/50'
              }
              ${draggedLesson?.id === lesson.id ? 'opacity-50' : 'opacity-100'}
            `}
          >
            <div className="flex items-start">
              {/* Checkbox */}
              <input
                type="checkbox"
                checked={selectedLessons.has(lesson.id)}
                onChange={() => toggleLessonSelection(lesson.id)}
                className="w-5 h-5 text-cyan-400 bg-transparent border-cyan-400/40 rounded focus:ring-cyan-400 focus:ring-2 mt-1 mr-4"
              />

              {/* Drag Handle */}
              <div className="cursor-move text-cyan-400/60 hover:text-cyan-400 mr-3 mt-1 transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                </svg>
              </div>

              {/* Module Number Badge */}
              <div className="w-12 h-12 bg-gradient-to-br from-cyan-400 to-purple-600 text-white rounded-xl flex items-center justify-center text-lg font-bold mr-4 flex-shrink-0 shadow-neon-sm">
                M{index + 1}
              </div>

              {/* Module Content */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-col lg:flex-row lg:items-start justify-between mb-4 gap-4">
                  <div className="flex-1">
                    <h4 className="text-xl font-bold text-white mb-2">{lesson.title}</h4>
                    {lesson.description && (
                      <p className="text-gray-400 text-sm mb-3 leading-relaxed">{lesson.description}</p>
                    )}
                    
                    {/* Module Stats */}
                    <div className="flex flex-wrap items-center gap-4 text-sm">
                      <div className="flex items-center text-cyan-400">
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {formatDuration(lesson.duration_minutes)}
                      </div>
                      {lesson.video_path && (
                        <>
                          <div className="flex items-center text-green-400 font-semibold">
                            <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                            Content Ready
                          </div>
                          {lesson.video_size && (
                            <div className="flex items-center text-purple-400">
                              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                  <div className="flex items-center gap-3 flex-wrap">
                    {lesson.video_path ? (
                      <button
                        onClick={() => setPreviewingLesson(lesson)}
                        className="btn-ghost bg-green-400/10 text-green-400 border-green-400/30 hover:bg-green-400/20 hover:border-green-400/50 group text-sm"
                      >
                        <span>Preview</span>
                        <span className="inline-block ml-2 transition-transform group-hover:scale-110">👁️</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => setUploadingLesson(lesson)}
                        className="btn-cyber group text-sm"
                      >
                        <span>Upload Content</span>
                        <span className="inline-block ml-2 transition-transform group-hover:scale-110">📤</span>
                      </button>
                    )}
                    <button
                      onClick={() => setEditingLesson(lesson)}
                      className="glass-card p-3 border border-cyan-400/30 text-cyan-400 hover:text-cyan-300 hover:border-cyan-400/50 transition-all rounded-lg"
                      title="Edit module"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDeleteLesson(lesson.id)}
                      className="glass-card p-3 border border-red-400/30 text-red-400 hover:text-red-300 hover:border-red-400/50 transition-all rounded-lg"
                      title="Delete module"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}

        {lessons.length === 0 && (
          <div className="glass-card border-2 border-dashed border-cyan-400/30 rounded-xl p-12 text-center">
            <div className="text-6xl mb-4">🌌</div>
            <h3 className="text-2xl font-bold gradient-text mb-2">No Modules Created</h3>
            <p className="text-gray-400 mb-6">Begin building your course by adding the first learning module</p>
            <button
              onClick={() => setShowAddLesson(true)}
              className="btn-cyber group"
            >
              <span>Launch First Module</span>
              <span className="inline-block ml-2 text-xl transition-transform group-hover:scale-110">🚀</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// Module Form Component
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
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <label className="block text-sm font-semibold text-cyan-400">
          MODULE TITLE *
        </label>
        <input
          type="text"
          name="title"
          value={formData.title}
          onChange={handleChange}
          required
          className="input-cyber"
          placeholder="e.g., Introduction to Advanced Concepts"
        />
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-semibold text-cyan-400">
          DESCRIPTION
        </label>
        <textarea
          name="description"
          value={formData.description}
          onChange={handleChange}
          rows={3}
          className="input-cyber resize-none"
          placeholder="Describe the learning objectives and content for this module..."
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-cyan-400">
            DURATION (MINUTES)
          </label>
          <input
            type="number"
            name="duration_minutes"
            value={formData.duration_minutes}
            onChange={handleChange}
            min="0"
            className="input-cyber"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-semibold text-cyan-400">
            SEQUENCE ORDER
          </label>
          <input
            type="number"
            name="order_index"
            value={formData.order_index}
            onChange={handleChange}
            min="0"
            className="input-cyber"
          />
        </div>
      </div>

      <div className="flex space-x-4 pt-6 border-t border-cyan-400/20">
        <button
          type="submit"
          disabled={loading}
          className="btn-neon flex-1 group disabled:opacity-50"
        >
          {loading ? (
            <div className="flex items-center justify-center space-x-2">
              <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
              <span>Saving...</span>
            </div>
          ) : (
            <>
              <span>{lesson ? 'Update Module' : 'Create Module'}</span>
              <span className="inline-block ml-2 text-xl transition-transform group-hover:scale-110">
                {lesson ? '🔄' : '🚀'}
              </span>
            </>
          )}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="btn-ghost px-8 disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}