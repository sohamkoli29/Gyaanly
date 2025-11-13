import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { coursesAPI, progressAPI, quizAPI, certificateAPI } from '../services/api'; 
import { supabase } from '../services/supabaseClient';
import { formatCurrency, formatPrice } from '../utils/currency';
import VideoPlayer from '../components/VideoPlayer';
import ProgressTracker from '../components/ProgressTracker';
import QuizModal from '../components/QuizModal';
import PaymentModal from '../components/PaymentModal';

export default function CourseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [user, setUser] = useState(null);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [enrolling, setEnrolling] = useState(false);
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [courseProgress, setCourseProgress] = useState({
    progress_percent: 0,
    completed_lessons: 0,
    total_lessons: 0
  });
  const [lessonProgress, setLessonProgress] = useState([]);
  const [activeTab, setActiveTab] = useState('lessons');
  const [showQuizModal, setShowQuizModal] = useState(false);
  const [hasQuiz, setHasQuiz] = useState(false);
  const [hasCertificate, setHasCertificate] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentProcessing, setPaymentProcessing] = useState(false);

  const checkQuizExists = async () => {
    try {
      const response = await quizAPI.getQuizByCourse(id);
      setHasQuiz(!!(response && response.quiz));
    } catch (error) {
      if (error.message === 'NO_QUIZ_FOUND') {
        setHasQuiz(false);
      } else {
        console.error('Error checking quiz:', error);
        setHasQuiz(false);
      }
    }
  };

  useEffect(() => {
    if (isEnrolled) {
      checkQuizExists();
    }
  }, [isEnrolled, id]);

  useEffect(() => {
    const checkAndGenerateCertificate = async () => {
      if (isEnrolled && courseProgress.progress_percent >= 100) {
        try {
          const certificates = await certificateAPI.getMyCertificates();
          const existingCert = certificates.certificates?.find(
            cert => cert.course_id === course.id
          );
          
          if (!existingCert) {
            const result = await certificateAPI.autoGenerateCertificate(course.id);
            if (result.auto_generation) {
              console.log('Certificate auto-generated!');
              setHasCertificate(true);
            }
          } else {
            setHasCertificate(true);
          }
        } catch (error) {
          console.log('Auto-generation note:', error.message);
        }
      }
    };

    if (course && isEnrolled) {
      checkAndGenerateCertificate();
    }
  }, [courseProgress.progress_percent, isEnrolled, course]);

  useEffect(() => {
    checkAuth();
    fetchCourse();
  }, [id]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    setUser(session?.user ?? null);
    if (session?.user) {
      checkEnrollment(session.user.id);
    }
  };

  const fetchCourse = async () => {
    try {
      const data = await coursesAPI.getCourse(id);
      setCourse(data.course);
      if (data.course.lessons && data.course.lessons.length > 0) {
        setSelectedLesson(data.course.lessons[0]);
      }
    } catch (error) {
      console.error('Error fetching course:', error);
      setError('Course not found or you dont have access to view it.');
    } finally {
      setLoading(false);
    }
  };
  
  const fetchProgress = async () => {
    if (!user || !isEnrolled) return;
    
    try {
      const progressData = await progressAPI.getCourseProgress(id);
      setCourseProgress(progressData.courseProgress);
      setLessonProgress(progressData.lessonProgress || []);
    } catch (error) {
      console.error('Error fetching progress:', error);
    }
  };

  useEffect(() => {
    if (isEnrolled) {
      fetchProgress();
    }
  }, [isEnrolled, id, user]);

  const handleProgressUpdate = (progressData) => {
    const updatedLessonProgress = [...lessonProgress];
    const existingIndex = updatedLessonProgress.findIndex(
      lp => lp.lesson_id === progressData.lessonId
    );
    
    if (existingIndex >= 0) {
      updatedLessonProgress[existingIndex] = {
        ...updatedLessonProgress[existingIndex],
        progress_percent: progressData.progress,
        completed: progressData.completed
      };
    } else {
      updatedLessonProgress.push({
        lesson_id: progressData.lessonId,
        progress_percent: progressData.progress,
        completed: progressData.completed
      });
    }
    
    setLessonProgress(updatedLessonProgress);
    
    const completedLessons = updatedLessonProgress.filter(lp => lp.completed).length;
    const totalLessons = course.lessons?.length || 0;
    const overallProgress = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
    
    setCourseProgress({
      progress_percent: overallProgress,
      completed_lessons: completedLessons,
      total_lessons: totalLessons
    });
  };

  const checkEnrollment = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('enrollments')
        .select('*')
        .eq('user_id', userId)
        .eq('course_id', id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error checking enrollment:', error);
      } else {
        setIsEnrolled(!!data);
      }
    } catch (error) {
      console.error('Enrollment check error:', error);
    }
  };

  const handleEnroll = async () => {
    if (!user) {
      navigate('/login');
      return;
    }

    setEnrolling(true);
    try {
      const { data, error } = await supabase
        .from('enrollments')
        .insert([
          {
            user_id: user.id,
            course_id: id,
            enrolled_at: new Date().toISOString()
          }
        ])
        .select()
        .single();

      if (error) throw error;

      setIsEnrolled(true);
    } catch (error) {
      console.error('Enrollment error:', error);
      alert('Error enrolling in course: ' + error.message);
    } finally {
      setEnrolling(false);
    }
  };

  const handleLessonSelect = (lesson) => {
    if (isEnrolled || course.price === 0) {
      setSelectedLesson(lesson);
    } else {
      alert('Please enroll in the course to access lessons.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen pt-24 pb-12 relative">
        <div className="grid-bg fixed inset-0 opacity-20 pointer-events-none" />
        <div className="container-cyber relative z-10">
          <div className="animate-pulse space-y-6">
            {/* Breadcrumb Skeleton */}
            <div className="h-4 w-48 skeleton rounded mb-8" />
            
            {/* Main Content Skeleton */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-6">
                <div className="h-12 skeleton rounded-lg w-3/4" />
                <div className="h-6 skeleton rounded w-1/2" />
                <div className="h-96 skeleton rounded-2xl" />
                <div className="space-y-3">
                  <div className="h-4 skeleton rounded" />
                  <div className="h-4 skeleton rounded" />
                  <div className="h-4 skeleton rounded w-3/4" />
                </div>
              </div>
              
              {/* Sidebar Skeleton */}
              <div className="space-y-6">
                <div className="glass-card p-6 skeleton h-64 rounded-2xl" />
                <div className="glass-card p-6 skeleton h-48 rounded-2xl" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen pt-24 pb-12 relative">
        <div className="grid-bg fixed inset-0 opacity-20 pointer-events-none" />
        <div className="container-cyber relative z-10 text-center">
          <div className="glass-card max-w-md mx-auto p-8">
            <div className="text-6xl mb-4">🚫</div>
            <h1 className="text-2xl font-bold gradient-text mb-4">Course Not Found</h1>
            <p className="text-gray-400 mb-6">{error}</p>
            <Link to="/courses" className="btn-cyber">
              Back to Courses
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
            <Link to="/courses" className="btn-cyber">
              Browse All Courses
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
              <Link to="/" className="text-cyan-400 hover:text-cyan-300 transition-colors">Home</Link>
            </li>
            <li className="text-gray-500">/</li>
            <li>
              <Link to="/courses" className="text-cyan-400 hover:text-cyan-300 transition-colors">Courses</Link>
            </li>
            <li className="text-gray-500">/</li>
            <li>
              <span className="text-gray-300 font-medium truncate max-w-xs">{course.title}</span>
            </li>
          </ol>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Course Header */}
            <div className="glass-card p-8 mb-8">
              <div className="inline-flex items-center gap-2 badge-cyber mb-4">
                <span className="notification-dot" />
                <span className="text-xs font-medium">
                  {course.level?.toUpperCase()} LEVEL
                </span>
              </div>
              
              <h1 className="text-4xl sm:text-5xl font-bold gradient-text mb-4">
                {course.title}
              </h1>
              
              <div className="flex items-center space-x-6 mb-6">
                <div className="flex items-center text-yellow-400">
                  <span className="text-lg">⭐</span>
                  <span className="ml-2 font-semibold">{course.rating || '4.5'}</span>
                </div>
                <div className="w-px h-6 bg-cyan-400/30"></div>
                <span className="text-cyan-400 capitalize">{course.level}</span>
                <div className="w-px h-6 bg-cyan-400/30"></div>
                <span className="text-gray-400">{course.duration_hours || 0} hours</span>
              </div>

              <p className="text-xl text-gray-300 leading-relaxed">
                {course.description}
              </p>
            </div>

            {/* Video Player Section */}
            <div className="glass-card p-6 mb-8">
              <div className="rounded-xl overflow-hidden border-2 border-cyan-400/20 bg-black">
                {selectedLesson && selectedLesson.video_path ? (
                  <VideoPlayer
                    lessonId={selectedLesson.id}
                    videoPath={selectedLesson.video_path}
                    courseId={course.id}
                    onProgressUpdate={handleProgressUpdate}
                    lessons={course.lessons}
                    currentLessonIndex={course.lessons.findIndex(l => l.id === selectedLesson.id)}
                    onLessonChange={(newIndex) => {
                      const newLesson = course.lessons[newIndex];
                      setSelectedLesson(newLesson);
                    }}
                    className="w-full h-64 lg:h-96"
                  />
                ) : (
                  <div className="w-full h-64 lg:h-96 bg-gradient-to-br from-cyan-500/10 to-purple-500/10 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-6xl mb-4">
                        {isEnrolled || course.price === 0 ? '🎬' : '🔒'}
                      </div>
                      <p className="text-2xl font-bold text-white mb-2">
                        {isEnrolled || course.price === 0 
                          ? 'Video Coming Soon' 
                          : 'Enroll to Access Videos'
                        }
                      </p>
                      <p className="text-gray-400">
                        {isEnrolled || course.price === 0 
                          ? 'The instructor is preparing this lesson content.' 
                          : 'Purchase this course to watch all videos'
                        }
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Instructor Info */}
            <div className="glass-card p-6 mb-8">
              <h3 className="text-2xl font-bold gradient-text mb-6">About the Instructor</h3>
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center text-xl font-bold text-white">
                  {course.profiles?.full_name?.charAt(0) || 'I'}
                </div>
                <div>
                  <h4 className="text-xl font-bold text-white mb-1">
                    {course.profiles?.full_name || 'Instructor'}
                  </h4>
                  <p className="text-cyan-400">Course Instructor</p>
                </div>
              </div>
            </div>

            {/* Lessons Section */}
            {course.lessons && course.lessons.length > 0 && (
              <div className="glass-card p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-2xl font-bold gradient-text">
                    Course Content
                  </h3>
                  <span className="badge-cyber">
                    {course.lessons.length} lessons
                  </span>
                </div>
                
                <div className="space-y-3">
                  {course.lessons
                    .sort((a, b) => a.order_index - b.order_index)
                    .map((lesson, index) => {
                      const isCompleted = lessonProgress.find(lp => lp.lesson_id === lesson.id)?.completed;
                      const isLocked = !isEnrolled && course.price > 0;
                      
                      return (
                        <div 
                          key={lesson.id} 
                          className={`
                            glass-card p-4 cursor-pointer transition-all duration-300 border-2
                            ${selectedLesson?.id === lesson.id 
                              ? 'border-cyan-400 bg-cyan-400/10 shadow-neon-md' 
                              : 'border-cyan-400/20 hover:border-cyan-400/50 hover:scale-[1.02]'
                            }
                            ${isLocked ? 'opacity-60 cursor-not-allowed' : ''}
                            group
                          `}
                          onClick={() => !isLocked && handleLessonSelect(lesson)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                              <div className={`
                                w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm
                                ${selectedLesson?.id === lesson.id 
                                  ? 'bg-cyan-400 text-black' 
                                  : isCompleted
                                    ? 'bg-green-400 text-black'
                                    : 'bg-gray-600 text-white'
                                }
                                transition-all duration-300
                              `}>
                                {isCompleted ? '✓' : index + 1}
                              </div>
                              <div>
                                <h4 className="font-semibold text-white group-hover:text-cyan-400 transition-colors">
                                  {lesson.title}
                                </h4>
                                <p className="text-sm text-gray-400">{lesson.duration_minutes} minutes</p>
                              </div>
                            </div>
                            
                            <div className="flex items-center space-x-3">
                              {isCompleted && (
                                <span className="text-green-400 text-sm font-semibold">Completed</span>
                              )}
                              {lesson.video_url && (
                                <span className={`
                                  text-sm font-medium px-3 py-1 rounded-full
                                  ${isEnrolled || course.price === 0 
                                    ? 'bg-cyan-400/20 text-cyan-400' 
                                    : 'bg-gray-600 text-gray-400'
                                  }
                                `}>
                                  {isEnrolled || course.price === 0 ? 'Watch' : 'Locked'}
                                </span>
                              )}
                              {isLocked && (
                                <span className="text-gray-400 text-xl">🔒</span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Enrollment Card */}
            <div className="glass-card p-6 sticky top-6">
              {isEnrolled ? (
                <div className="text-center mb-6">
                  <div className="text-4xl mb-3">🎉</div>
                  <div className="text-green-400 text-lg font-bold mb-2 neon-text">
                    Successfully Enrolled
                  </div>
                  <p className="text-sm text-gray-400">
                    Full course access unlocked
                  </p>
                </div>
              ) : (
                <div className="text-center mb-6">
                  <div className="text-4xl font-bold gradient-text mb-2">
                    {formatCurrency(course.price)}
                  </div>
                  {course.price > 0 && (
                    <div className="text-sm text-gray-400 line-through">
                      {formatPrice(course.price * 1.5)}
                    </div>
                  )}
                </div>
              )}

              {!isEnrolled ? (
                <div className="space-y-4">
                  {course.price > 0 ? (
                    <button
                      onClick={() => setShowPaymentModal(true)}
                      disabled={enrolling}
                      className="btn-cyber w-full"
                    >
                      {enrolling ? (
                        <div className="flex items-center justify-center space-x-2">
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Processing...</span>
                        </div>
                      ) : (
                        'Buy Now'
                      )}
                    </button>
                  ) : (
                    <button
                      onClick={handleEnroll}
                      disabled={enrolling}
                      className="btn-neon w-full"
                    >
                      {enrolling ? (
                        <div className="flex items-center justify-center space-x-2">
                          <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                          <span>Enrolling...</span>
                        </div>
                      ) : (
                        'Enroll for Free'
                      )}
                    </button>
                  )}

                  <div className="text-center text-sm text-cyan-400">
                    ⚡ 30-day money-back guarantee
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => {
                    if (course.lessons && course.lessons.length > 0) {
                      handleLessonSelect(course.lessons[0]);
                    }
                  }}
                  className="btn-neon w-full mb-4"
                >
                  Start Learning
                </button>
              )}

              <div className="space-y-3 text-sm pt-4 border-t border-cyan-400/20">
                <div className="flex justify-between">
                  <span className="text-gray-400">Level</span>
                  <span className="font-semibold text-cyan-400 capitalize">{course.level}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Duration</span>
                  <span className="font-semibold text-cyan-400">{course.duration_hours || 0} hours</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Lessons</span>
                  <span className="font-semibold text-cyan-400">{course.lessons?.length || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Access</span>
                  <span className="font-semibold text-green-400">Lifetime</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Students</span>
                  <span className="font-semibold text-cyan-400">1.2k+</span>
                </div>
              </div>
            </div>

            {/* Progress & Quiz Section */}
            {isEnrolled && (
              <div className="space-y-6">
                <ProgressTracker 
                  courseId={course.id}
                  onProgressUpdate={fetchProgress}
                />
                
                {/* Quiz Card */}
                <div className="glass-card p-6">
                  <h3 className="text-xl font-bold gradient-text mb-4">Course Quiz</h3>
                  <div className="space-y-4">
                    <p className="text-gray-400">
                      Test your knowledge with the course quiz
                    </p>
                    <div className="flex items-center space-x-2 text-xs text-cyan-400">
                      <span className="badge-cyber">Multiple choice</span>
                      <span className="badge-cyber">Instant results</span>
                      <span className="badge-cyber">Detailed feedback</span>
                    </div>
                    <button
                      onClick={() => setShowQuizModal(true)}
                      className="btn-ghost w-full group"
                    >
                      <span>Take Quiz</span>
                      <span className="inline-block ml-2 transition-transform group-hover:translate-x-1">→</span>
                    </button>
                  </div>
                </div>

                {/* Instructor Management */}
                {user?.id === course.instructor_id && (
                  <div className="glass-card p-4 text-center">
                    <Link 
                      to={`/courses/${course.id}/quiz-management`}
                      className="text-cyan-400 hover:text-cyan-300 font-semibold transition-colors"
                    >
                      Manage Quiz Settings ↗
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      <QuizModal
        courseId={course?.id}
        courseTitle={course?.title}
        isOpen={showQuizModal}
        onClose={() => setShowQuizModal(false)}
        onQuizComplete={(results) => {
          if (results.passed) {
            fetchProgress();
          }
        }}
      />

      {showPaymentModal && (
        <PaymentModal
          course={course}
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          onSuccess={(enrollment) => {
            setIsEnrolled(true);
            setShowPaymentModal(false);
          }}
        />
      )}
    </div>
  );
}