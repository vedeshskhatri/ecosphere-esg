import React, { useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Leaf, Users, Shield, Trophy, LayoutDashboard,
  FileBarChart, Settings, TrendingDown, Target, BarChart3,
  Gavel, ClipboardCheck, ShieldAlert, Award, Flame, Medal, Star,
} from "lucide-react";

/* ─────────────────────────────────────────────────────────────
   Spring config — matches Aceternity exactly
   ───────────────────────────────────────────────────────────── */
const SPRING = {
  type: "spring" as const,
  mass: 0.5,
  damping: 11.5,
  stiffness: 100,
  restDelta: 0.001,
  restSpeed: 0.001,
};

/* ─────────────────────────────────────────────────────────────
   Data
   ───────────────────────────────────────────────────────────── */
interface SubLink {
  label: string;
  to: string;
  icon: React.ReactNode;
  description: string;
  stat?: string;
}

interface NavItem {
  id: string;
  label: string;
  /** Route prefix to detect active state */
  prefix?: string;
  /** Single destination (no dropdown) */
  to?: string;
  color: string;
  glowColor: string;
  icon: React.ReactNode;
  links?: SubLink[];
}

const NAV_ITEMS: NavItem[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    to: "/",
    prefix: "/",
    color: "#06b6d4",
    glowColor: "rgba(6,182,212,0.35)",
    icon: <LayoutDashboard size={14} />,
  },
  {
    id: "env",
    label: "Environmental",
    prefix: "/environmental",
    color: "#22c55e",
    glowColor: "rgba(34,197,94,0.35)",
    icon: <Leaf size={14} />,
    links: [
      {
        label: "Emission Factors",
        to: "/environmental/factors",
        icon: <BarChart3 size={15} />,
        description: "Emission coefficient library",
        stat: "CO₂ source data",
      },
      {
        label: "Carbon Log",
        to: "/environmental/transactions",
        icon: <TrendingDown size={15} />,
        description: "Scope 1/2/3 transaction history",
        stat: "Live carbon ledger",
      },
      {
        label: "Reduction Goals",
        to: "/environmental/goals",
        icon: <Target size={15} />,
        description: "Departmental CO₂ reduction targets",
        stat: "Progress tracking",
      },
    ],
  },
  {
    id: "social",
    label: "Social",
    prefix: "/social",
    color: "#3b82f6",
    glowColor: "rgba(59,130,246,0.35)",
    icon: <Users size={14} />,
    links: [
      {
        label: "CSR Activities",
        to: "/social/activities",
        icon: <ClipboardCheck size={15} />,
        description: "Browse & join CSR programs",
        stat: "Community impact",
      },
      {
        label: "Approval Queue",
        to: "/social/approvals",
        icon: <ShieldAlert size={15} />,
        description: "Pending participation requests",
        stat: "Manager review",
      },
    ],
  },
  {
    id: "gov",
    label: "Governance",
    prefix: "/governance",
    color: "#a855f7",
    glowColor: "rgba(168,85,247,0.35)",
    icon: <Shield size={14} />,
    links: [
      {
        label: "Policies",
        to: "/governance/policies",
        icon: <Gavel size={15} />,
        description: "ESG regulatory policy registry",
        stat: "Acknowledgements",
      },
      {
        label: "Audits",
        to: "/governance/audits",
        icon: <ClipboardCheck size={15} />,
        description: "Scheduled department audits",
        stat: "Audit calendar",
      },
      {
        label: "Compliance Issues",
        to: "/governance/issues",
        icon: <ShieldAlert size={15} />,
        description: "Live SLA violation watcher",
        stat: "SLA tracker",
      },
    ],
  },
  {
    id: "gamify",
    label: "Gamification",
    prefix: "/gamification",
    color: "#f97316",
    glowColor: "rgba(249,115,22,0.35)",
    icon: <Trophy size={14} />,
    links: [
      {
        label: "Challenges",
        to: "/gamification/challenges",
        icon: <Flame size={15} />,
        description: "Active sustainability challenges",
        stat: "Earn XP",
      },
      {
        label: "My Badges",
        to: "/gamification/badges",
        icon: <Award size={15} />,
        description: "Earned achievement collection",
        stat: "Badge vault",
      },
      {
        label: "Reward Shop",
        to: "/gamification/rewards",
        icon: <Star size={15} />,
        description: "Redeem XP for real rewards",
        stat: "XP store",
      },
      {
        label: "Leaderboard",
        to: "/gamification/leaderboard",
        icon: <Medal size={15} />,
        description: "Live rank & XP standings",
        stat: "Live rankings",
      },
    ],
  },
  {
    id: "reports",
    label: "Reports",
    to: "/reports",
    prefix: "/reports",
    color: "#06b6d4",
    glowColor: "rgba(6,182,212,0.35)",
    icon: <FileBarChart size={14} />,
  },
  {
    id: "settings",
    label: "Settings",
    to: "/settings",
    prefix: "/settings",
    color: "#94a3b8",
    glowColor: "rgba(148,163,184,0.25)",
    icon: <Settings size={14} />,
  },
];

