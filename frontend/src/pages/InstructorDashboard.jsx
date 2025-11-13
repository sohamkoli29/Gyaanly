import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { coursesAPI } from '../services/api';
import { supabase } from '../services/supabaseClient';
import LessonManager from '../components/LessonManager';
import VideoPlayer from '../components/VideoPlayer';
import { formatCurrency } from '../utils/currency';

export default function InstructorDashboard() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [user, setUser] = useState(null);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    checkAuth();
    fetchCourses();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    setUser(session?.user ?? null);
  };

  const fetchCourses = async () => {
    try {
      const data = await coursesAPI.getMyCourses();
      
      const coursesWithLessons = await Promise.all(
        (data.courses || []).map(async (course) => {
          try {
            const courseDetail = await coursesAPI.getCourse(course.id);
            return {
              ...course,
              lessons: courseDetail.course?.lessons || []
            };
          } catch (error) {
            console.error(`Error fetching lessons for course ${course.id}:`, error);
            return { ...course, lessons: [] };
          }
        })
      );
      
      setCourses(coursesWithLessons);
    } catch (error) {
      console.error('Error fetching courses:', error);
      setError('Failed to load courses');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCourse = async (courseData) => {
    setLoading(true);
    setError('');

    try {
      const response = await coursesAPI.createCourse(courseData);
      setCourses(prev => [response.course, ...prev]);
      setShowCreateForm(false);
    } catch (error) {
      setError('Failed to create course: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateCourse = async (courseId, courseData) => {
    setLoading(true);
    setError('');

    try {
      const response = await coursesAPI.updateCourse(courseId, courseData);
      setCourses(prev => prev.map(course => 
        course.id === courseId ? response.course : course
      ));
      setEditingCourse(null);
    } catch (error) {
      setError('Failed to update course: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCourse = async (courseId) => {
    if (!confirm('Are you sure you want to delete this course? This action cannot be undone.')) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      await coursesAPI.deleteCourse(courseId);
      setCourses(prev => prev.filter(course => course.id !== courseId));
      if (selectedCourse?.id === courseId) {
        setSelectedCourse(null);
      }
    } catch (error) {
      setError('Failed to delete course: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCourseSelect = async (course) => {
    setSelectedCourse(null);
    setLoading(true);
    
    try {
      const courseDetail = await coursesAPI.getCourse(course.id);
      setSelectedCourse(courseDetail.course);
      setActiveTab('overview');
    } catch (error) {
      console.error('Error fetching course details:', error);
      setError('Failed to load course details');
    } finally {
      setLoading(false);
    }
  };

  if (loading && courses.length === 0) {
    return (
      <div className="min-h-screen pt-24 pb-12 relative">
        <div className="grid-bg fixed inset-0 opacity-20 pointer-events-none" />
        <div className="container-cyber relative z-10">
          <div className="animate-pulse space-y-6">
            <div className="h-12 skeleton rounded-lg w-1/3 mb-8" />
            <div className="grid lg:grid-cols-4 gap-8">
              <div className="lg:col-span-1 space-y-4">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="glass-card p-4 skeleton h-24 rounded-xl" />
                ))}
              </div>
              <div className="lg:col-span-3">
                <div className="glass-card p-6 skeleton h-96 rounded-2xl" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-12 relative">
      {/* Animated Background */}
      <div className="grid-bg fixed inset-0 opacity-20 pointer-events-none" />
      
      {/* Floating Elements */}
      <div className="absolute top-40 left-[5%] w-16 h-16 border-2 border-cyan-400/20 rounded-lg rotate-45 float" />
      <div className="absolute bottom-40 right-[10%] w-12 h-12 border-2 border-purple-400/20 rounded-full float" style={{ animationDelay: '2s' }} />

      <div className="container-cyber relative z-10">
        {/* Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-4">
          <div>
            <div className="inline-flex items-center gap-2 glass-card px-4 py-2 mb-4">
              <span className="notification-dot" />
              <span className="text-sm font-medium text-cyan-400">
                🎓 Instructor Command Center
              </span>
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold gradient-text">
              Course Dashboard
            </h1>
          </div>
          <button
            onClick={() => setShowCreateForm(true)}
            className="btn-cyber group"
          >
            <span>Create New Course</span>
            <span className="inline-block ml-2 text-xl transition-transform group-hover:scale-110">+</span>
          </button>
        </div>

        {error && (
          <div className="glass-card bg-red-400/10 border-red-400/30 text-red-400 px-4 py-3 rounded-xl mb-6 backdrop-blur-xl">
            <div className="flex items-center gap-2">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Create Course Form */}
        {showCreateForm && (
          <div className="glass-card p-8 mb-8 border-2 border-cyan-400/30">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold gradient-text">Create New Course</h2>
              <button
                onClick={() => setShowCreateForm(false)}
                className="text-cyan-400 hover:text-cyan-300 text-2xl transition-colors"
              >
                ×
              </button>
            </div>
            <CourseForm
              onSubmit={handleCreateCourse}
              onCancel={() => setShowCreateForm(false)}
              loading={loading}
            />
          </div>
        )}

        {/* Edit Course Form */}
        {editingCourse && (
          <div className="glass-card p-8 mb-8 border-2 border-cyan-400/30">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold gradient-text">Edit Course</h2>
              <button
                onClick={() => setEditingCourse(null)}
                className="text-cyan-400 hover:text-cyan-300 text-2xl transition-colors"
              >
                ×
              </button>
            </div>
            <CourseForm
              course={editingCourse}
              onSubmit={(data) => handleUpdateCourse(editingCourse.id, data)}
              onCancel={() => setEditingCourse(null)}
              loading={loading}
            />
          </div>
        )}

        <div className="grid lg:grid-cols-4 gap-8">
          {/* Courses List */}
          <div className="lg:col-span-1">
            <div className="glass-card p-6">
              <h2 className="text-xl font-bold gradient-text mb-6">Your Courses</h2>
              <div className="space-y-4">
                {courses.map(course => (
                  <div
                    key={course.id}
                    className={`
                      glass-card p-4 cursor-pointer transition-all duration-300 border-2
                      ${selectedCourse?.id === course.id 
                        ? 'border-cyan-400 bg-cyan-400/10 shadow-neon-md' 
                        : 'border-cyan-400/20 hover:border-cyan-400/50 hover:scale-[1.02]'
                      }
                      group
                    `}
                    onClick={() => handleCourseSelect(course)}
                  >
                    <h3 className="font-semibold text-white group-hover:text-cyan-400 transition-colors mb-2 line-clamp-2">
                      {course.title}
                    </h3>
                    <div className="flex justify-between text-sm text-gray-400 mb-3">
                      <span>{course.lessons_count || 0} lessons</span>
                      <span>{course.enrollments_count || 0} students</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className={`
                        text-xs font-medium px-2 py-1 rounded-full
                        ${course.is_published 
                          ? 'bg-green-400/20 text-green-400 border border-green-400/40' 
                          : 'bg-yellow-400/20 text-yellow-400 border border-yellow-400/40'
                        }
                      `}>
                        {course.is_published ? 'Published' : 'Draft'}
                      </span>
                      <div className="flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingCourse(course);
                          }}
                          className="text-cyan-400 hover:text-cyan-300 text-sm transition-colors"
                          title="Edit Course"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteCourse(course.id);
                          }}
                          className="text-red-400 hover:text-red-300 text-sm transition-colors"
                          title="Delete Course"
                        >
                          🗑️
                        </button>
                        <Link
                          to={`/courses/${course.id}/quiz-management`}
                          onClick={(e) => e.stopPropagation()}
                          className="text-purple-400 hover:text-purple-300 text-sm transition-colors"
                          title="Manage Quiz"
                        >
                          🎯
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}

                {courses.length === 0 && (
                  <div className="text-center py-8 text-gray-400">
                    <div className="text-4xl mb-2">🚀</div>
                    <p>No courses yet.</p>
                    <p className="text-sm">Create your first course to begin!</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Course Details & Management */}
          <div className="lg:col-span-3">
            {selectedCourse ? (
              <div className="glass-card p-6">
                {/* Course Header */}
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-4">
                  <div className="flex-1">
                    <h2 className="text-3xl font-bold gradient-text mb-3">
                      {selectedCourse.title}
                    </h2>
                    <p className="text-gray-300 text-lg mb-4 leading-relaxed">
                      {selectedCourse.description}
                    </p>
                    <div className="flex flex-wrap gap-4 text-sm">
                      <span className="badge-cyber">
                        💰 {formatCurrency(selectedCourse.price)}
                      </span>
                      <span className="badge-cyber">
                        🎯 {selectedCourse.level}
                      </span>
                      <span className={`
                        badge-cyber
                        ${selectedCourse.is_published 
                          ? 'bg-green-400/20 text-green-400 border-green-400/40' 
                          : 'bg-yellow-400/20 text-yellow-400 border-yellow-400/40'
                        }
                      `}>
                        {selectedCourse.is_published ? '🌐 Published' : '📝 Draft'}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setEditingCourse(selectedCourse)}
                    className="btn-ghost group"
                  >
                    <span>Edit Course</span>
                    <span className="inline-block ml-2 transition-transform group-hover:rotate-90">⚙️</span>
                  </button>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 mb-8 border-b border-cyan-400/20 pb-4">
                  {[
                    { key: 'overview', label: 'Overview', icon: '📊' },
                    { key: 'lessons', label: 'Lesson Manager', icon: '📚' },
                    { key: 'analytics', label: 'Analytics', icon: '📈' }
                  ].map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key)}
                      className={`
                        flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-300
                        ${activeTab === tab.key
                          ? 'bg-cyan-400/20 text-cyan-400 shadow-neon-sm'
                          : 'text-gray-400 hover:text-cyan-400 hover:bg-cyan-400/10'
                        }
                      `}
                    >
                      <span>{tab.icon}</span>
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Tab Content */}
                {activeTab === 'overview' && (
                  <div className="space-y-8">
                    {/* Video Preview Section */}
                    <div>
                      <h3 className="text-2xl font-bold gradient-text mb-6">Course Content Preview</h3>
                      {selectedCourse.lessons && selectedCourse.lessons.length > 0 ? (
                        <div className="space-y-6">
                          {selectedCourse.lessons
                            .filter(lesson => lesson.video_path)
                            .sort((a, b) => a.order_index - b.order_index)
                            .map((lesson, index) => (
                              <div key={lesson.id} className="glass-card border-2 border-cyan-400/20 p-6">
                                <h4 className="font-bold text-xl text-white mb-3">
                                  <span className="text-cyan-400">Lesson {index + 1}:</span> {lesson.title}
                                </h4>
                                {lesson.description && (
                                  <p className="text-gray-400 text-sm mb-4">{lesson.description}</p>
                                )}
                                <div className="rounded-xl overflow-hidden border-2 border-cyan-400/20 bg-black">
                                  <VideoPlayer
                                    lessonId={lesson.id}
                                    videoPath={lesson.video_path}
                                    lessons={selectedCourse.lessons}
                                    currentLessonIndex={selectedCourse.lessons.findIndex(l => l.id === lesson.id)}
                                    onLessonChange={(newIndex) => {
                                      const newLesson = selectedCourse.lessons[newIndex];
                                    }}
                                    className="w-full h-64"
                                  />
                                </div>
                                <div className="mt-4 flex flex-wrap gap-4 text-sm text-cyan-400">
                                  <span>⏱️ {lesson.duration_minutes || 0} minutes</span>
                                  <span>
                                    💾 {lesson.video_size ? (lesson.video_size / (1024 * 1024)).toFixed(1) + ' MB' : 'N/A'}
                                  </span>
                                  <span className="text-green-400 font-medium">
                                    ✅ Ready to stream
                                  </span>
                                </div>
                              </div>
                            ))}
                          
                          {selectedCourse.lessons.filter(lesson => lesson.video_path).length === 0 && (
                            <div className="text-center py-12 text-gray-400">
                              <div className="text-6xl mb-4">🎬</div>
                              <p className="text-xl mb-2">No videos uploaded yet</p>
                              <p>Use the lesson manager to add videos to your lessons</p>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-center py-12 text-gray-400">
                          <div className="text-6xl mb-4">📚</div>
                          <p className="text-xl mb-2">No lessons created yet</p>
                          <p>Use the lesson manager to build your course content</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {activeTab === 'lessons' && (
                  <div>
                    <h3 className="text-2xl font-bold gradient-text mb-6">Lesson Management</h3>
                    <LessonManager
                      courseId={selectedCourse.id}
                      lessons={selectedCourse.lessons || []}
                      onLessonsUpdate={(updatedLessons) => {
                        setSelectedCourse(prev => ({
                          ...prev,
                          lessons: updatedLessons
                        }));
                        setCourses(prev => prev.map(course =>
                          course.id === selectedCourse.id
                            ? { ...course, lessons: updatedLessons }
                            : course
                        ));
                      }}
                    />
                  </div>
                )}

                {activeTab === 'analytics' && (
                  <div className="text-center py-12 text-gray-400">
                    <div className="text-6xl mb-4">📈</div>
                    <p className="text-xl mb-2">Analytics Dashboard Coming Soon</p>
                    <p>Track student progress, engagement metrics, and course performance</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="glass-card p-12 text-center">
                <div className="text-6xl mb-4">🌌</div>
                <h3 className="text-2xl font-bold gradient-text mb-4">
                  Select a Course
                </h3>
                <p className="text-gray-400 text-lg">
                  Choose a course from your collection to manage its content and settings
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Course Form Component
function CourseForm({ course, onSubmit, onCancel, loading }) {
  const [formData, setFormData] = useState({
    title: course?.title || '',
    description: course?.description || '',
    price: course?.price || 0,
    level: course?.level || 'beginner',
    thumbnail_url: course?.thumbnail_url || '',
    is_published: course?.is_published || false
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <label className="block text-sm font-semibold text-cyan-400">
          COURSE TITLE *
        </label>
        <input
          type="text"
          name="title"
          value={formData.title}
          onChange={handleChange}
          required
          className="input-cyber"
          placeholder="Enter course title"
        />
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-semibold text-cyan-400">
          DESCRIPTION *
        </label>
        <textarea
          name="description"
          value={formData.description}
          onChange={handleChange}
          required
          rows={4}
          className="input-cyber resize-none"
          placeholder="Describe what students will learn in this course"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-cyan-400">
            PRICE (INR)
          </label>
          <input
            type="number"
            name="price"
            value={formData.price}
            onChange={handleChange}
            min="0"
            step="0.01"
            className="input-cyber"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-semibold text-cyan-400">
            LEVEL
          </label>
          <select
            name="level"
            value={formData.level}
            onChange={handleChange}
            className="input-cyber appearance-none cursor-pointer"
          >
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-semibold text-cyan-400">
          THUMBNAIL URL
        </label>
        <input
          type="url"
          name="thumbnail_url"
          value={formData.thumbnail_url}
          onChange={handleChange}
          className="input-cyber"
          placeholder="https://example.com/thumbnail.jpg"
        />
      </div>

      <div className="flex items-center space-x-3">
        <input
          type="checkbox"
          name="is_published"
          checked={formData.is_published}
          onChange={handleChange}
          className="w-4 h-4 text-cyan-400 bg-transparent border-cyan-400 rounded focus:ring-cyan-400 focus:ring-2"
        />
        <label className="text-sm text-gray-300">
          Publish course (make it available to students)
        </label>
      </div>

      <div className="flex space-x-4 pt-6 border-t border-cyan-400/20">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 btn-cyber"
        >
          {loading ? (
            <div className="flex items-center justify-center space-x-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Saving...</span>
            </div>
          ) : (
            course ? 'Update Course' : 'Create Course'
          )}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="btn-ghost px-8"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}