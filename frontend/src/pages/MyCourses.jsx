import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { enrollmentsAPI } from '../services/api';
import { supabase } from '../services/supabaseClient';
import { formatCurrency } from '../utils/currency';

export default function MyCourses() {
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    setUser(session?.user ?? null);
    if (session?.user) {
      fetchEnrollments();
    }
  };

  const fetchEnrollments = async () => {
    try {
      const data = await enrollmentsAPI.getMyEnrollments();
      setEnrollments(data.enrollments || []);
    } catch (error) {
      console.error('Error fetching enrollments:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">My Courses</h1>
          <p className="text-gray-600 mb-6">Please log in to view your courses.</p>
          <Link to="/login" className="btn-primary">
            Login
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">My Courses</h1>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="bg-white rounded-lg shadow-md overflow-hidden animate-pulse">
              <div className="h-48 bg-gray-200"></div>
              <div className="p-6">
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-3 bg-gray-200 rounded mb-4"></div>
                <div className="h-10 bg-gray-200 rounded"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">My Courses</h1>
      
      {enrollments.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📚</div>
          <h2 className="text-2xl font-bold text-gray-600 mb-4">No courses yet</h2>
          <p className="text-gray-500 mb-6">Enroll in your first course to start learning!</p>
          <Link to="/courses" className="btn-primary">
            Browse Courses
          </Link>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {enrollments.map((enrollment) => (
            <div key={enrollment.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
              <div className="h-48 bg-gray-200">
                {enrollment.courses.thumbnail_url && (
                  <img 
                    src={enrollment.courses.thumbnail_url} 
                    alt={enrollment.courses.title}
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
              <div className="p-6">
                <h3 className="text-xl font-semibold mb-2">{enrollment.courses.title}</h3>
                <p className="text-gray-600 mb-4 line-clamp-2">{enrollment.courses.description}</p>
                
                <div className="flex justify-between items-center text-sm text-gray-500 mb-4">
                  <span>By {enrollment.courses.profiles?.full_name || 'Instructor'}</span>
                  <span className="capitalize">{enrollment.courses.level}</span>
                </div>

                <div className="flex justify-between items-center mb-4">
                  <span className="text-sm text-gray-600">
                    Enrolled: {new Date(enrollment.enrolled_at).toLocaleDateString()}
                  </span>
                  {enrollment.completed_at && (
                    <span className="text-green-600 text-sm font-medium">✅ Completed</span>
                  )}
                </div>

                <Link 
                  to={`/courses/${enrollment.courses.id}`}
                  className="block w-full bg-blue-600 text-white text-center py-2 rounded hover:bg-blue-700 transition-colors"
                >
                  {enrollment.completed_at ? 'Review Course' : 'Continue Learning'}
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}