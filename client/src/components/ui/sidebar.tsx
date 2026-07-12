/**
 * Aceternity-style collapsible sidebar primitives
 * Adapted from aceternity.com for Vite + React Router + EcoSphere design system.
 *
 * Changes from original:
 *  - next/link  → react-router-dom NavLink
 *  - next/image → standard <img>
 *  - Tailwind   → inline styles using EcoSphere CSS variables
 *  - "use client" directive removed (not needed in Vite)
 */

import React, { useState, createContext, useContext } from "react";
import { NavLink, type To } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X } from "lucide-react";

/* ─────────────────────────────────────────────────────────────
   Types
   ───────────────────────────────────────────────────────────── */
export interface SidebarLinkDef {
  label: string;
  href: To;
  icon: React.ReactNode;
}

interface SidebarContextProps {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  animate: boolean;
}

/* ─────────────────────────────────────────────────────────────
   Context
   ───────────────────────────────────────────────────────────── */
const SidebarContext = createContext<SidebarContextProps | undefined>(undefined);

export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (!context) throw new Error("useSidebar must be used within a SidebarProvider");
  return context;
};

/* ─────────────────────────────────────────────────────────────
   Provider
   ───────────────────────────────────────────────────────────── */
export const SidebarProvider = ({
  children,
  open: openProp,
  setOpen: setOpenProp,
  animate = true,
}: {
  children: React.ReactNode;
  open?: boolean;
  setOpen?: React.Dispatch<React.SetStateAction<boolean>>;
  animate?: boolean;
}) => {
  const [openState, setOpenState] = useState(false);
  const open = openProp !== undefined ? openProp : openState;
  const setOpen = setOpenProp !== undefined ? setOpenProp : setOpenState;

  return (
    <SidebarContext.Provider value={{ open, setOpen, animate }}>
      {children}
    </SidebarContext.Provider>
  );
};

/* ─────────────────────────────────────────────────────────────
   Root Sidebar wrapper
   ───────────────────────────────────────────────────────────── */
export const Sidebar = ({
  children,
  open,
  setOpen,
  animate,
}: {
  children: React.ReactNode;
  open?: boolean;
  setOpen?: React.Dispatch<React.SetStateAction<boolean>>;
  animate?: boolean;
}) => (
  <SidebarProvider open={open} setOpen={setOpen} animate={animate}>
    {children}
  </SidebarProvider>
);

/* ─────────────────────────────────────────────────────────────
   SidebarBody — renders DesktopSidebar + MobileSidebar
   ───────────────────────────────────────────────────────────── */
export const SidebarBody = (props: React.ComponentProps<typeof motion.div>) => (
  <>
    <DesktopSidebar {...props} />
    <MobileSidebar {...(props as React.ComponentProps<"div">)} />
  </>
);

/* ─────────────────────────────────────────────────────────────
   Desktop collapsible sidebar
   ───────────────────────────────────────────────────────────── */
export const DesktopSidebar = ({
  className: _className,
  children,
  style,
  ...props
}: React.ComponentProps<typeof motion.div>) => {
  const { open, setOpen, animate } = useSidebar();

  return (
    <motion.div
      animate={{ width: animate ? (open ? "260px" : "64px") : "260px" }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      style={{
        /* EcoSphere design tokens */
        height: "100%",
        display: "none", /* overridden by media query in index.css */
        flexDirection: "column",
        background: "var(--bg-sidebar)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderRight: "1px solid var(--border)",
        flexShrink: 0,
        overflow: "hidden",
        position: "relative",
        zIndex: 200,
        willChange: "width",
        ...style,
      }}
      className={`ecosphere-desktop-sidebar`}
      {...props}
    >
      {children}
    </motion.div>
  );
};

/* ─────────────────────────────────────────────────────────────
   Mobile drawer sidebar
   ───────────────────────────────────────────────────────────── */
export const MobileSidebar = ({
  children,
  ...props
}: React.ComponentProps<"div">) => {
  const { open, setOpen } = useSidebar();

  return (
    <>
      {/* Mobile top strip */}
      <div
        style={{
          height: 56,
          padding: "0 1rem",
          display: "none",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          background: "rgba(8,10,18,0.92)",
          backdropFilter: "blur(20px)",
          borderBottom: "1px solid var(--border)",
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 150,
        }}
        className="ecosphere-mobile-topbar-inner"
        {...props}
      >
        <div style={{ display: "flex", justifyContent: "flex-end", width: "100%", zIndex: 20 }}>
          <button
            onClick={() => setOpen(!open)}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 38,
              height: 38,
              borderRadius: 8,
              background: "rgba(255,255,255,0.06)",
              border: "1px solid var(--border)",
              cursor: "pointer",
              color: "var(--text-primary)",
            }}
          >
            <Menu size={20} />
          </button>
        </div>

        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ x: "-100%", opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: "-100%", opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              style={{
                position: "fixed",
                inset: 0,
                background: "var(--bg-sidebar)",
                padding: "2.5rem",
                zIndex: 100,
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
              }}
            >
              <button
                onClick={() => setOpen(!open)}
                style={{
                  position: "absolute",
                  right: "1.5rem",
                  top: "1.5rem",
                  zIndex: 50,
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  width: 36,
                  height: 36,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  color: "var(--text-secondary)",
                }}
              >
                <X size={18} />
              </button>
              {children}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
};

/* ─────────────────────────────────────────────────────────────
   SidebarLink — single nav item
   ───────────────────────────────────────────────────────────── */
export const SidebarLink = ({
  link,
  isActive: isActiveProp,
  accentColor = "var(--env)",
}: {
  link: SidebarLinkDef;
  isActive?: boolean;
  accentColor?: string;
}) => {
  const { open, animate } = useSidebar();

  return (
    <NavLink
      to={link.href}
      style={{ textDecoration: "none" }}
    >
      {({ isActive: routerActive }) => {
        const active = isActiveProp ?? routerActive;
        return (
          <motion.div
            whileHover={{ x: 2 }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.625rem",
              padding: "0.55rem 0.75rem",
              borderRadius: 9,
              cursor: "pointer",
              position: "relative",
              overflow: "hidden",
              color: active ? "#fff" : "var(--text-secondary)",
              background: active ? `${accentColor}15` : "transparent",
              borderLeft: active ? `2px solid ${accentColor}` : "2px solid transparent",
              fontWeight: active ? 600 : 400,
              fontSize: "var(--text-sm)",
              fontFamily: "var(--font-body)",
              transition: "background 0.15s ease, border-color 0.15s ease",
              whiteSpace: "nowrap",
              minWidth: 0,
            }}
          >
            {/* Icon */}
            <span
              style={{
                display: "flex",
                alignItems: "center",
                flexShrink: 0,
                color: active ? accentColor : "var(--text-muted)",
                transition: "color 0.15s ease",
              }}
            >
              {link.icon}
            </span>

            {/* Label — fades/hides when collapsed */}
            <motion.span
              animate={{
                display: animate ? (open ? "inline-block" : "none") : "inline-block",
                opacity: animate ? (open ? 1 : 0) : 1,
              }}
              transition={{ duration: 0.18, ease: "easeInOut" }}
              style={{
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                flex: 1,
                minWidth: 0,
              }}
            >
              {link.label}
            </motion.span>
          </motion.div>
        );
      }}
    </NavLink>
  );
};
