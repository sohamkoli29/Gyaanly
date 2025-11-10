import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { coursesAPI } from '../services/api';
import { supabase } from '../services/supabaseClient';
import LessonManager from '../components/LessonManager';
import VideoPlayer from '../components/VideoPlayer';
import { formatCurrency } from '../utils/currency';
import VideoDebugger from '../components/VideoDebugger';


export default function InstructorDashboard() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [user, setUser] = useState(null);
  const [error, setError] = useState('');

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
      setCourses(data.courses || []);
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

  if (loading && courses.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-8"></div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="bg-white rounded-lg shadow-md p-6">
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-3 bg-gray-200 rounded mb-4"></div>
                <div className="h-10 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Instructor Dashboard</h1>
        <button
          onClick={() => setShowCreateForm(true)}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700"
        >
          Create New Course
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      {/* Create Course Form */}
      {showCreateForm && (
        <div className="bg-white p-6 rounded-lg shadow-lg border border-gray-200 mb-8">
          <h2 className="text-2xl font-bold mb-6">Create New Course</h2>
          <CourseForm
            onSubmit={handleCreateCourse}
            onCancel={() => setShowCreateForm(false)}
            loading={loading}
          />
        </div>
      )}

      {/* Edit Course Form */}
      {editingCourse && (
        <div className="bg-white p-6 rounded-lg shadow-lg border border-gray-200 mb-8">
          <h2 className="text-2xl font-bold mb-6">Edit Course</h2>
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
          <h2 className="text-xl font-semibold mb-4">Your Courses</h2>
          <div className="space-y-4">
            {courses.map(course => (
              <div
                key={course.id}
                className={`bg-white border rounded-lg p-4 cursor-pointer transition-all ${
                  selectedCourse?.id === course.id 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setSelectedCourse(course)}
              >
                <h3 className="font-semibold text-gray-900 mb-2">{course.title}</h3>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>{course.lessons_count || 0} lessons</span>
                  <span>{course.enrollments_count || 0} students</span>
                </div>
                <div className="flex justify-between items-center mt-3">
                  <span className={`text-sm font-medium ${
                    course.is_published ? 'text-green-600' : 'text-yellow-600'
                  }`}>
                    {course.is_published ? 'Published' : 'Draft'}
                  </span>
                  <div className="flex space-x-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingCourse(course);
                      }}
                      className="text-blue-600 hover:text-blue-700 text-sm"
                    >
                      Edit
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteCourse(course.id);
                      }}
                      className="text-red-600 hover:text-red-700 text-sm"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {courses.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No courses yet. Create your first course to get started.
              </div>
            )}
          </div>
        </div>

        {/* Course Details & Lesson Management */}
        <div className="lg:col-span-3">
          {selectedCourse ? (
            <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-bold mb-2">{selectedCourse.title}</h2>
                  <p className="text-gray-600 mb-4">{selectedCourse.description}</p>
                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    <span>Price: {formatCurrency(selectedCourse.price)}</span>
                    <span>Level: {selectedCourse.level}</span>
                    <span className={`font-medium ${
                      selectedCourse.is_published ? 'text-green-600' : 'text-yellow-600'
                    }`}>
                      {selectedCourse.is_published ? 'Published' : 'Draft'}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setEditingCourse(selectedCourse)}
                  className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-200"
                >
                  Edit Course
                </button>
              </div>

              {/* VIDEO PREVIEW SECTION - FIXED */}
              <div className="mb-8 bg-gray-50 rounded-lg p-6">
                <h3 className="text-xl font-semibold mb-4">Course Video Preview</h3>
                {selectedCourse.lessons && selectedCourse.lessons.length > 0 ? (
                  <div className="space-y-4">
                    {selectedCourse.lessons
                      .filter(lesson => lesson.video_path) // Only show lessons with videos
                      .sort((a, b) => a.order_index - b.order_index)
                      .map((lesson, index) => (
                        <div key={lesson.id} className="bg-white rounded-lg border border-gray-200 p-4">
                          <h4 className="font-semibold text-lg mb-2">
                            Lesson {index + 1}: {lesson.title}
                          </h4>
                          {lesson.description && (
                            <p className="text-gray-600 text-sm mb-3">{lesson.description}</p>
                          )}
                          <div className="bg-black rounded-lg overflow-hidden">
                            {/* FIXED: Passing lessonId and videoPath correctly */}
                            <VideoPlayer
                              lessonId={lesson.id}
                              videoPath={lesson.video_path}
                              className="w-full h-64"
                            />
                          </div>
                          <div className="mt-3 flex items-center justify-between text-sm text-gray-600">
                            <div className="flex items-center space-x-4">
                              <span>Duration: {lesson.duration_minutes || 0} minutes</span>
                              <span>
                                File Size: {lesson.video_size ? (lesson.video_size / (1024 * 1024)).toFixed(1) + ' MB' : 'N/A'}
                              </span>
                              <span className="text-green-600 font-medium">
                                ✅ Ready to stream
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    
                    {selectedCourse.lessons.filter(lesson => lesson.video_path).length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        <div className="text-4xl mb-2">🎬</div>
                        <p>No videos uploaded yet for this course.</p>
                        <p className="text-sm">Use the lesson manager below to add videos to your lessons.</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <div className="text-4xl mb-2">📚</div>
                    <p>No lessons created yet for this course.</p>
                    <p className="text-sm">Use the lesson manager below to add lessons.</p>
                  </div>
                )}
              </div>



                  {selectedCourse && (
  <VideoDebugger 
    courseId={selectedCourse.id}
    lessons={selectedCourse.lessons || []}
  />
  )}
              {/* LESSON MANAGER */}
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
          ) : (
            <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-12 text-center">
              <div className="text-6xl mb-4">📚</div>
              <h3 className="text-xl font-semibold text-gray-600 mb-2">
                Select a Course
              </h3>
              <p className="text-gray-500">
                Choose a course from the list to manage its lessons and content.
              </p>
            </div>
          )}
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
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Course Title *
        </label>
        <input
          type="text"
          name="title"
          value={formData.title}
          onChange={handleChange}
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Enter course title"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Description *
        </label>
        <textarea
          name="description"
          value={formData.description}
          onChange={handleChange}
          required
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Describe what students will learn in this course"
        />
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Price (INR)
          </label>
          <input
            type="number"
            name="price"
            value={formData.price}
            onChange={handleChange}
            min="0"
            step="0.01"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Level
          </label>
          <select
            name="level"
            value={formData.level}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Thumbnail URL
        </label>
        <input
          type="url"
          name="thumbnail_url"
          value={formData.thumbnail_url}
          onChange={handleChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="https://example.com/thumbnail.jpg"
        />
      </div>

      <div className="flex items-center">
        <input
          type="checkbox"
          name="is_published"
          checked={formData.is_published}
          onChange={handleChange}
          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
        />
        <label className="ml-2 text-sm text-gray-700">
          Publish course (make it available to students)
        </label>
      </div>

      <div className="flex space-x-3 pt-4">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Saving...' : (course ? 'Update Course' : 'Create Course')}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="px-6 py-3 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}