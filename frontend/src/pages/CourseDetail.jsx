import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { coursesAPI, progressAPI, quizAPI,certificateAPI  } from '../services/api'; 
import { supabase } from '../services/supabaseClient';
import { formatCurrency, formatPrice } from '../utils/currency';
import VideoPlayer from '../components/VideoPlayer';
import ProgressTracker from '../components/ProgressTracker';
import QuizModal from '../components/QuizModal';


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
const checkQuizExists = async () => {
  try {
    const response = await quizAPI.getQuizByCourse(id);
    setHasQuiz(!!(response && response.quiz));
  } catch (error) {
    // "No quiz found" is expected when no quiz exists
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
        // Check if certificate already exists
        const certificates = await certificateAPI.getMyCertificates();
        const existingCert = certificates.certificates?.find(
          cert => cert.course_id === course.id
        );
        
        if (!existingCert) {
          // Auto-generate certificate
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
      // Set first lesson as selected by default
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



// Call fetchProgress when enrollment changes
useEffect(() => {
  if (isEnrolled) {
    fetchProgress();
  }
}, [isEnrolled, id, user]);

const handleProgressUpdate = (progressData) => {
  // Update local state immediately for better UX
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
  
  // Recalculate overall course progress
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
      // Create enrollment record
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
      alert('Successfully enrolled in the course!');
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
            <span className="text-gray-600 capitalize">{course.level}</span>
            <span className="text-gray-500">•</span>
            <span className="text-gray-600">{course.duration_hours || 0} hours</span>
          </div>

          {/* Video Player Section */}

<div className="mb-8">
  <div className="bg-gray-900 rounded-lg overflow-hidden shadow-lg">
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
      <div className="w-full h-64 lg:h-96 bg-gray-800 flex items-center justify-center">
        <div className="text-center text-white">
          <div className="text-4xl mb-3">
            {isEnrolled || course.price === 0 ? '🎬' : '🔒'}
          </div>
          <p className="text-xl font-medium mb-2">
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
              <h3 className="text-xl font-semibold mb-4">
                Course Content ({course.lessons.length} lessons)
              </h3>
              <div className="space-y-3">
                {course.lessons
                  .sort((a, b) => a.order_index - b.order_index)
                  .map((lesson, index) => (
                    <div 
                      key={lesson.id} 
                      className={`flex items-center justify-between p-4 border rounded-lg cursor-pointer transition-colors ${
                        selectedLesson?.id === lesson.id 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-gray-200 hover:border-gray-300'
                      } ${
                        !isEnrolled && course.price > 0 ? 'opacity-60' : ''
                      }`}
                      onClick={() => handleLessonSelect(lesson)}
                    >
                      <div className="flex items-center">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-4 font-semibold ${
                          selectedLesson?.id === lesson.id 
                            ? 'bg-blue-500 text-white' 
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {index + 1}
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900">{lesson.title}</h4>
                          <p className="text-sm text-gray-600">{lesson.duration_minutes} minutes</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {lesson.video_url && (
                          <span className={`text-sm font-medium ${
                            isEnrolled || course.price === 0 ? 'text-blue-600' : 'text-gray-400'
                          }`}>
                            {isEnrolled || course.price === 0 ? 'Watch' : 'Locked'}
                          </span>
                        )}
                        {!isEnrolled && course.price > 0 && (
                          <span className="text-gray-400">🔒</span>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6 sticky top-6">
            {isEnrolled ? (
              <div className="text-center mb-6">
                <div className="text-green-600 text-lg font-semibold mb-2">
                  ✅ Enrolled
                </div>
                <p className="text-sm text-gray-600">
                  You have access to all course content
                </p>
              </div>
            ) : (
              <div className="text-center mb-6">
                <div className="text-3xl font-bold text-gray-900 mb-2">
                  {formatCurrency(course.price)}
                </div>
                {course.price > 0 && (
                  <div className="text-sm text-gray-600 line-through">
                    {formatPrice(course.price * 1.5)}
                  </div>
                )}
              </div>
            )}

            {!isEnrolled ? (
              <button
                onClick={handleEnroll}
                disabled={enrolling}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 transition-colors mb-4 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {enrolling ? 'Enrolling...' : (
                  user ? 'Enroll Now' : 'Sign Up to Enroll'
                )}
              </button>
            ) : (
              <button
                onClick={() => {
                  if (course.lessons && course.lessons.length > 0) {
                    handleLessonSelect(course.lessons[0]);
                  }
                }}
                className="w-full bg-green-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-green-700 transition-colors mb-4"
              >
                Start Learning
              </button>
            )}

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
              <div className="flex justify-between">
                <span className="text-gray-600">Students</span>
                <span className="font-medium">1.2k+</span>
              </div>
            </div>
          </div>

          {/* Progress Section for Enrolled Students */}

{isEnrolled && (
  <div className="mt-8">
      <ProgressTracker 
      courseId={course.id}
      onProgressUpdate={fetchProgress}
    />
    <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
      <h3 className="text-xl font-semibold mb-4">Course Quiz</h3>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-600 mb-2">
            Test your knowledge with the course quiz
          </p>
          <div className="flex items-center space-x-4 text-sm text-gray-500">
            <span>Multiple choice questions</span>
            <span>•</span>
            <span>Instant results</span>
            <span>•</span>
            <span>Detailed feedback</span>
          </div>
        </div>
        <button
          onClick={() => setShowQuizModal(true)}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
        >
          Take Quiz
        </button>
      </div>
    </div>

    {/* Instructor Quiz Management Link */}
    {user?.id === course.instructor_id && (
      <div className="mt-4 text-center">
        <Link 
          to={`/courses/${course.id}/quiz-management`}
          className="text-blue-600 hover:text-blue-700 font-semibold"
        >
          Manage Quiz Settings →
        </Link>
      </div>
    )}
  </div>
)}

{/* Add the modal at the end of the component */}
<QuizModal
  courseId={course?.id}
  courseTitle={course?.title}
  isOpen={showQuizModal}
  onClose={() => setShowQuizModal(false)}
  onQuizComplete={(results) => {
    // Update progress when quiz is completed
    if (results.passed) {
      fetchProgress();
    }
  }}
/>

        </div>
      </div>
    </div>
  );
}