/* ─────────────────────────────────────────────────────────────
   Main navbar component
   ───────────────────────────────────────────────────────────── */
export const SectionContextBar: React.FC = () => {
  const location = useLocation();
  const path = location.pathname;
  const [active, setActive] = useState<string | null>(null);

  // Hide on auth pages
  if (path.startsWith("/login") || path.startsWith("/register")) return null;

  // Find the currently active nav item
  const currentItem = NAV_ITEMS.find((item) => {
    if (item.prefix === "/") return path === "/";
    return item.prefix && path.startsWith(item.prefix);
  });

  return (
    <div style={{ marginBottom: "2rem", position: "relative", zIndex: 50 }}>
      {/* The floating pill */}
      <nav
        onMouseLeave={() => setActive(null)}
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "0.125rem",
          padding: "0.375rem 0.5rem",
          borderRadius: 999,
          background: "rgba(8, 10, 20, 0.88)",
          backdropFilter: "blur(32px)",
          WebkitBackdropFilter: "blur(32px)",
          border: "1px solid rgba(255,255,255,0.09)",
          boxShadow:
            "0 0 0 1px rgba(255,255,255,0.04) inset, " +
            "0 8px 48px rgba(0,0,0,0.6), " +
            "0 2px 8px rgba(0,0,0,0.4), " +
            (currentItem ? `0 0 60px ${currentItem.glowColor}` : "none"),
          transition: "box-shadow 0.4s ease",
        }}
      >
        {NAV_ITEMS.map((item) => (
          <NavMenuItem
            key={item.id}
            item={item}
            active={active}
            setActive={setActive}
            currentPath={path}
          />
        ))}
      </nav>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────
   Single nav menu item (with optional hover dropdown)
   ───────────────────────────────────────────────────────────── */
