import React, { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Leaf, Users, Shield, Trophy,
  FileBarChart, Settings, LogOut, ChevronDown, Bell, X
} from 'lucide-react';
import { gsap } from 'gsap';
import useAuthStore from '../store/authStore';
import useNotificationStore from '../store/notificationStore';

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
  glow: string;
  icon: React.ReactNode;
  links: { label: string; to: string }[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    id: 'env',
    label: 'Environmental',
    color: 'var(--env)',
    glow: 'var(--env-glow)',
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
    glow: 'var(--social-glow)',
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
    glow: 'var(--gov-glow)',
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
    glow: 'var(--gamify-glow)',
    icon: <Trophy size={17} />,
    links: [
      { label: 'Challenges',      to: '/gamification/challenges' },
      { label: 'My Badges',       to: '/gamification/badges' },
      { label: 'Reward Shop',     to: '/gamification/rewards' },
      { label: 'Live Leaderboard',to: '/gamification/leaderboard' },
    ],
  },
];

export const Sidebar: React.FC<SidebarProps> = ({ toggleNotifications, isMobileOpen, onMobileClose }) => {
  const { user, logout } = useAuthStore();
  const { unreadCount } = useNotificationStore();
  const navigate = useNavigate();
  const location = useLocation();

  /* ── Collapsible state (all open by default) ── */
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    env: true, social: true, gov: true, gamify: true,
  });

  const toggleSection = (id: string) =>
    setOpenSections((s) => ({ ...s, [id]: !s[id] }));

  /* ── GSAP refs ── */
  const sidebarRef  = useRef<HTMLElement>(null);
  const logoRef     = useRef<HTMLDivElement>(null);
  const navItemsRef = useRef<HTMLUListElement>(null);
  const footerRef   = useRef<HTMLDivElement>(null);

  /* ── Entrance animation on mount ── */
  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

      // Logo drops in
      tl.fromTo(
        logoRef.current,
        { opacity: 0, y: -16 },
        { opacity: 1, y: 0, duration: 0.5 },
      );

      // Nav items stagger up
      if (navItemsRef.current) {
        const items = navItemsRef.current.querySelectorAll('.sidebar-nav-item');
        tl.fromTo(
          items,
          { opacity: 0, x: -18 },
          { opacity: 1, x: 0, duration: 0.4, stagger: 0.045, ease: 'power2.out' },
          '-=0.25',
        );
      }

      // Footer fades in
      tl.fromTo(
        footerRef.current,
        { opacity: 0, y: 10 },
        { opacity: 1, y: 0, duration: 0.4 },
        '-=0.2',
      );
    }, sidebarRef);

    return () => ctx.revert();
  }, []);

  /* ── Resize listener — clear GSAP inline styles when switching to desktop ── */
  useEffect(() => {
    const handleResize = () => {
      if (!sidebarRef.current) return;
      if (window.innerWidth > 768) {
        // Kill any running tweens and wipe inline transform/opacity GSAP left behind
        gsap.killTweensOf(sidebarRef.current);
        gsap.set(sidebarRef.current, { clearProps: 'transform,x,opacity' });
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  /* ── Mobile drawer animation ── */
  useEffect(() => {
    if (!sidebarRef.current) return;

    // On desktop: always ensure GSAP inline styles are cleared so CSS controls visibility
    if (window.innerWidth > 768) {
      gsap.set(sidebarRef.current, { clearProps: 'transform,x,opacity' });
      return;
    }

    if (isMobileOpen) {
      gsap.fromTo(
        sidebarRef.current,
        { x: '-100%', opacity: 0.6 },
        { x: '0%', opacity: 1, duration: 0.38, ease: 'power3.out' },
      );
    } else {
      gsap.to(sidebarRef.current, {
        x: '-100%',
        opacity: 0.6,
        duration: 0.28,
        ease: 'power3.in',
      });
    }
  }, [isMobileOpen]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  /* ── Nav link hover micro-animation ── */
  const handleLinkMouseEnter = (e: React.MouseEvent<HTMLAnchorElement>) => {
    gsap.to(e.currentTarget.querySelector('.link-icon'), {
      x: 3,
      duration: 0.2,
      ease: 'power2.out',
    });
  };
  const handleLinkMouseLeave = (e: React.MouseEvent<HTMLAnchorElement>) => {
    gsap.to(e.currentTarget.querySelector('.link-icon'), {
      x: 0,
      duration: 0.2,
      ease: 'power2.out',
    });
  };

  return (
    <>
      <aside
        ref={sidebarRef}
        className={`sidebar${isMobileOpen ? ' sidebar--mobile-open' : ''}`}
        style={{ fontFamily: 'var(--font-body)' }}
      >
        {/* ── Brand Logo ── */}
        <div
          ref={logoRef}
          style={{
            padding: '1.4rem 1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid var(--border)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <div style={{
              width: 32,
              height: 32,
              borderRadius: 9,
              background: 'linear-gradient(135deg, var(--env) 0%, #16a34a 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 16px var(--env-glow)',
              flexShrink: 0,
            }}>
              <Leaf size={17} color="#000" />
            </div>
            <span style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'var(--text-lg)',
              fontWeight: 800,
              letterSpacing: '-0.03em',
              background: 'linear-gradient(135deg, #f1f5f9 40%, #94a3b8 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              EcoSphere
            </span>
          </div>

          {/* Mobile close button */}
          <button
            onClick={onMobileClose}
            style={{
              display: 'none',
              padding: '4px',
              borderRadius: 6,
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid var(--border)',
              color: 'var(--text-muted)',
              cursor: 'pointer',
            }}
            className="sidebar-close-btn"
          >
            <X size={16} />
          </button>
        </div>

        {/* ── Navigation ── */}
        <nav style={{ flex: 1, padding: '0.75rem 0', overflowY: 'auto', overflowX: 'hidden' }}>
          <ul ref={navItemsRef} style={{ listStyle: 'none' }}>

            {/* Dashboard */}
            <li className="sidebar-nav-item" style={{ padding: '0 0.75rem', marginBottom: 2 }}>
              <NavLink
                to="/"
                end
                onMouseEnter={handleLinkMouseEnter}
                onMouseLeave={handleLinkMouseLeave}
                style={({ isActive }) => ({
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.625rem',
                  padding: '0.6rem 0.75rem',
                  borderRadius: 9,
                  color: isActive ? '#fff' : 'var(--text-secondary)',
                  background: isActive ? 'rgba(255,255,255,0.07)' : 'transparent',
                  fontWeight: isActive ? 600 : 500,
                  fontSize: 'var(--text-sm)',
                  transition: 'all 0.18s ease',
                  boxShadow: isActive ? '0 0 0 1px rgba(255,255,255,0.08) inset' : 'none',
                  position: 'relative',
                })}
              >
                <span className="link-icon" style={{ display: 'flex' }}>
                  <LayoutDashboard size={17} />
                </span>
                <span>Dashboard</span>
              </NavLink>
            </li>

            {/* Divider */}
            <li style={{ height: 1, background: 'var(--border)', margin: '0.5rem 0.75rem' }} />

            {/* Module sections */}
            {NAV_SECTIONS.map((section) => (
              <SidebarSection
                key={section.id}
                section={section}
                isOpen={openSections[section.id]}
                onToggle={() => toggleSection(section.id)}
                onLinkMouseEnter={handleLinkMouseEnter}
                onLinkMouseLeave={handleLinkMouseLeave}
                currentPath={location.pathname}
              />
            ))}

            {/* Divider */}
            <li style={{ height: 1, background: 'var(--border)', margin: '0.5rem 0.75rem' }} />

            {/* Reports */}
            <li className="sidebar-nav-item" style={{ padding: '0 0.75rem', marginBottom: 2 }}>
              <NavLink
                to="/reports"
                onMouseEnter={handleLinkMouseEnter}
                onMouseLeave={handleLinkMouseLeave}
                style={({ isActive }) => ({
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.625rem',
                  padding: '0.6rem 0.75rem',
                  borderRadius: 9,
                  color: isActive ? '#fff' : 'var(--text-secondary)',
                  background: isActive ? 'rgba(6,182,212,0.10)' : 'transparent',
                  fontWeight: isActive ? 600 : 500,
                  fontSize: 'var(--text-sm)',
                  transition: 'all 0.18s ease',
                })}
              >
                <span className="link-icon" style={{ display: 'flex', color: 'var(--insight)' }}>
                  <FileBarChart size={17} />
                </span>
                <span>Reports</span>
              </NavLink>
            </li>

            {/* Settings */}
            <li className="sidebar-nav-item" style={{ padding: '0 0.75rem', marginBottom: 2 }}>
              <NavLink
                to="/settings"
                onMouseEnter={handleLinkMouseEnter}
                onMouseLeave={handleLinkMouseLeave}
                style={({ isActive }) => ({
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.625rem',
                  padding: '0.6rem 0.75rem',
                  borderRadius: 9,
                  color: isActive ? '#fff' : 'var(--text-secondary)',
                  background: isActive ? 'rgba(255,255,255,0.06)' : 'transparent',
                  fontWeight: isActive ? 600 : 500,
                  fontSize: 'var(--text-sm)',
                  transition: 'all 0.18s ease',
                })}
              >
                <span className="link-icon" style={{ display: 'flex' }}>
                  <Settings size={17} />
                </span>
                <span>Settings</span>
              </NavLink>
            </li>

            {/* Notifications */}
            <li className="sidebar-nav-item" style={{ padding: '0 0.75rem', marginBottom: 2 }}>
              <button
                onClick={toggleNotifications}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.625rem',
                  padding: '0.6rem 0.75rem',
                  borderRadius: 9,
                  color: 'var(--text-secondary)',
                  background: 'transparent',
                  fontWeight: 500,
                  fontSize: 'var(--text-sm)',
                  cursor: 'pointer',
                  transition: 'all 0.18s ease',
                  border: 'none',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background = 'transparent';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                  <Bell size={17} />
                  <span>Notifications</span>
                </div>
                {unreadCount > 0 && (
                  <span style={{
                    background: 'var(--severity-high)',
                    color: '#fff',
                    borderRadius: '999px',
                    padding: '1px 7px',
                    fontSize: '11px',
                    fontWeight: 700,
                    boxShadow: '0 0 8px rgba(239,68,68,0.4)',
                  }}>
                    {unreadCount}
                  </span>
                )}
              </button>
            </li>
          </ul>
        </nav>

        {/* ── User Footer ── */}
        {user && (
          <div
            ref={footerRef}
            style={{
              padding: '1rem 0.75rem',
              borderTop: '1px solid var(--border)',
            }}
          >
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.625rem',
              padding: '0.625rem 0.75rem',
              borderRadius: 10,
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid var(--border)',
              marginBottom: '0.625rem',
            }}>
              {/* Avatar */}
              <div style={{
                width: 34,
                height: 34,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--env) 0%, var(--social) 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                fontSize: 13,
                fontWeight: 700,
                color: '#fff',
              }}>
                {user.name?.charAt(0).toUpperCase()}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{
                  fontWeight: 600,
                  fontSize: 'var(--text-sm)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}>
                  {user.name}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginTop: 2 }}>
                  <span className="badge badge--active" style={{ fontSize: '10px', padding: '1px 6px' }}>
                    {user.role}
                  </span>
                  <span style={{ color: 'var(--gamify)', fontSize: '11px', fontWeight: 600 }}>
                    🏆 {user.xp ?? 0} XP
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="btn btn-secondary"
              style={{ width: '100%', padding: '0.4rem 0.75rem', fontSize: 'var(--text-xs)' }}
            >
              <LogOut size={13} />
              Sign Out
            </button>
          </div>
        )}
      </aside>

      {/* Mobile overlay */}
      <div
        className={`sidebar-overlay ${isMobileOpen ? 'sidebar-overlay--visible' : 'sidebar-overlay--hidden'}`}
        onClick={onMobileClose}
      />

      {/* Inject mobile close button visibility via style tag */}
      <style>{`
        @media (max-width: 768px) {
          .sidebar-close-btn { display: flex !important; }
        }
      `}</style>
    </>
  );
};

