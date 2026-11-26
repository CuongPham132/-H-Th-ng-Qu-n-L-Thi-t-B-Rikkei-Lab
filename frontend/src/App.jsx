import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import AppRoutes from './routes/AppRoutes';

// CSS Stylesheets (Pure CSS, Navy/Blue theme, No external UI framework)
import './styles/variables.css';
import './styles/base.css';
import './styles/layout.css';
import './styles/auth.css';
import './styles/components.css';

export function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}

export default App;
