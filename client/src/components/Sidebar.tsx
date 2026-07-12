import React, { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Leaf, Users, Shield, Trophy,
  FileBarChart, Settings, LogOut, ChevronDown, Bell, X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { gsap } from 'gsap';
import useAuthStore from '../store/authStore';
import useNotificationStore from '../store/notificationStore';

import {
  Sidebar as AcetSidebar,
  DesktopSidebar,
  useSidebar,
} from './ui/sidebar';

interface SidebarProps {
  toggleNotifications: () => void;
  isMobileOpen: boolean;
  onMobileClose: () => void;
}

/* ─── Section definition ─── */
interface NavSection {
  id: string;
  label: string;
  color: string;
  accentRgb: string;
  icon: React.ReactNode;
  links: { label: string; to: string }[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    id: 'env',
    label: 'Environmental',
    color: 'var(--env)',
    accentRgb: '74, 90, 53',
    icon: <Leaf size={17} />,
    links: [
      { label: 'Emission Factors', to: '/environmental/factors' },
      { label: 'Carbon Log',       to: '/environmental/transactions' },
      { label: 'Reduction Goals',  to: '/environmental/goals' },
    ],
  },
  {
    id: 'social',
    label: 'Social',
    color: 'var(--social)',
    accentRgb: '107, 114, 73',
    icon: <Users size={17} />,
    links: [
      { label: 'CSR Activities', to: '/social/activities' },
      { label: 'Approval Queue', to: '/social/approvals' },
    ],
  },
  {
    id: 'gov',
    label: 'Governance',
    color: 'var(--gov)',
    accentRgb: '138, 118, 80',
    icon: <Shield size={17} />,
    links: [
      { label: 'Policies',          to: '/governance/policies' },
      { label: 'Audits',            to: '/governance/audits' },
      { label: 'Compliance Issues', to: '/governance/issues' },
    ],
  },
  {
    id: 'gamify',
    label: 'Gamification',
    color: 'var(--gamify)',
    accentRgb: '192, 137, 90',
    icon: <Trophy size={17} />,
    links: [
      { label: 'Challenges',       to: '/gamification/challenges' },
      { label: 'My Badges',        to: '/gamification/badges' },
      { label: 'Reward Shop',      to: '/gamification/rewards' },
      { label: 'Live Leaderboard', to: '/gamification/leaderboard' },
    ],
  },
];

/* ═══════════════════════════════════════════════
   Main Sidebar export
   ═══════════════════════════════════════════════ */
export const Sidebar: React.FC<SidebarProps> = ({ toggleNotifications, isMobileOpen, onMobileClose }) => {
  return (
    <AcetSidebar animate={true}>
      <SidebarInner
        toggleNotifications={toggleNotifications}
        isMobileOpen={isMobileOpen}
        onMobileClose={onMobileClose}
      />
    </AcetSidebar>
  );
};

/* ─── Inner component that can read useSidebar() ─── */
const SidebarInner: React.FC<SidebarProps> = ({ toggleNotifications, isMobileOpen, onMobileClose }) => {
  const { user, logout } = useAuthStore();
  const { unreadCount } = useNotificationStore();
  const navigate = useNavigate();
  const location = useLocation();
  const { open } = useSidebar();

  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    env: true, social: true, gov: true, gamify: true,
  });

  const toggleSection = (id: string) =>
    setOpenSections((s) => ({ ...s, [id]: !s[id] }));

  const handleLogout = () => { logout(); navigate('/login'); };

  const logoRef  = useRef<HTMLDivElement>(null);
  const navRef   = useRef<HTMLUListElement>(null);
  const footerRef = useRef<HTMLDivElement>(null);

  /* Entrance animation */
  useEffect(() => {
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
    tl.fromTo(logoRef.current, { opacity: 0, y: -16 }, { opacity: 1, y: 0, duration: 0.5 });
    if (navRef.current) {
      const items = navRef.current.querySelectorAll('.sidebar-nav-item');
      tl.fromTo(items, { opacity: 0, x: -18 }, { opacity: 1, x: 0, duration: 0.4, stagger: 0.04, ease: 'power2.out' }, '-=0.25');
    }
    tl.fromTo(footerRef.current, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.4 }, '-=0.2');
  }, []);

  const content = (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* ── Brand Logo ── */}
      <div
        ref={logoRef}
        style={{
          padding: '1.4rem 1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: open ? 'space-between' : 'center',
          borderBottom: '1px solid var(--border)',
          overflow: 'hidden',
          transition: 'justify-content 0.3s ease',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: open ? '0.625rem' : 0, overflow: 'hidden' }}>
          <div style={{
            width: 32, height: 32, borderRadius: 9, flexShrink: 0,
            background: 'linear-gradient(135deg, var(--env) 0%, #16a34a 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 16px var(--env-glow)',
          }}>
            <Leaf size={17} color="#000" />
          </div>
          <AnimatePresence>
            {open && (
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.22, ease: 'easeInOut' }}
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 'var(--text-lg)',
                  fontWeight: 800,
                  letterSpacing: '-0.03em',
                  background: 'linear-gradient(135deg, #f1f5f9 40%, #94a3b8 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                }}
              >
                EcoSphere
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {/* Mobile close button */}
        {isMobileOpen && (
          <button
            onClick={onMobileClose}
            style={{
              padding: 4, borderRadius: 6,
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid var(--border)',
              color: 'var(--text-muted)', cursor: 'pointer',
            }}
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* ── Navigation ── */}
      <nav style={{ flex: 1, padding: '0.75rem 0.5rem', overflowY: 'auto', overflowX: 'hidden' }}>
        <ul ref={navRef} style={{ listStyle: 'none' }}>

          {/* Dashboard */}
          <li className="sidebar-nav-item" style={{ marginBottom: 2 }}>
            <NavLink
              to="/"
              end
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: '0.625rem',
                padding: '0.55rem 0.75rem',
                borderRadius: 9,
                color: isActive ? '#fff' : 'var(--text-secondary)',
                background: isActive ? 'rgba(255,255,255,0.07)' : 'transparent',
                fontWeight: isActive ? 600 : 500,
                fontSize: 'var(--text-sm)',
                fontFamily: 'var(--font-body)',
                transition: 'all 0.18s ease',
                boxShadow: isActive ? '0 0 0 1px rgba(255,255,255,0.08) inset' : 'none',
                textDecoration: 'none',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                justifyContent: open ? 'flex-start' : 'center',
              })}
            >
              <span style={{ display: 'flex', flexShrink: 0 }}><LayoutDashboard size={17} /></span>
              <AnimatePresence>
                {open && (
                  <motion.span
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 'auto' }}
                    exit={{ opacity: 0, width: 0 }}
                    transition={{ duration: 0.18 }}
                    style={{ overflow: 'hidden' }}
                  >
                    Dashboard
                  </motion.span>
                )}
              </AnimatePresence>
            </NavLink>
          </li>

          {/* Divider */}
          <li style={{ height: 1, background: 'var(--border)', margin: '0.5rem 0.25rem' }} />

          {/* Module Sections */}
          {NAV_SECTIONS.map((section) => (
            <CollapsibleSection
              key={section.id}
              section={section}
              isOpen={openSections[section.id]}
              onToggle={() => toggleSection(section.id)}
              sidebarOpen={open}
              currentPath={location.pathname}
            />
          ))}

          {/* Divider */}
          <li style={{ height: 1, background: 'var(--border)', margin: '0.5rem 0.25rem' }} />

          {/* Reports */}
          <li className="sidebar-nav-item" style={{ marginBottom: 2 }}>
            <NavLink
              to="/reports"
              style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', gap: '0.625rem',
                padding: '0.55rem 0.75rem', borderRadius: 9,
                color: isActive ? '#fff' : 'var(--text-secondary)',
                background: isActive ? 'rgba(6,182,212,0.10)' : 'transparent',
                fontWeight: isActive ? 600 : 500,
                fontSize: 'var(--text-sm)', fontFamily: 'var(--font-body)',
                transition: 'all 0.18s ease', textDecoration: 'none',
                whiteSpace: 'nowrap', overflow: 'hidden',
                justifyContent: open ? 'flex-start' : 'center',
              })}
            >
              <span style={{ display: 'flex', flexShrink: 0, color: 'var(--insight)' }}><FileBarChart size={17} /></span>
              <AnimatePresence>{open && <motion.span initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: 'auto' }} exit={{ opacity: 0, width: 0 }} transition={{ duration: 0.18 }} style={{ overflow: 'hidden' }}>Reports</motion.span>}</AnimatePresence>
            </NavLink>
          </li>

          {/* Settings */}
          <li className="sidebar-nav-item" style={{ marginBottom: 2 }}>
            <NavLink
              to="/settings"
              style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', gap: '0.625rem',
                padding: '0.55rem 0.75rem', borderRadius: 9,
                color: isActive ? '#fff' : 'var(--text-secondary)',
                background: isActive ? 'rgba(255,255,255,0.06)' : 'transparent',
                fontWeight: isActive ? 600 : 500,
                fontSize: 'var(--text-sm)', fontFamily: 'var(--font-body)',
                transition: 'all 0.18s ease', textDecoration: 'none',
                whiteSpace: 'nowrap', overflow: 'hidden',
                justifyContent: open ? 'flex-start' : 'center',
              })}
            >
              <span style={{ display: 'flex', flexShrink: 0 }}><Settings size={17} /></span>
              <AnimatePresence>{open && <motion.span initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: 'auto' }} exit={{ opacity: 0, width: 0 }} transition={{ duration: 0.18 }} style={{ overflow: 'hidden' }}>Settings</motion.span>}</AnimatePresence>
            </NavLink>
          </li>

          {/* Notifications */}
          <li className="sidebar-nav-item" style={{ marginBottom: 2 }}>
            <button
              onClick={toggleNotifications}
              style={{
                width: '100%', display: 'flex', alignItems: 'center',
                justifyContent: open ? 'space-between' : 'center',
                gap: '0.625rem', padding: '0.55rem 0.75rem', borderRadius: 9,
                color: 'var(--text-secondary)', background: 'transparent',
                fontWeight: 500, fontSize: 'var(--text-sm)',
                cursor: 'pointer', border: 'none', fontFamily: 'var(--font-body)',
                transition: 'all 0.18s ease', overflow: 'hidden',
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', overflow: 'hidden' }}>
                <Bell size={17} style={{ flexShrink: 0 }} />
                <AnimatePresence>{open && <motion.span initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: 'auto' }} exit={{ opacity: 0, width: 0 }} transition={{ duration: 0.18 }} style={{ overflow: 'hidden', whiteSpace: 'nowrap' }}>Notifications</motion.span>}</AnimatePresence>
              </div>
              {unreadCount > 0 && open && (
                <span style={{
                  background: 'var(--severity-high)', color: '#fff',
                  borderRadius: '999px', padding: '1px 7px', fontSize: '11px',
                  fontWeight: 700, boxShadow: '0 0 8px rgba(239,68,68,0.4)',
                  flexShrink: 0,
                }}>
                  {unreadCount}
                </span>
              )}
              {unreadCount > 0 && !open && (
                <span style={{
                  position: 'absolute', top: 6, right: 6,
                  width: 7, height: 7, borderRadius: '50%',
                  background: 'var(--severity-high)',
                }} />
              )}
            </button>
          </li>
        </ul>
      </nav>

      {/* ── User Footer ── */}
      {user && (
        <div
          ref={footerRef}
          style={{ padding: '0.75rem 0.5rem', borderTop: '1px solid var(--border)' }}
        >
          <div style={{
            display: 'flex', alignItems: 'center',
            gap: open ? '0.625rem' : 0,
            padding: '0.5rem 0.75rem', borderRadius: 10,
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid var(--border)', marginBottom: '0.5rem',
            overflow: 'hidden',
            justifyContent: open ? 'flex-start' : 'center',
          }}>
            <div style={{
              width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
              background: 'linear-gradient(135deg, var(--env) 0%, var(--social) 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, fontWeight: 700, color: '#fff',
            }}>
              {user.name?.charAt(0).toUpperCase()}
            </div>
            <AnimatePresence>
              {open && (
                <motion.div
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{ duration: 0.2 }}
                  style={{ minWidth: 0, overflow: 'hidden' }}
                >
                  <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {user.name}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginTop: 2 }}>
                    <span className="badge badge--active" style={{ fontSize: '10px', padding: '1px 6px' }}>{user.role}</span>
                    <span style={{ color: 'var(--gamify)', fontSize: '11px', fontWeight: 600 }}>🏆 {user.xp ?? 0} XP</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleLogout}
            style={{
              width: '100%', padding: open ? '0.45rem 0.75rem' : '0.45rem',
              display: 'flex', alignItems: 'center', justifyContent: open ? 'flex-start' : 'center',
              gap: '0.5rem', borderRadius: 8,
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid var(--border)',
              color: 'var(--text-secondary)', cursor: 'pointer',
              fontSize: 'var(--text-xs)', fontFamily: 'var(--font-body)',
              transition: 'all 0.18s ease',
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.08)'; (e.currentTarget as HTMLElement).style.color = 'var(--severity-high)'; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)'; }}
          >
            <LogOut size={14} style={{ flexShrink: 0 }} />
            <AnimatePresence>{open && <motion.span initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: 'auto' }} exit={{ opacity: 0, width: 0 }} transition={{ duration: 0.18 }} style={{ overflow: 'hidden', whiteSpace: 'nowrap' }}>Sign Out</motion.span>}</AnimatePresence>
          </motion.button>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop collapsible sidebar */}
      <DesktopSidebar style={{ position: 'fixed', left: 0, top: 0, bottom: 0 }}>
        {content}
      </DesktopSidebar>

      {/* Mobile drawer uses existing GSAP-driven sidebar pattern */}
      <aside
        className={`sidebar${isMobileOpen ? ' sidebar--mobile-open' : ''}`}
        style={{ fontFamily: 'var(--font-body)', display: 'none' }}
        id="mobile-sidebar-drawer"
      >
        {content}
      </aside>

      {/* Mobile overlay */}
      <div
        className={`sidebar-overlay ${isMobileOpen ? 'sidebar-overlay--visible' : 'sidebar-overlay--hidden'}`}
        onClick={onMobileClose}
      />

      <style>{`
        @media (max-width: 768px) {
          #mobile-sidebar-drawer { display: flex !important; flex-direction: column; }
          .ecosphere-desktop-sidebar { display: none !important; }
        }
        @media (min-width: 769px) {
          .ecosphere-desktop-sidebar { display: flex !important; }
        }
      `}</style>
    </>
  );
};