/* ═══════════════════════════════════════════════
   Collapsible Section Component
   ═══════════════════════════════════════════════ */
interface SidebarSectionProps {
  section: NavSection;
  isOpen: boolean;
  onToggle: () => void;
  onLinkMouseEnter: (e: React.MouseEvent<HTMLAnchorElement>) => void;
  onLinkMouseLeave: (e: React.MouseEvent<HTMLAnchorElement>) => void;
  currentPath: string;
}

const SidebarSection: React.FC<SidebarSectionProps> = ({
  section, isOpen, onToggle, onLinkMouseEnter, onLinkMouseLeave,
}) => {
  const linksRef = useRef<HTMLUListElement>(null);
  const chevronRef = useRef<SVGSVGElement>(null);
  const isFirstRender = useRef(true);

  /* Animate expand/collapse */
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (!linksRef.current) return;

    const items = linksRef.current.querySelectorAll('li');

    if (isOpen) {
      gsap.fromTo(
        linksRef.current,
        { height: 0, opacity: 0 },
        { height: 'auto', opacity: 1, duration: 0.3, ease: 'power2.out' },
      );
      gsap.fromTo(
        items,
        { x: -10, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.25, stagger: 0.04, ease: 'power2.out', delay: 0.05 },
      );
    } else {
      gsap.to(linksRef.current, { height: 0, opacity: 0, duration: 0.25, ease: 'power2.in' });
    }

    // Rotate chevron
    gsap.to(chevronRef.current, {
      rotate: isOpen ? 0 : -90,
      duration: 0.25,
      ease: 'power2.inOut',
    });
  }, [isOpen]);

  return (
    <li className="sidebar-nav-item" style={{ marginBottom: 2 }}>
      {/* Section header */}
      <button
        onClick={onToggle}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.55rem 1.5rem 0.55rem 1.5rem',
          color: section.color,
          fontSize: 'var(--text-xs)',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          cursor: 'pointer',
          transition: 'opacity 0.15s ease',
          background: 'transparent',
          border: 'none',
          fontFamily: 'var(--font-body)',
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.opacity = '0.75'; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.opacity = '1'; }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ opacity: 0.8 }}>{section.icon}</span>
          <span>{section.label}</span>
        </div>
        <ChevronDown
          ref={chevronRef as any}
          size={13}
          style={{ flexShrink: 0, transform: isOpen ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'none' }}
        />
      </button>

      {/* Links */}
      <ul
        ref={linksRef}
        style={{
          listStyle: 'none',
          paddingLeft: '0.75rem',
          paddingRight: '0.75rem',
          overflow: 'hidden',
          display: isOpen ? 'block' : 'none',
        }}
      >
        {section.links.map((link) => (
          <li key={link.to} style={{ marginBottom: 2 }}>
            <NavLink
              to={link.to}
              onMouseEnter={onLinkMouseEnter}
              onMouseLeave={onLinkMouseLeave}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.5rem 0.75rem',
                borderRadius: 8,
                color: isActive ? '#fff' : 'var(--text-secondary)',
                background: isActive ? `rgba(${colorToRgb(section.color)}, 0.12)` : 'transparent',
                fontWeight: isActive ? 600 : 400,
                fontSize: 'var(--text-sm)',
                transition: 'all 0.15s ease',
                borderLeft: isActive ? `2px solid ${section.color}` : '2px solid transparent',
              })}
            >
              <span
                className="link-icon"
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: '50%',
                  background: section.color,
                  flexShrink: 0,
                  display: 'flex',
                }}
              />
              {link.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </li>
  );
};

/* Helper: CSS var to rgb string for rgba() */
function colorToRgb(color: string): string {
  const map: Record<string, string> = {
    'var(--env)':    '34, 197, 94',
    'var(--social)': '59, 130, 246',
    'var(--gov)':    '168, 85, 247',
    'var(--gamify)': '249, 115, 22',
  };
  return map[color] ?? '255, 255, 255';
}

export default Sidebar;
