import { useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext.jsx';

/**
 * Custom hook to access AuthContext
 * @returns {{
 *   user: Object|null,
 *   token: string|null,
 *   isAuthenticated: boolean,
 *   isInitializing: boolean,
 *   login: Function,
 *   register: Function,
 *   logout: Function,
 *   refreshProfile: Function
 * }}
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default useAuth;
