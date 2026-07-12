import React, { useEffect, useRef, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { gsap } from 'gsap';
import { Menu, Leaf, Bell } from 'lucide-react';
import useAuthStore from './store/authStore';
import useNotificationStore from './store/notificationStore';
import { socket } from './lib/socket';
import api from './lib/api';

// Components
import Sidebar from './components/Sidebar';
import NotificationBell from './components/NotificationBell';
import { SectionContextBar } from './components/SectionContextBar';

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

/* ═══════════════════════════════════════════════
   Page transition wrapper — GSAP fade+slide
   ═══════════════════════════════════════════════ */
const PageTransition: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const ref = useRef<HTMLDivElement>(null);
  const location = useLocation();

  useEffect(() => {
    if (!ref.current) return;
    gsap.fromTo(
      ref.current,
      { opacity: 0, y: 18 },
      { opacity: 1, y: 0, duration: 0.42, ease: 'power3.out', clearProps: 'transform' },
    );
  }, [location.pathname]);

  return (
    <div ref={ref} className="page-transition-wrapper">
      {children}
    </div>
  );
};

/* ═══════════════════════════════════════════════
   Mobile Topbar
   ═══════════════════════════════════════════════ */
const MobileTopbar: React.FC<{
  onHamburgerClick: () => void;
  onNotificationsClick: () => void;
  unreadCount: number;
}> = ({ onHamburgerClick, onNotificationsClick, unreadCount }) => {
  const topbarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    gsap.fromTo(
      topbarRef.current,
      { y: -56, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.5, ease: 'power3.out' },
    );
  }, []);

  return (
    <div ref={topbarRef} className="mobile-topbar">
      <button className="topbar-hamburger" onClick={onHamburgerClick} id="mobile-hamburger-btn">
        <Menu size={20} />
      </button>

      <div className="topbar-brand">
        <div style={{
          width: 26,
          height: 26,
          borderRadius: 7,
          background: 'linear-gradient(135deg, var(--env) 0%, #16a34a 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}>
          <Leaf size={14} color="#000" />
        </div>
        <span style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'var(--text-base)',
          fontWeight: 800,
          letterSpacing: '-0.025em',
          background: 'linear-gradient(135deg, #f1f5f9 40%, #94a3b8 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}>
          EcoSphere
        </span>
      </div>

      <button
        onClick={onNotificationsClick}
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 38,
          height: 38,
          borderRadius: 8,
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid var(--border)',
          cursor: 'pointer',
          color: 'var(--text-secondary)',
          transition: 'background 0.15s ease',
        }}
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute',
            top: 5,
            right: 5,
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: 'var(--severity-high)',
            border: '2px solid var(--bg-primary)',
          }} />
        )}
      </button>
    </div>
  );
};

/* ═══════════════════════════════════════════════
   Protected Route
   ═══════════════════════════════════════════════ */
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
};

/* ═══════════════════════════════════════════════
   Authenticated App Shell
   ═══════════════════════════════════════════════ */
const AuthenticatedLayout: React.FC = () => {
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const user = useAuthStore((state) => state.user);
  const fetchCurrentUser = useAuthStore((state) => state.fetchCurrentUser);
  const setNotifications = useNotificationStore((state) => state.setNotifications);
  const addNotification = useNotificationStore((state) => state.addNotification);
  const unreadCount = useNotificationStore((state) => state.unreadCount);

  // Reset mobile sidebar when resizing to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768 && mobileSidebarOpen) {
        setMobileSidebarOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [mobileSidebarOpen]);

  // Socket.IO + initial notifications
  useEffect(() => {
    if (!user) return;

    socket.connect();
    fetchCurrentUser();

    const fetchNotifications = async () => {
      try {
        const list: any = await api.get('/notifications');
        setNotifications(list);
      } catch (err) {
        console.error('Failed to fetch initial notifications', err);
      }
    };
    fetchNotifications();

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
  }, [user?.id, setNotifications, addNotification]);

  // Close mobile sidebar on route change
  const handleMobileClose = () => setMobileSidebarOpen(false);

  return (
    <div className="app-shell">
      {/* Mobile Topbar (visible < 768px) */}
      <MobileTopbar
        onHamburgerClick={() => setMobileSidebarOpen((s) => !s)}
        onNotificationsClick={() => setNotificationsOpen((s) => !s)}
        unreadCount={unreadCount}
      />

      {/* Sidebar */}
      <Sidebar
        toggleNotifications={() => setNotificationsOpen((s) => !s)}
        isMobileOpen={mobileSidebarOpen}
        onMobileClose={handleMobileClose}
      />

      {/* Main Content */}
      <main className="page-layout">
        <div className="page-content">
          <SectionContextBar />
          <PageTransition>
            <Routes>
              <Route path="/"               element={<DashboardPage />} />
              <Route path="/environmental/*" element={<EnvironmentalPage />} />
              <Route path="/social/*"        element={<SocialPage />} />
              <Route path="/governance/*"    element={<GovernancePage />} />
              <Route path="/gamification/*"  element={<GamificationPage />} />
              <Route path="/reports"         element={<ReportsPage />} />
              <Route path="/settings"        element={<SettingsPage />} />
              <Route path="*"               element={<Navigate to="/" replace />} />
            </Routes>
          </PageTransition>
        </div>
      </main>

      {/* Floating Notifications Drawer */}
      <NotificationBell
        isOpen={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
      />
    </div>
  );
};

/* ═══════════════════════════════════════════════
   Root App
   ═══════════════════════════════════════════════ */
export const App: React.FC = () => {
  return (
    <Router>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#ffffff',
            color: '#19350C',
            border: '1px solid rgba(25, 53, 12, 0.12)',
            borderRadius: '12px',
            fontSize: 'var(--text-sm)',
            fontFamily: 'var(--font-body)',
            boxShadow: '0 8px 30px rgba(25, 53, 12, 0.08)',
            padding: '12px 16px',
          },
          success: {
            iconTheme: { primary: '#22c55e', secondary: '#fff' },
          },
          error: {
            iconTheme: { primary: '#ef4444', secondary: '#fff' },
          },
        }}
      />
      <Routes>
        <Route path="/login"    element={<LoginPage />} />
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
