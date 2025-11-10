import { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { uploadAPI } from '../services/api';

/**
 * Video Debugger Component
 * Use this to troubleshoot video upload and playback issues
 * Add this to your InstructorDashboard temporarily
 */
export default function VideoDebugger({ courseId, lessons }) {
  const [debugInfo, setDebugInfo] = useState({});
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState([]);

  useEffect(() => {
    runDiagnostics();
  }, [courseId, lessons]);

  const addResult = (test, status, message, details = null) => {
    setResults(prev => [...prev, { 
      test, 
      status, 
      message, 
      details,
      timestamp: new Date().toISOString() 
    }]);
  };

  const runDiagnostics = async () => {
    setTesting(true);
    setResults([]);

    try {
      // Test 1: Check Authentication
      addResult('Authentication', 'testing', 'Checking user session...');
      const { data: { session }, error: authError } = await supabase.auth.getSession();
      
      if (authError || !session) {
        addResult('Authentication', 'error', 'No active session found', authError);
        return;
      }
      
      addResult('Authentication', 'success', `User authenticated: ${session.user.email}`, {
        userId: session.user.id,
        hasToken: !!session.access_token
      });

      // Test 2: Check Course Access
      if (courseId) {
        addResult('Course Access', 'testing', 'Verifying course ownership...');
        
        try {
          const response = await fetch(`http://localhost:5000/api/courses/${courseId}`, {
            headers: {
              'Authorization': `Bearer ${session.access_token}`
            }
          });
          
          if (response.ok) {
            const data = await response.json();
            addResult('Course Access', 'success', 'Course data retrieved', {
              courseId: data.course.id,
              lessonsCount: data.course.lessons?.length || 0
            });
          } else {
            addResult('Course Access', 'error', `HTTP ${response.status}`, await response.text());
          }
        } catch (error) {
          addResult('Course Access', 'error', 'Failed to fetch course', error.message);
        }
      }

      // Test 3: Check Lessons Data
      if (lessons && lessons.length > 0) {
        addResult('Lessons Data', 'testing', 'Analyzing lessons...');
        
        const lessonsWithVideo = lessons.filter(l => l.video_path);
        const lessonsWithoutVideo = lessons.filter(l => !l.video_path);
        
        addResult('Lessons Data', 'success', `Found ${lessons.length} lessons`, {
          total: lessons.length,
          withVideo: lessonsWithVideo.length,
          withoutVideo: lessonsWithoutVideo.length,
          lessonIds: lessons.map(l => ({ id: l.id, hasVideo: !!l.video_path }))
        });

        // Test 4: Check Storage Bucket
        if (lessonsWithVideo.length > 0) {
          addResult('Storage Access', 'testing', 'Checking storage bucket...');
          
          try {
            const testResponse = await fetch('http://localhost:5000/api/upload/test-storage', {
              headers: {
                'Authorization': `Bearer ${session.access_token}`
              }
            });
            
            if (testResponse.ok) {
              const storageData = await testResponse.json();
              addResult('Storage Access', 'success', 'Storage bucket accessible', storageData);
            } else {
              addResult('Storage Access', 'error', 'Storage check failed', await testResponse.text());
            }
          } catch (error) {
            addResult('Storage Access', 'error', 'Storage request failed', error.message);
          }

          // Test 5: Try to get signed URL for first video
          const firstVideoLesson = lessonsWithVideo[0];
          addResult('Video Streaming', 'testing', `Testing video access for lesson ${firstVideoLesson.id}...`);
          
          try {
            const streamResponse = await uploadAPI.getStreamUrl(firstVideoLesson.id);
            addResult('Video Streaming', 'success', 'Signed URL generated', {
              lessonId: firstVideoLesson.id,
              hasSignedUrl: !!streamResponse.signedUrl,
              expiresIn: streamResponse.expiresIn
            });
          } catch (error) {
            addResult('Video Streaming', 'error', 'Failed to get signed URL', error.message);
          }
        }
      } else {
        addResult('Lessons Data', 'warning', 'No lessons found', null);
      }

      // Test 6: Backend Connectivity
      addResult('Backend API', 'testing', 'Testing backend connection...');
      try {
        const healthResponse = await fetch('http://localhost:5000/api/health');
        if (healthResponse.ok) {
          const health = await healthResponse.json();
          addResult('Backend API', 'success', 'Backend is responding', health);
        } else {
          addResult('Backend API', 'error', 'Backend unhealthy', await healthResponse.text());
        }
      } catch (error) {
        addResult('Backend API', 'error', 'Cannot reach backend', error.message);
      }

    } catch (error) {
      addResult('Diagnostics', 'error', 'Diagnostic failed', error.message);
    } finally {
      setTesting(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'success': return '✅';
      case 'error': return '❌';
      case 'warning': return '⚠️';
      case 'testing': return '🔄';
      default: return '📋';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'success': return 'bg-green-50 border-green-200 text-green-800';
      case 'error': return 'bg-red-50 border-red-200 text-red-800';
      case 'warning': return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'testing': return 'bg-blue-50 border-blue-200 text-blue-800';
      default: return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  return (
    <div className="bg-white rounded-lg border-2 border-purple-200 p-6 mb-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-purple-900">🔍 Video System Debugger</h3>
        <button
          onClick={runDiagnostics}
          disabled={testing}
          className="bg-purple-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50"
        >
          {testing ? 'Running Tests...' : 'Run Diagnostics'}
        </button>
      </div>

      {results.length > 0 && (
        <div className="space-y-3">
          {results.map((result, index) => (
            <div
              key={index}
              className={`border rounded-lg p-4 ${getStatusColor(result.status)}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="text-xl">{getStatusIcon(result.status)}</span>
                    <span className="font-semibold">{result.test}</span>
                  </div>
                  <p className="text-sm">{result.message}</p>
                  {result.details && (
                    <details className="mt-2">
                      <summary className="text-xs cursor-pointer hover:underline">
                        View Details
                      </summary>
                      <pre className="text-xs mt-2 p-2 bg-black bg-opacity-10 rounded overflow-x-auto">
                        {JSON.stringify(result.details, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
                <span className="text-xs opacity-60 ml-2">
                  {new Date(result.timestamp).toLocaleTimeString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {!testing && results.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <p className="text-4xl mb-2">🔧</p>
          <p>Click "Run Diagnostics" to test your video system</p>
        </div>
      )}

      {/* Quick Fix Guide */}
      <div className="mt-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
        <p className="font-semibold text-purple-900 mb-2">Quick Fixes:</p>
        <ul className="text-sm text-purple-800 space-y-1 list-disc list-inside">
          <li><strong>401 Unauthorized:</strong> Refresh page or log out and back in</li>
          <li><strong>Lesson ID undefined:</strong> Ensure lesson has valid ID in database</li>
          <li><strong>No signed URL:</strong> Check Supabase storage bucket exists</li>
          <li><strong>Video not found:</strong> Re-upload the video file</li>
          <li><strong>Backend errors:</strong> Check backend console logs</li>
        </ul>
      </div>
    </div>
  );
}