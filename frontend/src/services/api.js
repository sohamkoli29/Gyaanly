import { supabase } from './supabaseClient';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// Helper to get current session token
const getToken = async () => {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) {
      console.error('Error getting session:', error);
      return null;
    }
    return session?.access_token || null;
  } catch (error) {
    console.error('Exception getting token:', error);
    return null;
  }
};

// Generic API request function
const apiRequest = async (endpoint, options = {}) => {
  try {
    const token = await getToken();
    
    // Log for debugging
    console.log(`API Request: ${endpoint}`, { 
      hasToken: !!token,
      method: options.method || 'GET'
    });
    
    if (!token) {
      throw new Error('Access token required');
    }
    
    const config = {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers,
      },
    };

    // Add body for non-GET requests
    if (options.body && typeof options.body === 'object') {
      config.body = JSON.stringify(options.body);
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    
    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch (parseError) {
        errorData = { error: `HTTP error! status: ${response.status}` };
      }
      throw new Error(errorData.error || `Request failed with status ${response.status}`);
    }

    // Try to parse response as JSON
    try {
      return await response.json();
    } catch (jsonError) {
      console.error('JSON parse error:', jsonError);
      throw new Error('Invalid JSON response from server');
    }
  } catch (error) {
    console.error('API Request Error:', error);
    throw error;
  }
};

// Auth API calls
export const authAPI = {
  getProfile: () => apiRequest('/auth/profile'),
  
  updateProfile: (profileData) => 
    apiRequest('/auth/profile', {
      method: 'PUT',
      body: profileData,
    }),
  
  getUsers: () => apiRequest('/auth/users'),
};

// Upload API calls
export const uploadAPI = {
  // Get signed URL for video upload
  getSignedUrl: (uploadData) =>
    apiRequest('/upload/signed-url', {
      method: 'POST',
      body: uploadData,
    }),

  // Confirm video upload
  confirmUpload: (confirmData) =>
    apiRequest('/upload/confirm-upload', {
      method: 'POST',
      body: confirmData,
    }),

  // Get signed URL for video streaming - FIXED
  getStreamUrl: async (lessonId) => {
    // Validate lessonId
    if (!lessonId || lessonId === 'undefined' || lessonId === 'null') {
      throw new Error('Invalid lesson ID');
    }
    
    // Use apiRequest which handles token automatically
    return apiRequest(`/upload/stream/${lessonId}`);
  },
  
  // Test storage access
  testStorage: () => apiRequest('/upload/test-storage'),
};

// Course API calls
export const coursesAPI = {
  // Get all published courses
  getCourses: () => apiRequest('/courses'),
  
  // Get single course by ID
  getCourse: (id) => apiRequest(`/courses/${id}`),
  
  // Create new course
  createCourse: (courseData) => 
    apiRequest('/courses', {
      method: 'POST',
      body: courseData,
    }),
  
  // Update course
  updateCourse: (id, courseData) => 
    apiRequest(`/courses/${id}`, {
      method: 'PUT',
      body: courseData,
    }),
  
  // Delete course
  deleteCourse: (id) => 
    apiRequest(`/courses/${id}`, {
      method: 'DELETE',
    }),
  
  // Get instructor's courses
  getMyCourses: () => apiRequest('/courses/instructor/my-courses'),

  // Lesson management
  createLesson: (courseId, lessonData) =>
    apiRequest(`/courses/${courseId}/lessons`, {
      method: 'POST',
      body: lessonData,
    }),

  updateLesson: (lessonId, lessonData) =>
    apiRequest(`/courses/lessons/${lessonId}`, {
      method: 'PUT',
      body: lessonData,
    }),

  deleteLesson: (lessonId) =>
    apiRequest(`/courses/lessons/${lessonId}`, {
      method: 'DELETE',
    }),
};

// Progress API calls
export const progressAPI = {
  // Update lesson progress
  updateProgress: (progressData) =>
    apiRequest('/enrollments/progress', {
      method: 'POST',
      body: progressData,
    }),

  // Get course progress
  getCourseProgress: (courseId) =>
    apiRequest(`/enrollments/progress/${courseId}`),
  checkCertificateEligibility: (courseId) =>
    apiRequest(`/enrollments/certificate/${courseId}`),
  
  // Mark lesson as completed
  completeLesson: (courseId, lessonId) =>
    apiRequest('/enrollments/complete-lesson', {
      method: 'POST',
      body: {
        course_id: courseId,
        lesson_id: lessonId
      }
    }),

  // Get detailed progress analytics
  getProgressAnalytics: (courseId) =>
    apiRequest(`/enrollments/analytics/${courseId}`)

};

