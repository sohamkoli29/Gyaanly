import { supabase } from './supabaseClient';

const API_BASE_URL = 'http://localhost:5000/api';

// Helper to get current session token
const getToken = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token;
};

// Generic API request function
const apiRequest = async (endpoint, options = {}) => {
  try {
    const token = await getToken();
    
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
      ...options,
    };

    // Add body for non-GET requests
    if (options.body && typeof options.body === 'object') {
      config.body = JSON.stringify(options.body);
    }

    console.log(`API Request: ${endpoint}`, { 
      token: !!token,
      method: config.method,
      body: config.body 
    });

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

// ... existing code ...

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
};

export const formatCoursePrice = (price) => {
  if (price === 0) return 'Free';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
  }).format(price);
};

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



export const healthCheck = () => apiRequest('/health');