/* ═══════════════════════════════════════════════
   Collapsible section (with Framer Motion)
   ═══════════════════════════════════════════════ */
interface CollapsibleSectionProps {
  section: NavSection;
  isOpen: boolean;
  onToggle: () => void;
  sidebarOpen: boolean;
  currentPath: string;
}

const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  section, isOpen, onToggle, sidebarOpen, currentPath,
}) => {
  const isActiveSection = section.links.some((l) => currentPath.startsWith(l.to.split('/').slice(0, 2).join('/')));

  return (
    <li className="sidebar-nav-item" style={{ marginBottom: 2 }}>
      {/* Section header button */}
      <motion.button
        onClick={onToggle}
        whileHover={{ opacity: 0.8 }}
        style={{
          width: '100%', display: 'flex', alignItems: 'center',
          justifyContent: sidebarOpen ? 'space-between' : 'center',
          padding: sidebarOpen ? '0.5rem 0.75rem 0.5rem 1rem' : '0.5rem',
          color: isActiveSection ? section.color : section.color,
          fontSize: 'var(--text-xs)', fontWeight: 700,
          textTransform: 'uppercase', letterSpacing: '0.08em',
          cursor: 'pointer', background: 'transparent', border: 'none',
          fontFamily: 'var(--font-body)', borderRadius: 8,
          overflow: 'hidden',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ opacity: 0.9, flexShrink: 0 }}>{section.icon}</span>
          <AnimatePresence>
            {sidebarOpen && (
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.18 }}
                style={{ overflow: 'hidden', whiteSpace: 'nowrap' }}
              >
                {section.label}
              </motion.span>
            )}
          </AnimatePresence>
        </div>
        <AnimatePresence>
          {sidebarOpen && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, rotate: isOpen ? 0 : -90 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              style={{ display: 'flex', flexShrink: 0 }}
            >
              <ChevronDown size={12} />
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Sub-links */}
      <AnimatePresence initial={false}>
        {(isOpen || !sidebarOpen) && (
          <motion.ul
            key="links"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            style={{ listStyle: 'none', overflow: 'hidden', paddingLeft: sidebarOpen ? '0.375rem' : 0, paddingRight: '0.375rem' }}
          >
            {section.links.map((link) => {
              const isActive = currentPath.startsWith(link.to);
              return (
                <motion.li
                  key={link.to}
                  initial={{ x: -8, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ duration: 0.2 }}
                  style={{ marginBottom: 2 }}
                >
                  <NavLink
                    to={link.to}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: sidebarOpen ? 'flex-start' : 'center',
                      gap: '0.5rem',
                      padding: sidebarOpen ? '0.45rem 0.75rem' : '0.45rem',
                      borderRadius: 8,
                      color: isActive ? '#fff' : 'var(--text-secondary)',
                      background: isActive ? `rgba(${section.accentRgb}, 0.12)` : 'transparent',
                      fontWeight: isActive ? 600 : 400,
                      fontSize: 'var(--text-sm)',
                      fontFamily: 'var(--font-body)',
                      transition: 'all 0.15s ease',
                      borderLeft: sidebarOpen ? (isActive ? `2px solid ${section.color}` : '2px solid transparent') : 'none',
                      textDecoration: 'none',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                    }}
                  >
                    <span style={{
                      width: sidebarOpen ? 5 : 8, height: sidebarOpen ? 5 : 8,
                      borderRadius: '50%', background: section.color,
                      flexShrink: 0, opacity: isActive ? 1 : 0.5,
                      boxShadow: isActive ? `0 0 6px ${section.color}` : 'none',
                      transition: 'all 0.15s ease',
                    }} />
                    <AnimatePresence>
                      {sidebarOpen && (
                        <motion.span
                          initial={{ opacity: 0, width: 0 }}
                          animate={{ opacity: 1, width: 'auto' }}
                          exit={{ opacity: 0, width: 0 }}
                          transition={{ duration: 0.15 }}
                          style={{ overflow: 'hidden' }}
                        >
                          {link.label}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </NavLink>
                </motion.li>
              );
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </li>
  );
};

export default Sidebar;
