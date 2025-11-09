import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { coursesAPI } from '../services/api';
import { supabase } from '../services/supabaseClient';
import { formatCurrency, formatPrice } from '../utils/currency';


export default function CourseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [user, setUser] = useState(null);

  useEffect(() => {
    checkAuth();
    fetchCourse();
  }, [id]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    setUser(session?.user ?? null);
  };

  const fetchCourse = async () => {
    try {
      const data = await coursesAPI.getCourse(id);
      setCourse(data.course);
    } catch (error) {
      console.error('Error fetching course:', error);
      setError('Course not found or you dont have access to view it.');
    } finally {
      setLoading(false);
    }
  };

  const handleEnroll = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    // TODO: Implement enrollment logic
    alert('Enrollment functionality will be implemented soon!');
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-3/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
          <div className="h-64 bg-gray-200 rounded mb-6"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Course Not Found</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <Link to="/courses" className="btn-primary">
            Back to Courses
          </Link>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Course Not Found</h1>
          <Link to="/courses" className="btn-primary">
            Browse All Courses
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <nav className="flex mb-6" aria-label="Breadcrumb">
        <ol className="flex items-center space-x-2">
          <li>
            <Link to="/" className="text-gray-500 hover:text-gray-700">Home</Link>
          </li>
          <li>
            <span className="text-gray-400">/</span>
          </li>
          <li>
            <Link to="/courses" className="text-gray-500 hover:text-gray-700">Courses</Link>
          </li>
          <li>
            <span className="text-gray-400">/</span>
          </li>
          <li>
            <span className="text-gray-900 font-medium">{course.title}</span>
          </li>
        </ol>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">{course.title}</h1>
          
          <div className="flex items-center mb-6 space-x-4">
            <div className="flex items-center">
              <span className="text-yellow-500 text-lg">⭐</span>
              <span className="ml-1 text-gray-700">{course.rating || '4.5'}</span>
            </div>
            <span className="text-gray-500">•</span>
            <span className="text-gray-600">{course.level}</span>
            <span className="text-gray-500">•</span>
            <span className="text-gray-600">{course.duration_hours || 0} hours</span>
          </div>

          {course.thumbnail_url && (
            <div className="mb-6">
              <img 
                src={course.thumbnail_url} 
                alt={course.title}
                className="w-full h-64 object-cover rounded-lg"
              />
            </div>
          )}

          <div className="prose max-w-none mb-6">
            <p className="text-gray-700 text-lg">{course.description}</p>
          </div>

          {/* Instructor Info */}
          <div className="bg-gray-50 rounded-lg p-6 mb-6">
            <h3 className="text-xl font-semibold mb-4">About the Instructor</h3>
            <div className="flex items-center">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mr-4">
                <span className="text-blue-600 font-bold text-lg">
                  {course.profiles?.full_name?.charAt(0) || 'I'}
                </span>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900">
                  {course.profiles?.full_name || 'Instructor'}
                </h4>
                <p className="text-gray-600">Course Instructor</p>
              </div>
            </div>
          </div>

          {/* Lessons Section */}
          {course.lessons && course.lessons.length > 0 && (
            <div className="mb-6">
              <h3 className="text-xl font-semibold mb-4">Course Content</h3>
              <div className="space-y-3">
                {course.lessons
                  .sort((a, b) => a.order_index - b.order_index)
                  .map((lesson, index) => (
                    <div key={lesson.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mr-4 font-semibold">
                          {index + 1}
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900">{lesson.title}</h4>
                          <p className="text-sm text-gray-600">{lesson.duration_minutes} minutes</p>
                        </div>
                      </div>
                      {lesson.video_url && (
                        <span className="text-blue-600 text-sm font-medium">Preview</span>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6 sticky top-6">
         <div className="text-center mb-6">
    <div className="text-3xl font-bold text-gray-900 mb-2">
      {formatCurrency(course.price)}
    </div>
    {course.price > 0 && (
      <div className="text-sm text-gray-600 line-through">
        {formatPrice(course.price * 1.5)} {/* Show 50% higher as original price */}
      </div>
    )}
  </div>

            <button
              onClick={handleEnroll}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 transition-colors mb-4"
            >
              {user ? 'Enroll Now' : 'Sign Up to Enroll'}
            </button>

            <div className="text-center text-sm text-gray-600 mb-6">
              30-day money-back guarantee
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Level</span>
                <span className="font-medium capitalize">{course.level}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Duration</span>
                <span className="font-medium">{course.duration_hours || 0} hours</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Lessons</span>
                <span className="font-medium">{course.lessons?.length || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Access</span>
                <span className="font-medium">Lifetime</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}