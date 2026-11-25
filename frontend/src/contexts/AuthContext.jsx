import React, { createContext, useState, useEffect, useCallback, useMemo } from 'react';
import authService from '../services/auth.service.js';
import { TOKEN_STORAGE_KEY } from '../utils/constants.js';

export const AuthContext = createContext(null);

/**
 * AuthProvider
 * - Manages user, token, authentication status, initialization lifecycle
 * - Integrates with Backend Phase 2 (/api/auth)
 * - Verifies active session on mount via GET /api/auth/me; if verification fails, user is unauthenticated
 * - Does not allow client to self-assign role; role is strictly provided by Backend
 */
export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_STORAGE_KEY));
  const [user, setUser] = useState(null);
  const [isInitializing, setIsInitializing] = useState(true);

  // Logout handler: clears storage and state
  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    setToken(null);
    setUser(null);
  }, []);

  // Fetch / verify current session via GET /api/auth/me
  const refreshProfile = useCallback(async () => {
    const currentToken = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (!currentToken) {
      setUser(null);
      setToken(null);
      setIsInitializing(false);
      return null;
    }

    try {
      const profile = await authService.getProfile();
      
      // Strict check: account must be active
      if (Number(profile.is_active) === 0) {
        console.warn('[AuthContext] Account is deactivated. Session invalidated.');
        localStorage.removeItem(TOKEN_STORAGE_KEY);
        setUser(null);
        setToken(null);
        return null;
      }

      setUser(profile);
      setToken(currentToken);
      return profile;
    } catch (err) {
      // If session verification fails (token expired, malformed, inactive user, etc.)
      // do NOT consider user logged in
      console.warn('[AuthContext] Session verification failed:', err.response?.data?.message || err.message);
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      setUser(null);
      setToken(null);
      return null;
    } finally {
      setIsInitializing(false);
    }
  }, []);

  // Initialize session verification on mount
  useEffect(() => {
    refreshProfile();
  }, [refreshProfile]);

  // Listen for unauthorized 401 events dispatched by Axios interceptor
  useEffect(() => {
    const handleUnauthorized = () => {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      setUser(null);
      setToken(null);
      setIsInitializing(false);
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => {
      window.removeEventListener('auth:unauthorized', handleUnauthorized);
    };
  }, []);

  // Login action
  const login = useCallback(async (credentials) => {
    const data = await authService.login(credentials);
    const { token: receivedToken, user: receivedUser } = data;

    // Reject if account is not active
    if (Number(receivedUser.is_active) === 0) {
      throw new Error('Tài khoản đã bị vô hiệu hóa.');
    }

    localStorage.setItem(TOKEN_STORAGE_KEY, receivedToken);
    setToken(receivedToken);
    setUser(receivedUser);

    return receivedUser;
  }, []);

  // Register action (Role is strictly determined by Backend as BORROWER)
  const register = useCallback(async (formData) => {
    const payload = {
      email: formData.email,
      password: formData.password,
      full_name: formData.full_name,
      phone: formData.phone || null,
    };
    return await authService.register(payload);
  }, []);

  const value = useMemo(() => ({
    user,
    token,
    isAuthenticated: Boolean(token && user),
    isInitializing,
    login,
    register,
    logout,
    refreshProfile,
  }), [user, token, isInitializing, login, register, logout, refreshProfile]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