// Enrollment API calls
export const enrollmentsAPI = {
  // Enroll in a course
  enroll: (courseId) => 
    apiRequest('/enrollments', {
      method: 'POST',
      body: { course_id: courseId },
    }),
  
  // Get user's enrolled courses
  getMyEnrollments: () => apiRequest('/enrollments/my-courses'),
  
  // Check if enrolled in a course
  checkEnrollment: (courseId) => apiRequest(`/enrollments/check/${courseId}`),
};

// Quiz API calls
export const quizAPI = {
  // Get quiz for a course

   getQuizByCourse: async (courseId) => {
    try {
      const response = await apiRequest(`/quizzes/course/${courseId}`);
      
      console.log('Quiz API Response:', response);
      
      // Handle the case where quiz is null (no quiz exists)
      if (response.quiz === null) {
        throw new Error('NO_QUIZ_FOUND');
      }
      
      return response;
    } catch (error) {
      console.log('Quiz fetch error details:', {
        courseId,
        errorMessage: error.message,
        errorType: error.message.includes('NO_QUIZ_FOUND') ? 'NO_QUIZ' : 'OTHER_ERROR'
      });
      
      // If it's a "no quiz found" case, re-throw with specific message
      if (error.message.includes('NO_QUIZ_FOUND')) {
        throw new Error('NO_QUIZ_FOUND');
      }
      throw error;
    }
  },
  // Submit quiz attempt
  submitQuizAttempt: (quizId, attemptData) => 
    apiRequest(`/quizzes/${quizId}/attempt`, {
      method: 'POST',
      body: attemptData,
    }),
  
  // Create quiz
  createQuiz: (courseId, quizData) => 
    apiRequest(`/quizzes/course/${courseId}`, {
      method: 'POST',
      body: quizData,
    }),
  
  // Update quiz
  updateQuiz: (quizId, quizData) => 
    apiRequest(`/quizzes/${quizId}`, {
      method: 'PUT',
      body: quizData,
    }),

  // Delete quiz
  deleteQuiz: (quizId) => 
    apiRequest(`/quizzes/${quizId}`, {
      method: 'DELETE',
    }),
  
  // Get user's quiz attempts
  getQuizAttempts: async (courseId) => {
  try {
    console.log(`📡 Fetching quiz attempts for course: ${courseId}`);
    const response = await apiRequest(`/quizzes/attempts/${courseId}`);
    
    console.log('📊 Quiz attempts API response:', response);
    
    // Handle different response structures
    if (response.attempts !== undefined) {
      return response;
    } else if (Array.isArray(response)) {
      return { attempts: response };
    } else {
      console.warn('⚠️ Unexpected quiz attempts response structure:', response);
      return { attempts: [] };
    }
  } catch (error) {
    console.error('❌ Quiz attempts fetch error:', error);
    
    // If it's a "no attempts" error, return empty array
    if (error.message.includes('No attempts') || error.message.includes('404')) {
      return { attempts: [] };
    }
    throw error;
  }
},
};


// Certificate API calls
export const certificateAPI = {
  // Generate certificate
  generateCertificate: (courseId) =>
    apiRequest('/certificates/generate', {
      method: 'POST',
      body: { course_id: courseId }
    }),

  // Get user's certificates
  getMyCertificates: () => apiRequest('/certificates/my-certificates'),

  // Get certificate by ID
  getCertificate: (certificateId) => apiRequest(`/certificates/${certificateId}`),

  // Verify certificate
  verifyCertificate: (certificateNumber) => 
    apiRequest(`/certificates/verify/${certificateNumber}`),

  // Auto-generate certificate
  autoGenerateCertificate: (courseId) =>
    apiRequest(`/certificates/auto-generate/${courseId}`, {
      method: 'POST'
    })
};

// Payment API calls
export const paymentAPI = {
  // Create payment order
  createOrder: (courseId, amount) =>
    apiRequest('/payments/create-order', {
      method: 'POST',
      body: {
        course_id: courseId,
        amount: amount
      }
    }),

  // Verify payment
  verifyPayment: (paymentData) =>
    apiRequest('/payments/verify-payment', {
      method: 'POST',
      body: paymentData
    }),

  // Get payment history
  getPaymentHistory: () => apiRequest('/payments/history'),

  // Get payment details
  getPayment: (paymentId) => apiRequest(`/payments/${paymentId}`)
};

// Health check
export const healthCheck = () => apiRequest('/health');

// Currency formatting
export const formatCoursePrice = (price) => {
  if (price === 0) return 'Free';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
  }).format(price);
};