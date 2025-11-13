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
      
      if (response && response.quiz) {
        setQuiz(response.quiz);
      } else {
        setQuiz(null);
      }
    } catch (error) {
      console.error('Error fetching quiz:', error);
      
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
      <div className="min-h-screen pt-24 pb-12 relative">
        <div className="grid-bg fixed inset-0 opacity-20 pointer-events-none" />
        <div className="container-cyber relative z-10">
          <div className="animate-pulse space-y-6">
            <div className="h-8 skeleton rounded-lg w-1/3 mb-4" />
            <div className="h-4 skeleton rounded w-1/2 mb-8" />
            <div className="h-64 skeleton rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  if (error && !course) {
    return (
      <div className="min-h-screen pt-24 pb-12 relative">
        <div className="grid-bg fixed inset-0 opacity-20 pointer-events-none" />
        <div className="container-cyber relative z-10 text-center">
          <div className="glass-card max-w-md mx-auto p-8">
            <div className="text-6xl mb-4">⚠️</div>
            <h1 className="text-2xl font-bold gradient-text mb-4">System Error</h1>
            <p className="text-gray-400 mb-6">{error}</p>
            <Link to="/instructor/dashboard" className="btn-cyber">
              Return to Command Center
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen pt-24 pb-12 relative">
        <div className="grid-bg fixed inset-0 opacity-20 pointer-events-none" />
        <div className="container-cyber relative z-10 text-center">
          <div className="glass-card max-w-md mx-auto p-8">
            <div className="text-6xl mb-4">🔍</div>
            <h1 className="text-2xl font-bold gradient-text mb-4">Course Not Found</h1>
            <Link to="/instructor/dashboard" className="btn-cyber">
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!isInstructor) {
    return (
      <div className="min-h-screen pt-24 pb-12 relative">
        <div className="grid-bg fixed inset-0 opacity-20 pointer-events-none" />
        <div className="container-cyber relative z-10 text-center">
          <div className="glass-card max-w-md mx-auto p-8">
            <div className="text-6xl mb-4">🚫</div>
            <h1 className="text-2xl font-bold gradient-text mb-4">Access Restricted</h1>
            <p className="text-gray-400 mb-6">Instructor authorization required for assessment management.</p>
            <Link to="/courses" className="btn-cyber">
              Explore Courses
            </Link>
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
        {/* Breadcrumb */}
        <nav className="flex mb-8" aria-label="Breadcrumb">
          <ol className="flex items-center space-x-3 text-sm">
            <li>
              <Link to="/instructor/dashboard" className="text-cyan-400 hover:text-cyan-300 transition-colors">
                Command Center
              </Link>
            </li>
            <li className="text-gray-500">/</li>
            <li>
              <Link to={`/courses/${courseId}`} className="text-cyan-400 hover:text-cyan-300 transition-colors">
                {course.title}
              </Link>
            </li>
            <li className="text-gray-500">/</li>
            <li>
              <span className="text-gray-300 font-semibold">Assessment Control</span>
            </li>
          </ol>
        </nav>

        {/* Error Display */}
        {error && (
          <div className="glass-card bg-red-400/10 border-red-400/30 text-red-400 px-4 py-3 rounded-xl mb-6 backdrop-blur-xl">
            <div className="flex items-center gap-2">
              <span>⚠️</span>
              <span className="font-semibold">System Alert:</span>
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-4">
          <div>
            <h1 className="text-4xl sm:text-5xl font-bold gradient-text">Assessment Control Panel</h1>
            <p className="text-cyan-400 text-lg mt-2">{course.title}</p>
          </div>
          <button
            onClick={() => {
                console.log('Create quiz button clicked');
                setShowCreateModal(true);
            }}
            className="btn-cyber group"
          >
            <span>{quiz ? 'Configure Assessment' : 'Launch Assessment'}</span>
            <span className="inline-block ml-2 text-xl transition-transform group-hover:scale-110">
              {quiz ? '⚙️' : '🚀'}
            </span>
          </button>
        </div>

        {/* Assessment Status Card */}
        <div className="glass-card border-2 border-cyan-400/30 p-6 mb-8">
          <h2 className="text-2xl font-bold gradient-text mb-6 flex items-center gap-2">
            <span>📊</span>
            Assessment Status
          </h2>
          
          {quizLoading ? (
            <div className="text-center py-8">
              <div className="relative mb-4">
                <div className="w-16 h-16 border-4 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin mx-auto"></div>
                <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-t-purple-400 rounded-full animate-spin mx-auto" style={{ animationDelay: '0.5s' }}></div>
              </div>
              <p className="text-cyan-400 font-semibold">Loading Assessment Data...</p>
            </div>
          ) : quiz ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="glass-card border-2 border-cyan-400/20 p-6 text-center">
                  <h3 className="font-semibold text-cyan-400 mb-3">Assessment Details</h3>
                  <p className="text-2xl font-bold text-white mb-2">{quiz.title}</p>
                  <p className="text-cyan-400 text-sm">
                    <span className="font-semibold">{quiz.quiz_questions?.length || 0}</span> modules
                  </p>
                </div>
                
                <div className="glass-card border-2 border-green-400/20 p-6 text-center">
                  <h3 className="font-semibold text-green-400 mb-3">Passing Threshold</h3>
                  <p className="text-2xl font-bold text-white mb-2">{quiz.passing_score}%</p>
                  <p className="text-green-400 text-sm">
                    {quiz.time_limit_minutes ? `${quiz.time_limit_minutes} min limit` : 'Unlimited time'}
                  </p>
                </div>
                
                <div className="glass-card border-2 border-purple-400/20 p-6 text-center">
                  <h3 className="font-semibold text-purple-400 mb-3">Learner Attempts</h3>
                  <p className="text-2xl font-bold text-white mb-2">{attempts.length}</p>
                  <p className="text-purple-400 text-sm">Total engagements</p>
                </div>
              </div>

              {quiz.description && (
                <div className="glass-card border-2 border-cyan-400/20 p-6">
                  <h3 className="font-semibold text-cyan-400 mb-3">Assessment Protocol</h3>
                  <p className="text-gray-300 leading-relaxed">{quiz.description}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-6xl mb-4">🎯</div>
              <h3 className="text-xl font-bold gradient-text mb-2">No Assessment Deployed</h3>
              <p className="text-gray-400 mb-6">Activate knowledge assessment protocols for your learners</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="btn-neon group"
              >
                <span>Initialize Assessment</span>
                <span className="inline-block ml-2 text-xl transition-transform group-hover:scale-110">⚡</span>
              </button>
            </div>
          )}
        </div>

        {/* Learner Attempts - Only show if quiz exists */}
        {quiz && !quizLoading && (
          <div className="glass-card border-2 border-cyan-400/30 p-6">
            <h2 className="text-2xl font-bold gradient-text mb-6 flex items-center gap-2">
              <span>👥</span>
              Learner Performance Data
            </h2>
            
            {attempts.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-cyan-400/20">
                      <th className="text-left py-4 font-semibold text-cyan-400">Learner</th>
                      <th className="text-left py-4 font-semibold text-cyan-400">Performance</th>
                      <th className="text-left py-4 font-semibold text-cyan-400">Status</th>
                      <th className="text-left py-4 font-semibold text-cyan-400">Engagement Time</th>
                      <th className="text-left py-4 font-semibold text-cyan-400">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attempts.map((attempt) => (
                      <tr key={attempt.id} className="border-b border-cyan-400/10 hover:bg-cyan-400/5 transition-colors">
                        <td className="py-4 text-white">
                          {attempt.profiles?.full_name || `Learner #${attempt.user_id?.substring(0, 8) || 'unknown'}`}
                        </td>
                        <td className="py-4">
                          <span className={`font-bold text-lg ${
                            attempt.passed ? 'text-green-400 neon-text' : 'text-red-400'
                          }`}>
                            {attempt.score}%
                          </span>
                        </td>
                        <td className="py-4">
                          <span className={`badge-cyber ${
                            attempt.passed 
                              ? 'bg-green-400/20 text-green-400 border-green-400/40' 
                              : 'bg-red-400/20 text-red-400 border-red-400/40'
                          }`}>
                            {attempt.passed ? '✅ Optimal' : '❌ Review'}
                          </span>
                        </td>
                        <td className="py-4 text-cyan-400">
                          {attempt.time_spent_seconds ? (
                            <>
                              {Math.floor(attempt.time_spent_seconds / 60)}:
                              {(attempt.time_spent_seconds % 60).toString().padStart(2, '0')}
                            </>
                          ) : (
                            'N/A'
                          )}
                        </td>
                        <td className="py-4 text-gray-400">
                          {attempt.created_at ? new Date(attempt.created_at).toLocaleDateString() : 'Unknown'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">
                <div className="text-4xl mb-4">🌌</div>
                <p className="text-lg mb-2">Awaiting Learner Engagement</p>
                <p className="text-sm">Performance data will materialize here once learners complete the assessment.</p>
                
                {/* Debug info */}
                {process.env.NODE_ENV === 'development' && (
                  <div className="mt-6 glass-card p-4 border border-cyan-400/20 text-xs">
                    <p className="text-cyan-400 font-semibold">Debug Information:</p>
                    <p>Course ID: {courseId}</p>
                    <p>Assessment ID: {quiz?.id}</p>
                    <p>Engagement Records: {attempts.length}</p>
                  </div>
                )}
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
    </div>
  );
}