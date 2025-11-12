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
      // Check if certificate exists for this course
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
    try {
      await certificateAPI.generateCertificate(courseId);
      setHasCertificate(true);
      alert('Certificate generated successfully!');
    } catch (error) {
      console.error('Error generating certificate:', error);
      alert('Error generating certificate: ' + error.message);
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
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
          <div className="h-2 bg-gray-200 rounded mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold mb-4">Course Progress</h3>
      
      {/* Overall Progress */}
      <div className="mb-6">
        <div className="flex justify-between text-sm mb-2">
          <span>Overall Progress</span>
          <span className="font-semibold">{progress.overall}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div 
            className="bg-green-600 h-3 rounded-full transition-all duration-500"
            style={{ width: `${progress.overall}%` }}
          ></div>
        </div>
        <p className="text-sm text-gray-600 mt-2">
          {progress.completedLessons} of {progress.totalLessons} lessons completed
        </p>
      </div>

      {/* Progress Stats */}
      <div className="grid grid-cols-2 gap-4 text-center mb-6">
        <div className="bg-blue-50 rounded-lg p-3">
          <div className="text-2xl font-bold text-blue-600">{progress.completedLessons}</div>
          <div className="text-sm text-blue-800">Completed</div>
        </div>
        <div className="bg-green-50 rounded-lg p-3">
          <div className="text-2xl font-bold text-green-600">
            {progress.totalLessons > 0 
              ? Math.round((progress.completedLessons / progress.totalLessons) * 100)
              : 0
            }%
          </div>
          <div className="text-sm text-green-800">Completion</div>
        </div>
      </div>

      {/* Certificate Section */}
      {progress.overall >= 100 && (
        <div className="border-t pt-4">
          {hasCertificate ? (
            <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="text-green-600 text-2xl mb-2">🎓</div>
              <h4 className="font-semibold text-green-800 mb-1">Certificate Earned!</h4>
              <p className="text-sm text-green-700 mb-3">
                Congratulations! You've completed this course.
              </p>
              <a 
                href="/my-certificates" 
                className="inline-block bg-green-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-green-700 transition-colors"
              >
                View Certificate
              </a>
            </div>
          ) : (
            <div className="text-center p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <div className="text-yellow-600 text-2xl mb-2">🏆</div>
              <h4 className="font-semibold text-yellow-800 mb-1">Course Completed!</h4>
              <p className="text-sm text-yellow-700 mb-3">
                You've completed all lessons. Generate your certificate now.
              </p>
              <button
                onClick={handleGenerateCertificate}
                className="bg-yellow-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-yellow-700 transition-colors"
              >
                Generate Certificate
              </button>
            </div>
          )}
        </div>
      )}

      {/* Progress towards certificate */}
      {progress.overall < 100 && (
        <div className="text-center text-sm text-gray-600 mt-4">
          Complete all lessons to earn your certificate
        </div>
      )}
    </div>
  );
}