import axios from 'axios';
import { TOKEN_STORAGE_KEY } from '../utils/constants.js';

const baseURL = import.meta.env?.VITE_API_URL || 'http://localhost:5000/api';

/**
 * Standardized Axios Instance
 * - Base URL from environment variable VITE_API_URL (default: http://localhost:5000/api)
 * - Request interceptor automatically attaches JWT token
 * - Response interceptor handles 401 Unauthorized (clears session and dispatches event)
 * - Explicitly does NOT automatically logout on 403 Forbidden
 * - No sensitive hardcoded credentials
 */
const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Request Interceptor: Attach JWT token if present
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: Handle status codes
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    const status = error.response ? error.response.status : null;

    if (status === 401) {
      // Clear token when session is invalid or expired
      localStorage.removeItem(TOKEN_STORAGE_KEY);

      // Notify AuthContext via custom event so the application state updates reactively
      window.dispatchEvent(new CustomEvent('auth:unauthorized'));
    }

    // IMPORTANT RULE: Do NOT automatically log out on 403 (Forbidden)
    // 403 means the user is authenticated but lacks permission for that specific resource.

    return Promise.reject(error);
  }
);

export default api;
