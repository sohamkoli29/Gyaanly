import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { coursesAPI, quizAPI } from '../services/api';
import { supabase } from '../services/supabaseClient';
import QuizManagerModal from '../components/QuizManagerModal';

export default function QuizManagement() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [quiz, setQuiz] = useState(null);
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [quizLoading, setQuizLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [user, setUser] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    checkAuth();
    fetchData();
  }, [courseId]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    setUser(session?.user ?? null);
  };

  const fetchData = async () => {
    try {
      setError('');
      // Fetch course details
      const courseData = await coursesAPI.getCourse(courseId);
      setCourse(courseData.course);

      // Fetch quiz if exists
      await fetchQuiz();
      
      // Fetch quiz attempts
      await fetchQuizAttempts();
      
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to load course data: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

const fetchQuiz = async () => {
  try {
    setQuizLoading(true);
    const response = await quizAPI.getQuizByCourse(courseId);
    
    console.log('Quiz fetch response:', response);
    
    // Check if we got a quiz in the response
    if (response && response.quiz) {
      setQuiz(response.quiz);
    } else {
      setQuiz(null);
    }
  } catch (error) {
    console.error('Error fetching quiz:', error);
    
    // Handle "no quiz found" as a normal state, not an error
    if (error.message === 'NO_QUIZ_FOUND') {
      console.log('No quiz found for course - this is normal');
      setQuiz(null);
    } else {
      setError('Failed to load quiz: ' + error.message);
    }
  } finally {
    setQuizLoading(false);
  }
};

  const fetchQuizAttempts = async () => {
  try {
    console.log('🔍 Fetching quiz attempts for course:', courseId);
    const attemptsData = await quizAPI.getQuizAttempts(courseId);
    
    console.log('📊 Quiz attempts response:', attemptsData);
    console.log('📋 Attempts array:', attemptsData.attempts);
    console.log('🔢 Number of attempts:', attemptsData.attempts?.length || 0);
    
    setAttempts(attemptsData.attempts || []);
  } catch (error) {
    console.log('❌ Error fetching quiz attempts:', error);
    console.log('📝 Error details:', {
      message: error.message,
      courseId: courseId
    });
    setAttempts([]);
  }
};

  const handleQuizCreated = () => {
    console.log('Quiz created, refreshing data...');
    fetchQuiz().catch(error => {
        console.error('Error refreshing quiz after creation:', error);
        setError('Quiz created but failed to refresh: ' + error.message);
    });
    fetchQuizAttempts();
};

  const isInstructor = user?.id === course?.instructor_id;

  // Redirect if not instructor
  useEffect(() => {
    if (course && user && !isInstructor) {
      navigate('/courses');
    }
  }, [course, user, isInstructor, navigate]);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error && !course) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error Loading Course</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <Link to="/instructor/dashboard" className="btn-primary">
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Course Not Found</h1>
          <Link to="/instructor/dashboard" className="btn-primary">
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (!isInstructor) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h1>
          <p className="text-gray-600 mb-6">You must be the course instructor to manage quizzes.</p>
          <Link to="/courses" className="btn-primary">
            Browse Courses
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <nav className="flex mb-6" aria-label="Breadcrumb">
        <ol className="flex items-center space-x-2">
          <li>
            <Link to="/instructor/dashboard" className="text-gray-500 hover:text-gray-700">
              Dashboard
            </Link>
          </li>
          <li>
            <span className="text-gray-400">/</span>
          </li>
          <li>
            <Link to={`/courses/${courseId}`} className="text-gray-500 hover:text-gray-700">
              {course.title}
            </Link>
          </li>
          <li>
            <span className="text-gray-400">/</span>
          </li>
          <li>
            <span className="text-gray-900 font-medium">Quiz Management</span>
          </li>
        </ol>
      </nav>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Quiz Management</h1>
          <p className="text-gray-600 mt-2">{course.title}</p>
        </div>
  <button
    onClick={() => {
        console.log('Create quiz button clicked');
        setShowCreateModal(true);
    }}
    className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
>
    {quiz ? 'Edit Quiz' : 'Create Quiz'}
</button>
      </div>

      {/* Quiz Status Card */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Quiz Status</h2>
        
        {quizLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading quiz data...</p>
          </div>
        ) : quiz ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-1">Quiz Details</h3>
                <p className="text-2xl font-bold text-blue-600">{quiz.title}</p>
                <p className="text-sm text-blue-700 mt-1">{quiz.quiz_questions?.length || 0} questions</p>
              </div>
              
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="font-semibold text-green-900 mb-1">Passing Score</h3>
                <p className="text-2xl font-bold text-green-600">{quiz.passing_score}%</p>
                <p className="text-sm text-green-700 mt-1">{quiz.time_limit_minutes || 'No'} time limit</p>
              </div>
              
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <h3 className="font-semibold text-purple-900 mb-1">Student Attempts</h3>
                <p className="text-2xl font-bold text-purple-600">{attempts.length}</p>
                <p className="text-sm text-purple-700 mt-1">Total attempts</p>
              </div>
            </div>

            {quiz.description && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-2">Description</h3>
                <p className="text-gray-700">{quiz.description}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="text-4xl mb-4">📝</div>
            <h3 className="text-lg font-semibold mb-2">No Quiz Created</h3>
            <p className="text-gray-600 mb-4">Create a quiz to assess your students' learning.</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700"
            >
              Create Your First Quiz
            </button>
          </div>
        )}
      </div>

   {/* Quiz Attempts - Only show if quiz exists */}
{quiz && !quizLoading && (
  <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
    <h2 className="text-xl font-semibold mb-4">Student Attempts</h2>
    
    {attempts.length > 0 ? (
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 font-semibold text-gray-900">Student</th>
              <th className="text-left py-3 font-semibold text-gray-900">Score</th>
              <th className="text-left py-3 font-semibold text-gray-900">Status</th>
              <th className="text-left py-3 font-semibold text-gray-900">Time Spent</th>
              <th className="text-left py-3 font-semibold text-gray-900">Date</th>
            </tr>
          </thead>
          <tbody>
            {attempts.map((attempt) => (
              <tr key={attempt.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-3 text-gray-700">
                  {attempt.profiles?.full_name || `Student #${attempt.user_id?.substring(0, 8) || 'unknown'}`}
                </td>
                <td className="py-3">
                  <span className={`font-semibold ${
                    attempt.passed ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {attempt.score}%
                  </span>
                </td>
                <td className="py-3">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    attempt.passed 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {attempt.passed ? 'Passed' : 'Failed'}
                  </span>
                </td>
                <td className="py-3 text-gray-700">
                  {attempt.time_spent_seconds ? (
                    <>
                      {Math.floor(attempt.time_spent_seconds / 60)}:
                      {(attempt.time_spent_seconds % 60).toString().padStart(2, '0')}
                    </>
                  ) : (
                    'N/A'
                  )}
                </td>
                <td className="py-3 text-gray-700">
                  {attempt.created_at ? new Date(attempt.created_at).toLocaleDateString() : 'Unknown'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    ) : (
      <div className="text-center py-8 text-gray-500">
        <div className="text-2xl mb-2">👥</div>
        <p>No student attempts yet.</p>
        <p className="text-sm">Students will appear here once they take the quiz.</p>
        
        {/* Debug info */}
        <div className="mt-4 p-3 bg-gray-100 rounded text-xs">
          <p>Course ID: {courseId}</p>
          <p>Quiz ID: {quiz?.id}</p>
          <p>Attempts array length: {attempts.length}</p>
        </div>
      </div>
    )}
  </div>
)}

      {/* Quiz Manager Modal */}
      <QuizManagerModal
        courseId={courseId}
        courseTitle={course.title}
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onQuizCreated={handleQuizCreated}
        existingQuiz={quiz}
      />
    </div>
  );
}