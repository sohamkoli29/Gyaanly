import { useState, useEffect } from 'react';
import { progressAPI, certificateAPI } from '../services/api';

export default function ProgressTracker({ courseId, onProgressUpdate }) {
  const [progress, setProgress] = useState({
    overall: 0,
    completedLessons: 0,
    totalLessons: 0,
    lessonProgress: []
  });
  const [hasCertificate, setHasCertificate] = useState(false);
  const [loading, setLoading] = useState(true);
  const [generatingCert, setGeneratingCert] = useState(false);

  useEffect(() => {
    if (courseId) {
      fetchProgress();
      checkCertificate();
    }
  }, [courseId]);

  const fetchProgress = async () => {
    try {
      const data = await progressAPI.getCourseProgress(courseId);
      setProgress({
        overall: data.courseProgress.progress_percent || 0,
        completedLessons: data.courseProgress.completed_lessons || 0,
        totalLessons: data.courseProgress.total_lessons || 0,
        lessonProgress: data.lessonProgress || []
      });
    } catch (error) {
      console.error('Error fetching progress:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkCertificate = async () => {
    try {
      const certificates = await certificateAPI.getMyCertificates();
      const hasCert = certificates.certificates?.some(
        cert => cert.course_id === courseId
      );
      setHasCertificate(hasCert);
    } catch (error) {
      console.error('Error checking certificate:', error);
      setHasCertificate(false);
    }
  };

  const handleGenerateCertificate = async () => {
    setGeneratingCert(true);
    try {
      await certificateAPI.generateCertificate(courseId);
      setHasCertificate(true);
      // Show success notification
    } catch (error) {
      console.error('Error generating certificate:', error);
      // Show error notification
    } finally {
      setGeneratingCert(false);
    }
  };

  const getLessonProgress = (lessonId) => {
    const lesson = progress.lessonProgress.find(lp => lp.lesson_id === lessonId);
    return lesson ? lesson.progress_percent : 0;
  };

  const isLessonCompleted = (lessonId) => {
    const lesson = progress.lessonProgress.find(lp => lp.lesson_id === lessonId);
    return lesson ? lesson.completed : false;
  };

  if (loading) {
    return (
      <div className="glass-card p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 skeleton rounded w-2/3 mb-2"></div>
          <div className="h-3 skeleton rounded mb-4"></div>
          <div className="h-4 skeleton rounded w-1/2"></div>
          <div className="grid grid-cols-2 gap-4 mt-6">
            <div className="skeleton h-16 rounded-xl"></div>
            <div className="skeleton h-16 rounded-xl"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card p-6 border-2 border-cyan-400/20 relative overflow-hidden">
      {/* Scan Line Effect */}
      <div className="scan-line absolute inset-0 pointer-events-none" />
      
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold gradient-text">Learning Progress</h3>
        <div className="flex items-center gap-2 glass-card px-3 py-1">
          <div className={`w-2 h-2 rounded-full ${progress.overall === 100 ? 'bg-neon-green animate-pulse' : 'bg-cyan-400'}`} />
          <span className="text-sm text-cyan-400 font-medium">
            {progress.overall === 100 ? 'Completed' : 'In Progress'}
          </span>
        </div>
      </div>
      
      {/* Overall Progress Bar */}
      <div className="mb-8">
        <div className="flex justify-between text-sm mb-3">
          <span className="text-gray-300">Course Completion</span>
          <span className="font-bold text-cyan-400">{progress.overall}%</span>
        </div>
        <div className="progress-cyber">
          <div 
            className="progress-cyber-fill"
            style={{ width: `${progress.overall}%` }}
          ></div>
        </div>
        <p className="text-sm text-gray-400 mt-3">
          <span className="text-cyan-400 font-semibold">{progress.completedLessons}</span> of{' '}
          <span className="text-purple-400 font-semibold">{progress.totalLessons}</span> modules mastered
        </p>
      </div>

      {/* Progress Stats Grid */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="glass-card p-4 text-center border-2 border-cyan-400/20 group hover:border-cyan-400/40 transition-all duration-300">
          <div className="text-2xl font-bold text-cyan-400 mb-1 group-hover:scale-110 transition-transform">
            {progress.completedLessons}
          </div>
          <div className="text-xs text-gray-400 uppercase tracking-wider">Modules Completed</div>
          <div className="mt-2 w-full progress-cyber">
            <div 
              className="progress-cyber-fill bg-gradient-to-r from-cyan-500 to-blue-500"
              style={{ 
                width: `${progress.totalLessons > 0 ? (progress.completedLessons / progress.totalLessons) * 100 : 0}%` 
              }}
            ></div>
          </div>
        </div>
        
        <div className="glass-card p-4 text-center border-2 border-purple-400/20 group hover:border-purple-400/40 transition-all duration-300">
          <div className="text-2xl font-bold text-purple-400 mb-1 group-hover:scale-110 transition-transform">
            {progress.totalLessons > 0 
              ? Math.round((progress.completedLessons / progress.totalLessons) * 100)
              : 0
            }%
          </div>
          <div className="text-xs text-gray-400 uppercase tracking-wider">Mastery Level</div>
          <div className="mt-2 flex justify-center">
            {Array.from({ length: 5 }).map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full mx-1 ${
                  index < Math.floor((progress.completedLessons / progress.totalLessons) * 5)
                    ? 'bg-purple-400'
                    : 'bg-gray-600'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Certificate Section */}
      {progress.overall >= 100 && (
        <div className="border-t border-cyan-400/20 pt-6">
          {hasCertificate ? (
            <div className="glass-card p-6 text-center border-2 border-neon-green/30 bg-gradient-to-r from-neon-green/10 to-cyan-500/10 relative overflow-hidden">
              {/* Animated Background */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-neon-green/5 to-transparent animate-pulse" />
              
              <div className="relative z-10">
                <div className="text-4xl mb-3 float">🏆</div>
                <h4 className="font-bold text-neon-green text-lg mb-2">Achievement Unlocked!</h4>
                <p className="text-gray-300 text-sm mb-4 leading-relaxed">
                  You've demonstrated exceptional mastery of all course concepts
                </p>
                <a 
                  href="/my-certificates" 
                  className="btn-neon group inline-flex items-center space-x-2"
                >
                  <span>View Digital Certificate</span>
                  <span className="text-xl transition-transform group-hover:translate-x-1">🎓</span>
                </a>
              </div>
              
              {/* Corner Accents */}
              <div className="absolute top-3 left-3 w-3 h-3 border-l-2 border-t-2 border-neon-green/50" />
              <div className="absolute top-3 right-3 w-3 h-3 border-r-2 border-t-2 border-neon-green/50" />
              <div className="absolute bottom-3 left-3 w-3 h-3 border-l-2 border-b-2 border-neon-green/50" />
              <div className="absolute bottom-3 right-3 w-3 h-3 border-r-2 border-b-2 border-neon-green/50" />
            </div>
          ) : (
            <div className="glass-card p-6 text-center border-2 border-cyan-400/30 bg-gradient-to-r from-cyan-500/10 to-purple-500/10 relative overflow-hidden">
              <div className="text-4xl mb-3 float">🚀</div>
              <h4 className="font-bold text-cyan-400 text-lg mb-2">Course Mastered!</h4>
              <p className="text-gray-300 text-sm mb-4 leading-relaxed">
                Generate your blockchain-verified certificate to showcase your achievement
              </p>
              <button
                onClick={handleGenerateCertificate}
                disabled={generatingCert}
                className="btn-cyber group relative overflow-hidden"
              >
                {generatingCert ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Generating...</span>
                  </div>
                ) : (
                  <>
                    <span className="relative z-10 flex items-center space-x-2">
                      <span>Generate Certificate</span>
                      <span className="text-xl transition-transform group-hover:scale-110">⚡</span>
                    </span>
                  </>
                )}
              </button>
              
              {/* Tech Features */}
              <div className="mt-4 flex justify-center space-x-6 text-xs text-gray-400">
                <div className="flex items-center space-x-1">
                  <span>🔗</span>
                  <span>Blockchain</span>
                </div>
                <div className="flex items-center space-x-1">
                  <span>🌐</span>
                  <span>Verifiable</span>
                </div>
                <div className="flex items-center space-x-1">
                  <span>💎</span>
                  <span>NFT Ready</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Progress towards certificate */}
      {progress.overall < 100 && (
        <div className="text-center pt-4 border-t border-cyan-400/20">
          <div className="inline-flex items-center space-x-3 glass-card px-4 py-3">
            <div className="w-3 h-3 bg-cyan-400 rounded-full animate-pulse" />
            <div className="text-sm text-gray-300">
              Complete <span className="text-cyan-400 font-semibold">{progress.totalLessons - progress.completedLessons}</span> more modules to unlock certificate
            </div>
          </div>
          
          {/* Mini Progress */}
          <div className="mt-4 flex items-center justify-between text-xs text-gray-400">
            <span>Current Progress</span>
            <span>{progress.overall}%</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-1.5 mt-1">
            <div 
              className="h-1.5 rounded-full bg-gradient-to-r from-cyan-500 to-purple-500 transition-all duration-1000"
              style={{ width: `${progress.overall}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* Floating Elements */}
      <div className="absolute -top-2 -right-2 w-4 h-4 border-2 border-cyan-400/30 rounded-full animate-ping" />
      <div className="absolute -bottom-2 -left-2 w-3 h-3 border-2 border-purple-400/30 rounded animate-pulse" style={{ animationDelay: '1s' }} />
    </div>
  );
}