import React from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header.jsx';
import Sidebar from './Sidebar.jsx';

export function MainLayout() {
  return (
    <div className="app-layout">
      <Sidebar />
      <div className="app-main-wrapper">
        <Header />
        <main className="app-content">
          <div className="content-container">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

export default MainLayout;
