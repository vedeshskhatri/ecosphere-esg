import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Leaf, Users, Shield, Trophy, LayoutDashboard,
  FileBarChart, Settings
} from "lucide-react";

interface NavItem {
  id: string;
  label: string;
  to: string;
  prefix: string;
  color: string;
  icon: React.ReactNode;
}

const NAV_ITEMS: NavItem[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    to: "/",
    prefix: "/",
    color: "#406768",
    icon: <LayoutDashboard size={14} />,
  },
  {
    id: "env",
    label: "Environmental",
    to: "/environmental/factors",
    prefix: "/environmental",
    color: "#687D31",
    icon: <Leaf size={14} />,
  },
  {
    id: "social",
    label: "Social",
    to: "/social/activities",
    prefix: "/social",
    color: "#406768",
    icon: <Users size={14} />,
  },
  {
    id: "gov",
    label: "Governance",
    to: "/governance/policies",
    prefix: "/governance",
    color: "#19350C",
    icon: <Shield size={14} />,
  },
  {
    id: "gamify",
    label: "Gamification",
    to: "/gamification/challenges",
    prefix: "/gamification",
    color: "#8A6A28",
    icon: <Trophy size={14} />,
  },
  {
    id: "reports",
    label: "Reports",
    to: "/reports",
    prefix: "/reports",
    color: "#406768",
    icon: <FileBarChart size={14} />,
  },
  {
    id: "settings",
    label: "Settings",
    to: "/settings",
    prefix: "/settings",
    color: "#687D31",
    icon: <Settings size={14} />,
  },
];

export const SectionContextBar: React.FC = () => {
  const location = useLocation();
  const path = location.pathname;
  const navigate = useNavigate();

  // Hide on auth pages
  if (path.startsWith("/login") || path.startsWith("/register")) return null;

  return (
    <div style={{ marginBottom: "1.5rem", position: "relative", zIndex: 50 }}>
      {/* Light-surface pill nav */}
      <nav
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "0.125rem",
          padding: "0.3rem 0.375rem",
          borderRadius: 999,
          background: "#EEECEA",
          border: "1px solid rgba(25,53,12,0.12)",
          boxShadow: "0 1px 3px rgba(25,53,12,0.08), 0 1px 1px rgba(25,53,12,0.04)",
          width: "fit-content",
          margin: "0 auto",
        }}
      >
        {NAV_ITEMS.map((item) => {
          const isCurrentSection =
            item.prefix === "/"
              ? path === "/"
              : path.startsWith(item.prefix);

          return (
            <motion.button
              key={item.id}
              onClick={() => navigate(item.to)}
              whileTap={{ scale: 0.95 }}
              style={{
                position: "relative",
                display: "flex",
                alignItems: "center",
                gap: "0.35rem",
                padding: "0.35rem 0.85rem",
                borderRadius: 999,
                border: "none",
                cursor: "pointer",
                fontFamily: "var(--font-body)",
                fontSize: "var(--text-sm)",
                fontWeight: isCurrentSection ? 600 : 500,
                color: isCurrentSection ? item.color : "#3D4A28",
                background: isCurrentSection ? "#ffffff" : "transparent",
                boxShadow: isCurrentSection ? "0 1px 3px rgba(25, 53, 12, 0.08)" : "none",
                transition: "all 0.15s ease",
                outline: "none",
              }}
            >
              <span style={{ display: "flex", alignItems: "center", flexShrink: 0, color: isCurrentSection ? item.color : "currentColor" }}>
                {item.icon}
              </span>
              {item.label}
            </motion.button>
          );
        })}
      </nav>
    </div>
  );
};

export default SectionContextBar;
