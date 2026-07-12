import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import useAuthStore from './store/authStore';
import useNotificationStore from './store/notificationStore';
import { socket } from './lib/socket';
import api from './lib/api';

// Components
import Sidebar from './components/Sidebar';
import NotificationBell from './components/NotificationBell';

// Pages
import LoginPage from './pages/Auth/LoginPage';
import RegisterPage from './pages/Auth/RegisterPage';
import DashboardPage from './pages/Dashboard/DashboardPage';
import EnvironmentalPage from './pages/Environmental/EnvironmentalPage';
import SocialPage from './pages/Social/SocialPage';
import GovernancePage from './pages/Governance/GovernancePage';
import GamificationPage from './pages/Gamification/GamificationPage';
import ReportsPage from './pages/Reports/ReportsPage';
import SettingsPage from './pages/Settings/SettingsPage';

// Protected Route Wrapper
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
};

// Main Layout Wrapper for Authenticated Users
const AuthenticatedLayout: React.FC = () => {
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const user = useAuthStore((state) => state.user);
  const setNotifications = useNotificationStore((state) => state.setNotifications);
  const addNotification = useNotificationStore((state) => state.addNotification);

  // Initialize Socket.IO and Notifications load
  useEffect(() => {
    if (!user) return;

    // Connect socket
    socket.connect();

    // Fetch initial notifications
    const fetchNotifications = async () => {
      try {
        const list: any = await api.get('/notifications');
        setNotifications(list);
      } catch (err) {
        console.error('Failed to fetch initial notifications', err);
      }
    };
    fetchNotifications();

    // Listen to real-time events
    socket.on('notification:new', (notification) => {
      console.log('[Socket] New notification received:', notification);
      addNotification(notification);
    });

    socket.on('badge:awarded', (data) => {
      console.log('[Socket] Badge awarded:', data);
    });

    return () => {
      socket.off('notification:new');
      socket.off('badge:awarded');
      socket.disconnect();
    };
  }, [user, setNotifications, addNotification]);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-primary)' }}>
      {/* Sidebar Panel */}
      <Sidebar toggleNotifications={() => setNotificationsOpen(!notificationsOpen)} />
      
      {/* Main Content Area */}
      <div className="page-layout">
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/environmental/*" element={<EnvironmentalPage />} />
          <Route path="/social/*" element={<SocialPage />} />
          <Route path="/governance/*" element={<GovernancePage />} />
          <Route path="/gamification/*" element={<GamificationPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>

      {/* Floating Notifications Drawer */}
      <NotificationBell isOpen={notificationsOpen} onClose={() => setNotificationsOpen(false)} />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <Router>
      {/* Global Toast Alerts */}
      <Toaster 
        position="top-right"
        toastOptions={{
          style: {
            background: 'var(--bg-card)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            fontSize: 'var(--text-sm)',
            fontFamily: "'Inter', sans-serif"
          },
          success: {
            iconTheme: {
              primary: 'var(--env)',
              secondary: '#000',
            },
          },
          error: {
            iconTheme: {
              primary: 'var(--severity-high)',
              secondary: '#fff',
            },
          },
        }}
      />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route 
          path="/*" 
          element={
            <ProtectedRoute>
              <AuthenticatedLayout />
            </ProtectedRoute>
          } 
        />
      </Routes>
    </Router>
  );
};

export default App;