const NavMenuItem: React.FC<{
  item: NavItem;
  active: string | null;
  setActive: (v: string | null) => void;
  currentPath: string;
}> = ({ item, active, setActive, currentPath }) => {
  const navigate = useNavigate();

  // Is this item the currently active section?
  const isCurrentSection =
    item.prefix === "/"
      ? currentPath === "/"
      : item.prefix
      ? currentPath.startsWith(item.prefix)
      : false;

  const isHovered = active === item.id;

  const handleClick = () => {
    if (item.to) {
      navigate(item.to);
      setActive(null);
    }
  };

  return (
    <div
      onMouseEnter={() => {
        if (item.links) setActive(item.id);
        else setActive(null);
      }}
      style={{ position: "relative" }}
    >
      {/* Trigger button */}
      <motion.button
        onClick={handleClick}
        whileTap={{ scale: 0.95 }}
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          gap: "0.4rem",
          padding: "0.45rem 0.875rem",
          borderRadius: 999,
          border: "none",
          cursor: "pointer",
          fontFamily: "var(--font-body)",
          fontSize: "var(--text-sm)",
          fontWeight: isCurrentSection ? 700 : 500,
          color: isCurrentSection ? item.color : "var(--text-secondary)",
          background: "transparent",
          transition: "color 0.2s ease",
          whiteSpace: "nowrap",
          outline: "none",
          zIndex: 1,
        }}
      >
        {/* Active section background glow pill */}
        <AnimatePresence>
          {isCurrentSection && (
            <motion.span
              layoutId="active-section-pill"
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85 }}
              transition={SPRING}
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: 999,
                background: `${item.color}14`,
                border: `1px solid ${item.color}35`,
                boxShadow: `0 0 20px ${item.glowColor}`,
                zIndex: -1,
              }}
            />
          )}
        </AnimatePresence>

        {/* Icon */}
        <motion.span
          animate={{ color: isCurrentSection ? item.color : "currentColor" }}
          style={{ display: "flex", alignItems: "center", flexShrink: 0 }}
        >
          {item.icon}
        </motion.span>

        {item.label}
      </motion.button>

      {/* ── Dropdown popup ── */}
      {item.links && active === item.id && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 8 }}
          transition={SPRING}
          style={{
            position: "absolute",
            top: "calc(100% + 14px)",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 9999,
            /* pointer passthrough to children */
          }}
        >
          {/* Connector notch */}
          <div
            style={{
              position: "absolute",
              top: -6,
              left: "50%",
              transform: "translateX(-50%)",
              width: 12,
              height: 6,
              background: "rgba(14,17,30,0.97)",
              clipPath: "polygon(50% 0%, 0% 100%, 100% 100%)",
              filter: "drop-shadow(0 -1px 0 rgba(255,255,255,0.08))",
            }}
          />

          {/* Dropdown card */}
          <motion.div
            layout
            style={{
              background: "rgba(10, 13, 24, 0.97)",
              backdropFilter: "blur(40px)",
              WebkitBackdropFilter: "blur(40px)",
              border: `1px solid ${item.color}25`,
              borderRadius: 18,
              padding: "0.625rem",
              boxShadow:
                `0 0 0 1px rgba(255,255,255,0.05) inset, ` +
                `0 24px 64px rgba(0,0,0,0.75), ` +
                `0 8px 32px rgba(0,0,0,0.5), ` +
                `0 0 80px ${item.glowColor}`,
              minWidth: 260,
              maxWidth: 340,
            }}
          >
            {/* Section header in dropdown */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.5rem 0.625rem 0.75rem",
                borderBottom: `1px solid rgba(255,255,255,0.06)`,
                marginBottom: "0.375rem",
              }}
            >
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  background: `${item.color}15`,
                  border: `1px solid ${item.color}30`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: item.color,
                  boxShadow: `0 0 16px ${item.glowColor}`,
                  flexShrink: 0,
                }}
              >
                {item.icon}
              </div>
              <div>
                <div
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: "var(--text-sm)",
                    fontWeight: 700,
                    color: item.color,
                    letterSpacing: "-0.01em",
                  }}
                >
                  {item.label}
                </div>
                <div
                  style={{
                    fontSize: "10px",
                    color: "var(--text-muted)",
                    fontFamily: "var(--font-body)",
                    marginTop: 1,
                  }}
                >
                  {item.links.length} section{item.links.length !== 1 ? "s" : ""} available
                </div>
              </div>
            </div>

            {/* Sub-link items */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.125rem" }}>
              {item.links.map((link) => (
                <DropdownLink
                  key={link.to}
                  link={link}
                  sectionColor={item.color}
                  sectionGlow={item.glowColor}
                  currentPath={currentPath}
                  onNavigate={() => setActive(null)}
                />
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────
   Individual dropdown link row
   ───────────────────────────────────────────────────────────── */
const DropdownLink: React.FC<{
  link: SubLink;
  sectionColor: string;
  sectionGlow: string;
  currentPath: string;
  onNavigate: () => void;
}> = ({ link, sectionColor, sectionGlow, currentPath, onNavigate }) => {
  const navigate = useNavigate();
  const isActive = currentPath.startsWith(link.to);
  const [hovered, setHovered] = useState(false);

  return (
    <motion.button
      onClick={() => { navigate(link.to); onNavigate(); }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      whileTap={{ scale: 0.98 }}
      style={{
        position: "relative",
        display: "flex",
        alignItems: "center",
        gap: "0.75rem",
        padding: "0.625rem 0.75rem",
        borderRadius: 10,
        border: "none",
        cursor: "pointer",
        background: isActive
          ? `${sectionColor}12`
          : hovered
          ? "rgba(255,255,255,0.05)"
          : "transparent",
        outline: "none",
        width: "100%",
        textAlign: "left",
        transition: "background 0.15s ease",
        boxShadow: isActive ? `0 0 0 1px ${sectionColor}25 inset` : "none",
      }}
    >
      {/* Icon box */}
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          background: isActive
            ? `${sectionColor}20`
            : hovered
            ? `${sectionColor}12`
            : "rgba(255,255,255,0.04)",
          border: `1px solid ${isActive || hovered ? sectionColor + "30" : "rgba(255,255,255,0.07)"}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: isActive || hovered ? sectionColor : "var(--text-muted)",
          flexShrink: 0,
          boxShadow: isActive ? `0 0 12px ${sectionGlow}` : "none",
          transition: "all 0.18s ease",
        }}
      >
        {link.icon}
      </div>

      {/* Text */}
      <div style={{ minWidth: 0, flex: 1 }}>
        <div
          style={{
            fontFamily: "var(--font-body)",
            fontSize: "var(--text-sm)",
            fontWeight: isActive ? 700 : 500,
            color: isActive ? sectionColor : hovered ? "var(--text-primary)" : "var(--text-secondary)",
            transition: "color 0.15s ease",
            lineHeight: 1.2,
          }}
        >
          {link.label}
        </div>
        <div
          style={{
            fontSize: "11px",
            color: "var(--text-muted)",
            fontFamily: "var(--font-body)",
            marginTop: 2,
            lineHeight: 1.3,
          }}
        >
          {link.description}
        </div>
      </div>

      {/* Stat badge */}
      {link.stat && (
        <div
          style={{
            flexShrink: 0,
            fontSize: "10px",
            fontWeight: 600,
            color: isActive ? sectionColor : "var(--text-muted)",
            background: isActive ? `${sectionColor}15` : "rgba(255,255,255,0.04)",
            border: `1px solid ${isActive ? sectionColor + "30" : "rgba(255,255,255,0.07)"}`,
            borderRadius: 6,
            padding: "2px 7px",
            fontFamily: "var(--font-body)",
            whiteSpace: "nowrap",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            transition: "all 0.18s ease",
          }}
        >
          {link.stat}
        </div>
      )}

      {/* Active left-border accent */}
      {isActive && (
        <motion.div
          layoutId="dropdown-active-bar"
          style={{
            position: "absolute",
            left: 0,
            top: "20%",
            bottom: "20%",
            width: 2,
            borderRadius: 999,
            background: sectionColor,
            boxShadow: `0 0 8px ${sectionGlow}`,
          }}
          transition={SPRING}
        />
      )}
    </motion.button>
  );
};

export default SectionContextBar;
