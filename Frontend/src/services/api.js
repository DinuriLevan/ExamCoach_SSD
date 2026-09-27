// API Base URL
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://examcoach-backend-mnoy.onrender.com';

// Helper function to get auth token
const getAuthToken = () => localStorage.getItem('token');

// Helper function to check if token is expired
const isTokenExpired = (token) => {
  if (!token) return true;

  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const currentTime = Date.now() / 1000;
    return payload.exp < currentTime;
  } catch (error) {
    return true; // If we can't parse the token, consider it expired
  }
};

// Helper function to handle logout
const handleLogout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = '/login'; // Redirect to login
};

// Check if user is authenticated
export const isAuthenticated = () => {
  const token = getAuthToken();
  return token && !isTokenExpired(token);
};

// Get current user data
export const getCurrentUser = () => {
  const userData = localStorage.getItem('user');
  return userData ? JSON.parse(userData) : null;
};

// Logout function
export const logout = () => {
  handleLogout();
};

// Helper function for API requests
const apiRequest = async (endpoint, options = {}) => {
  const token = getAuthToken();
  
  // DEBUG: Log token status
  console.log(`[API] ${options.method || 'GET'} ${endpoint} — Token: ${token ? token.substring(0, 20) + '...' : 'NONE'}`);

  const defaultHeaders = {
    ...(token && { 'Authorization': `Bearer ${token}` })
  };

  const { headers: optionHeaders, ...restOptions } = options;

  const config = {
    ...restOptions,
    headers: {
      ...defaultHeaders,
      ...optionHeaders
    }
  };

  // DEBUG: Log final headers
  console.log('[API] Final headers:', JSON.stringify(config.headers));

  const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

  if (response.status === 401) {
    // Only auto-logout if this wasn't a login/register attempt
    const isAuthEndpoint = endpoint.startsWith('/api/auth/login') || 
                            endpoint.startsWith('/api/auth/register');
    if (!isAuthEndpoint) {
      console.warn('401 Unauthorized on', endpoint);
    }
    const errorData = await response.json().catch(() => ({ error: 'Unauthorized' }));
    throw new Error(errorData.error || 'Unauthorized');
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Network error' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
};

// Auth API calls
export const authAPI = {
  login: (credentials) => apiRequest('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials)
  }),

  registerStudent: (studentData) => apiRequest('/api/auth/register-student', {
    method: 'POST',
    body: studentData // FormData for file uploads
  }),

  addTeacher: (teacherData) => apiRequest('/api/auth/add-teacher', {
    method: 'POST',
    body: teacherData // FormData for file uploads
  }),

  getMe: () => apiRequest('/api/auth/me')
};

// Kuppi API calls
export const kuppiAPI = {
  // Get all kuppi sessions
  getKuppis: () => apiRequest('/api/kuppi'),

  // Get single kuppi session
  getKuppi: (id) => apiRequest(`/api/kuppi/${id}`),

  // Upload kuppi session with files
  uploadKuppi: (formData) => apiRequest('/api/kuppi', {
    method: 'POST',
    body: formData // FormData with files
  }),

  // Update kuppi session
  updateKuppi: (id, updateData) => apiRequest(`/api/kuppi/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updateData)
  }),

  // Delete kuppi session
  deleteKuppi: (id) => apiRequest(`/api/kuppi/${id}`, {
    method: 'DELETE'
  })
};

// Quiz API calls
export const quizAPI = {
  // Get all quizzes
  getQuizzes: () => apiRequest('/api/quizzes'),

  // Get single quiz
  getQuiz: (id) => apiRequest(`/api/quizzes/${id}`),

  // Get single quiz with credentials (for teacher editing)
  getQuizFull: (id) => apiRequest(`/api/quizzes/${id}?includeCredentials=true`),

  // Create quiz
  createQuiz: (quizData) => apiRequest('/api/quizzes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(quizData)
  }),

  // Update quiz
  updateQuiz: (id, updateData) => apiRequest(`/api/quizzes/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updateData)
  }),

  // Delete quiz
  deleteQuiz: (id) => apiRequest(`/api/quizzes/${id}`, {
    method: 'DELETE'
  }),

  // Submit quiz attempt
  submitQuizAttempt: (quizId, attemptData) => apiRequest(`/api/quizzes/${quizId}/attempt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(attemptData)
  }),

  // Verify quiz access (enrollment key + password)
  verifyQuizAccess: (quizId, credentials) => apiRequest(`/api/quizzes/${quizId}/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials)
  }),

  // Enroll by enrollment key — finds the quiz automatically (no quiz ID needed)
  // Used by the StudentQuizzes enrollment form
  enrollToQuiz: (credentials) => apiRequest('/api/quizzes/enroll', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials)
  }),

  // Get student's quiz attempts
  getStudentAttempts: () => apiRequest('/api/quizzes/attempts'),

  // Get all attempts for a specific quiz (teacher view)
  getQuizAttempts: (quizId) => apiRequest(`/api/quizzes/${quizId}/attempts`),

  // Get student attempt count for a specific quiz
  getMyAttemptsForQuiz: (quizId) => apiRequest(`/api/quizzes/${quizId}/my-attempts`)
};

// Teacher API calls
export const teacherAPI = {
  getTeachers: () => apiRequest('/api/teachers'),
  getTeacher: (id) => apiRequest(`/api/teachers/${id}`),
  updateTeacher: (id, updateData) => apiRequest(`/api/teachers/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updateData)
  }),
  deleteTeacher: (id) => apiRequest(`/api/teachers/${id}`, {
    method: 'DELETE'
  })
};

// Student API calls
export const studentAPI = {
  getStudents: () => apiRequest('/api/students'),
  getStudent: (id) => apiRequest(`/api/students/${id}`),
  updateStudent: (id, updateData) => apiRequest(`/api/students/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updateData)
  }),
  deleteStudent: (id) => apiRequest(`/api/students/${id}`, {
    method: 'DELETE'
  })
};

export default {
  authAPI,
  kuppiAPI,
  quizAPI,
  teacherAPI,
  studentAPI
};