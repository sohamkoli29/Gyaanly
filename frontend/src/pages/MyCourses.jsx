import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { enrollmentsAPI } from '../services/api';
import { supabase } from '../services/supabaseClient';
import VideoPlayer from '../components/VideoPlayer';
import { formatCurrency } from '../utils/currency';

export default function MyCourses() {
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [previewLesson, setPreviewLesson] = useState(null);
  const [activeFilter, setActiveFilter] = useState('all'); // all, in-progress, completed

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

  const showVideoPreview = (course) => {
    const lessonWithVideo = course.lessons?.find(lesson => 
      lesson.video_path && lesson.upload_status === 'ready'
    );
    
    if (lessonWithVideo) {
      setPreviewLesson({
        courseTitle: course.title,
        lesson: lessonWithVideo
      });
    } else {
      alert('No videos available for preview in this course yet.');
    }
  };

  // Filter enrollments based on active filter
  const filteredEnrollments = enrollments.filter(enrollment => {
    if (activeFilter === 'completed') {
      return enrollment.completed_at;
    } else if (activeFilter === 'in-progress') {
      return !enrollment.completed_at;
    }
    return true; // 'all'
  });

  if (!user) {
    return (
      <div className="min-h-screen pt-24 pb-12 relative">
        <div className="grid-bg fixed inset-0 opacity-20 pointer-events-none" />
        <div className="container-cyber relative z-10 text-center">
          <div className="glass-card max-w-md mx-auto p-8">
            <div className="text-6xl mb-4">🔐</div>
            <h1 className="text-2xl font-bold gradient-text mb-4">Access Required</h1>
            <p className="text-gray-400 mb-6">Please log in to view your learning dashboard</p>
            <Link to="/login" className="btn-cyber">
              Login to Continue
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen pt-24 pb-12 relative">
        <div className="grid-bg fixed inset-0 opacity-20 pointer-events-none" />
        <div className="container-cyber relative z-10">
          {/* Header Skeleton */}
          <div className="text-center mb-12">
            <div className="h-12 w-64 skeleton rounded-lg mx-auto mb-4" />
            <div className="h-6 w-96 skeleton rounded mx-auto" />
          </div>

          {/* Filters Skeleton */}
          <div className="flex justify-center gap-4 mb-8">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="h-12 w-32 skeleton rounded-xl" />
            ))}
          </div>

          {/* Course Grid Skeleton */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="glass-card">
                <div className="h-48 mb-6 rounded-xl skeleton" />
                <div className="space-y-3">
                  <div className="h-6 w-3/4 skeleton rounded" />
                  <div className="h-4 w-full skeleton rounded" />
                  <div className="h-4 w-2/3 skeleton rounded" />
                  <div className="h-12 skeleton rounded-lg mt-4" />
                </div>
              </div>
            ))}
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
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 glass-card px-4 py-2 mb-6">
            <span className="notification-dot" />
            <span className="text-sm font-medium text-cyan-400">
              🎓 Your Learning Universe
            </span>
          </div>
          
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6">
            <span className="gradient-text">My Courses</span>
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Continue your journey through the digital learning cosmos
          </p>
        </div>

        {/* Stats & Filters */}
        <div className="flex flex-col lg:flex-row justify-between items-center gap-6 mb-8">
          {/* Stats */}
          <div className="flex gap-6">
            <div className="glass-card px-6 py-4 text-center">
              <div className="text-2xl font-bold gradient-text">{enrollments.length}</div>
              <div className="text-sm text-gray-400">Total Courses</div>
            </div>
            <div className="glass-card px-6 py-4 text-center">
              <div className="text-2xl font-bold gradient-text">
                {enrollments.filter(e => !e.completed_at).length}
              </div>
              <div className="text-sm text-gray-400">In Progress</div>
            </div>
            <div className="glass-card px-6 py-4 text-center">
              <div className="text-2xl font-bold gradient-text">
                {enrollments.filter(e => e.completed_at).length}
              </div>
              <div className="text-sm text-gray-400">Completed</div>
            </div>
          </div>

          {/* Filters */}
          <div className="flex gap-2 glass-card p-2">
            {[
              { key: 'all', label: 'All Courses', icon: '🌌' },
              { key: 'in-progress', label: 'In Progress', icon: '🚀' },
              { key: 'completed', label: 'Completed', icon: '🏆' }
            ].map((filter) => (
              <button
                key={filter.key}
                onClick={() => setActiveFilter(filter.key)}
                className={`
                  px-4 py-2 rounded-lg font-medium transition-all duration-300
                  ${activeFilter === filter.key
                    ? 'bg-cyan-400/20 text-cyan-400 shadow-neon-sm'
                    : 'text-gray-400 hover:text-cyan-400 hover:bg-cyan-400/10'
                  }
                `}
              >
                <span className="mr-2">{filter.icon}</span>
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        {/* VIDEO PREVIEW MODAL */}
        {previewLesson && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-xl flex items-center justify-center z-50 p-4">
            <div className="glass-card max-w-4xl w-full max-h-[90vh] overflow-auto border-2 border-cyan-400/30">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="text-2xl font-bold gradient-text mb-2">
                      Preview: {previewLesson.courseTitle}
                    </h3>
                    <p className="text-cyan-400">{previewLesson.lesson.title}</p>
                  </div>
                  <button
                    onClick={() => setPreviewLesson(null)}
                    className="text-cyan-400 hover:text-cyan-300 text-2xl transition-colors"
                  >
                    ×
                  </button>
                </div>
                <div className="rounded-xl overflow-hidden border-2 border-cyan-400/20 bg-black">
                  <VideoPlayer
                    lessonId={previewLesson.lesson.id}
                    videoPath={previewLesson.lesson.video_path}
                    className="w-full h-96"
                  />
                </div>
                <div className="mt-6 text-center">
                  <button
                    onClick={() => setPreviewLesson(null)}
                    className="btn-ghost"
                  >
                    Close Preview
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {filteredEnrollments.length === 0 ? (
          <div className="text-center py-20">
            <div className="glass-card max-w-md mx-auto p-8">
              <div className="text-6xl mb-4">🌠</div>
              <h2 className="text-2xl font-bold gradient-text mb-4">
                {activeFilter === 'all' ? 'No Courses Yet' : 
                 activeFilter === 'in-progress' ? 'No Courses in Progress' : 
                 'No Courses Completed'}
              </h2>
              <p className="text-gray-400 mb-6">
                {activeFilter === 'all' 
                  ? 'Begin your learning journey by enrolling in your first course!' 
                  : activeFilter === 'in-progress'
                  ? 'All your enrolled courses are completed! Start a new one.'
                  : 'Complete some courses to see them here.'
                }
              </p>
              <Link to="/courses" className="btn-cyber">
                Explore Courses
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {filteredEnrollments.map((enrollment) => {
              const hasVideos = enrollment.courses.lessons?.some(lesson => 
                lesson.video_path && lesson.upload_status === 'ready'
              );
              const videoCount = enrollment.courses.lessons?.filter(lesson => 
                lesson.video_path && lesson.upload_status === 'ready'
              ).length || 0;
              
              return (
                <div 
                  key={enrollment.id} 
                  className="glass-card holographic card-hover group"
                >
                  {/* Course Image */}
                  <div className="relative h-48 mb-6 rounded-xl overflow-hidden bg-gradient-to-br from-cyan-500/20 to-purple-500/20">
                    {enrollment.courses.thumbnail_url ? (
                      <img 
                        src={enrollment.courses.thumbnail_url} 
                        alt={enrollment.courses.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-6xl">
                        📚
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    
                    {/* Status Badges */}
                    <div className="absolute top-3 left-3">
                      {enrollment.completed_at ? (
                        <span className="badge-cyber bg-green-400/20 text-green-400 border-green-400/40">
                          🏆 Completed
                        </span>
                      ) : (
                        <span className="badge-cyber bg-cyan-400/20 text-cyan-400">
                          🚀 In Progress
                        </span>
                      )}
                    </div>
                    
                    {/* Video Badge */}
                    {hasVideos && (
                      <div className="absolute top-3 right-3 badge-cyber bg-purple-400/20 text-purple-400 border-purple-400/40">
                        🎬 {videoCount} video{videoCount !== 1 ? 's' : ''}
                      </div>
                    )}

                    {/* Level Badge */}
                    <div className="absolute bottom-3 left-3 badge-cyber">
                      {enrollment.courses.level}
                    </div>
                  </div>

                  {/* Course Content */}
                  <div className="space-y-4">
                    <h3 className="text-xl font-bold text-white group-hover:text-cyan-400 transition-colors line-clamp-2">
                      {enrollment.courses.title}
                    </h3>
                    
                    <p className="text-gray-400 text-sm line-clamp-2 leading-relaxed">
                      {enrollment.courses.description}
                    </p>

                    {/* Instructor & Enrollment Info */}
                    <div className="flex items-center justify-between pt-4 border-t border-cyan-400/20">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center text-xs font-bold">
                          {enrollment.courses.profiles?.full_name?.charAt(0) || 'I'}
                        </div>
                        <span className="text-sm text-gray-400">
                          {enrollment.courses.profiles?.full_name || 'Instructor'}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500">
                        Enrolled: {new Date(enrollment.enrolled_at).toLocaleDateString()}
                      </span>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3 pt-4 border-t border-cyan-400/20">
                      {hasVideos && (
                        <button
                          onClick={() => showVideoPreview(enrollment.courses)}
                          className="flex-1 btn-ghost text-sm py-2 group"
                        >
                          <span>Preview</span>
                          <span className="inline-block ml-1 transition-transform group-hover:translate-x-1">🎬</span>
                        </button>
                      )}
                      
                      <Link 
                        to={`/courses/${enrollment.courses.id}`}
                        className={`flex-1 text-center btn-cyber text-sm py-2 group ${
                          !hasVideos ? 'flex-1' : 'flex-1'
                        }`}
                      >
                        <span>{enrollment.completed_at ? 'Review' : 'Continue'}</span>
                        <span className="inline-block ml-1 transition-transform group-hover:translate-x-1">
                          {enrollment.completed_at ? '🔁' : '🚀'}
                        </span>
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* CTA Section for Empty State */}
        {enrollments.length === 0 && (
          <div className="mt-16 text-center">
            <div className="glass-card max-w-2xl mx-auto p-8">
              <h3 className="text-2xl font-bold gradient-text mb-4">
                Ready to Launch Your Learning Journey?
              </h3>
              <p className="text-gray-400 mb-6">
                Discover cutting-edge courses and transform your skills with AI-powered learning
              </p>
              <Link to="/courses" className="btn-neon">
                Explore All Courses
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}