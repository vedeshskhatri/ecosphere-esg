import React, { useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface XPCelebrationOverlayProps {
  isVisible: boolean;
  xpAmount: number;
  activityTitle?: string;
  onClose: () => void;
}

/* ── Coin sound via Web Audio API (no external file needed) ── */
function playCoinSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const playTone = (freq: number, start: number, dur: number, vol: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.5, ctx.currentTime + start + dur * 0.25);
      gain.gain.setValueAtTime(0, ctx.currentTime + start);
      gain.gain.linearRampToValueAtTime(vol, ctx.currentTime + start + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + dur);
      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + dur);
    };
    playTone(880,  0,    0.15, 0.35);
    playTone(1109, 0.08, 0.15, 0.3);
    playTone(1318, 0.16, 0.2,  0.38);
    playTone(1760, 0.26, 0.3,  0.42);
    playTone(2217, 0.38, 0.35, 0.28);
  } catch { /* silent fail */ }
}

/* ── Confetti particles ── */
const PARTICLE_COUNT = 28;
const PARTICLE_COLORS = [
  '#687D31', '#19350C', '#A07830', '#406768', '#6FA9BB',
  '#8FAB45', '#C4A84A', '#5A8050',
];

interface Particle {
  id: number; angle: number; speed: number;
  color: string; size: number; shape: 'circle' | 'rect' | 'diamond';
}

function generateParticles(): Particle[] {
  return Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
    id: i,
    angle: (i / PARTICLE_COUNT) * 360 + (Math.random() - 0.5) * 25,
    speed: 100 + Math.random() * 160,
    color: PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)],
    size: 5 + Math.random() * 7,
    shape: (['circle', 'rect', 'diamond'] as const)[Math.floor(Math.random() * 3)],
  }));
}

const XPCelebrationOverlay: React.FC<XPCelebrationOverlayProps> = ({
  isVisible,
  xpAmount,
  activityTitle,
  onClose,
}) => {
  const particles = useRef<Particle[]>(generateParticles());
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const handleClose = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (isVisible) {
      particles.current = generateParticles();
      playCoinSound();
      timerRef.current = setTimeout(handleClose, 5500);
    }
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [isVisible, handleClose]);

  return (
    <AnimatePresence>
      {isVisible && (
        <>
          {/* ── Backdrop (flex-centered, handles click-away) ── */}
          <motion.div
            key="xp-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={handleClose}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 9990,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              background: 'rgba(25, 35, 12, 0.45)',
              cursor: 'pointer',
            }}
          >
            {/* ── Card (stopPropagation so clicking it doesn't close) ── */}
            <motion.div
              key="xp-card"
              onClick={(e) => e.stopPropagation()}
              initial={{ opacity: 0, scale: 0.72, y: 32 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.85, y: -20 }}
              transition={{ type: 'spring', stiffness: 320, damping: 22, delay: 0.04 }}
              style={{
                position: 'relative',
                zIndex: 9999,
                width: 360,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '1.1rem',
                padding: '2.25rem 2.5rem 2rem',
                background: '#EEECEA',
                border: '1.5px solid rgba(25, 53, 12, 0.14)',
                borderRadius: 20,
                boxShadow:
                  '0 2px 0 rgba(25,53,12,0.06), 0 8px 32px rgba(25,53,12,0.14), 0 32px 80px rgba(25,53,12,0.10)',
                textAlign: 'center',
                cursor: 'default',
                overflow: 'hidden',
              }}
            >
              {/* Top accent strip */}
              <div style={{
                position: 'absolute',
                top: 0, left: 0, right: 0,
                height: 4,
                background: 'linear-gradient(90deg, #19350C 0%, #687D31 50%, #A07830 100%)',
                borderRadius: '20px 20px 0 0',
              }} />

              {/* ── Coin ── */}
              <div style={{ position: 'relative', marginTop: '0.5rem' }}>
                {/* Glow halo */}
                <motion.div
                  animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.55, 0.3] }}
                  transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut' }}
                  style={{
                    position: 'absolute',
                    inset: -14,
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(104,125,49,0.28) 0%, transparent 72%)',
                  }}
                />
                {/* Coin itself — 3D flip */}
                <motion.div
                  initial={{ rotateY: 0, scale: 0.6 }}
                  animate={{ rotateY: [0, 180, 360, 540, 630], scale: 1 }}
                  transition={{ duration: 1.3, ease: [0.22, 1, 0.36, 1] }}
                  style={{
                    width: 76,
                    height: 76,
                    borderRadius: '50%',
                    background: 'linear-gradient(145deg, #C8A830 0%, #A07830 35%, #E8C84A 60%, #C8A830 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '2rem',
                    boxShadow:
                      '0 4px 16px rgba(160,120,48,0.45), inset 0 2px 4px rgba(255,255,255,0.5), inset 0 -2px 6px rgba(0,0,0,0.22)',
                    position: 'relative',
                    transformStyle: 'preserve-3d',
                  }}
                >
                  🌿
                </motion.div>
              </div>

              {/* ── XP number ── */}
              <motion.div
                initial={{ opacity: 0, scale: 0.7, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ delay: 0.3, type: 'spring', stiffness: 240, damping: 16 }}
              >
                <div style={{
                  fontSize: '3.2rem',
                  fontWeight: 800,
                  letterSpacing: '-0.03em',
                  lineHeight: 1,
                  fontFamily: 'var(--font-body)',
                  color: '#19350C',
                  position: 'relative',
                }}>
                  +{xpAmount} XP
                  {/* subtle shine sweep */}
                  <motion.div
                    initial={{ left: '-30%' }}
                    animate={{ left: '110%' }}
                    transition={{ delay: 0.55, duration: 0.55, ease: 'easeInOut' }}
                    style={{
                      position: 'absolute',
                      top: 0, bottom: 0,
                      width: '28%',
                      background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.45), transparent)',
                      pointerEvents: 'none',
                      transform: 'skewX(-15deg)',
                    }}
                  />
                </div>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.48 }}
                  style={{
                    marginTop: '0.3rem',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                    color: '#687D31',
                    fontFamily: 'var(--font-body)',
                  }}
                >
                  has been credited
                </motion.div>
              </motion.div>

              {/* ── Divider ── */}
              <motion.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: 0.55, duration: 0.4, ease: 'easeOut' }}
                style={{
                  width: '100%',
                  height: 1,
                  background: 'rgba(25,53,12,0.10)',
                  transformOrigin: 'center',
                }}
              />

              {/* ── Approval text ── */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.62 }}
                style={{
                  fontSize: '0.84rem',
                  color: '#3D4A28',
                  fontFamily: 'var(--font-body)',
                  lineHeight: 1.55,
                }}
              >
                🎉 Your request has been approved!
                {activityTitle && (
                  <div style={{
                    marginTop: '0.3rem',
                    fontSize: '0.75rem',
                    color: '#687D31',
                    fontStyle: 'italic',
                  }}>
                    "{activityTitle}"
                  </div>
                )}
              </motion.div>

              {/* ── XP progress bar ── */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.72 }}
                style={{ width: '100%' }}
              >
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '0.68rem',
                  fontWeight: 600,
                  letterSpacing: '0.07em',
                  textTransform: 'uppercase',
                  color: '#687D31',
                  fontFamily: 'var(--font-body)',
                  marginBottom: '0.4rem',
                }}>
                  <span>XP Progress</span>
                  <span>Keep going 🌱</span>
                </div>
                <div style={{
                  width: '100%',
                  height: 6,
                  borderRadius: 999,
                  background: 'rgba(25,53,12,0.10)',
                  overflow: 'hidden',
                }}>
                  <motion.div
                    initial={{ width: '0%' }}
                    animate={{ width: '68%' }}
                    transition={{ delay: 0.88, duration: 1.1, ease: 'easeOut' }}
                    style={{
                      height: '100%',
                      borderRadius: 999,
                      background: 'linear-gradient(90deg, #19350C 0%, #687D31 60%, #A07830 100%)',
                    }}
                  />
                </div>
              </motion.div>

              {/* ── CTA button ── */}
              <motion.button
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.85 }}
                onClick={handleClose}
                whileHover={{ scale: 1.03, backgroundColor: '#223F14' }}
                whileTap={{ scale: 0.97 }}
                style={{
                  width: '100%',
                  padding: '0.65rem 1.5rem',
                  borderRadius: 10,
                  background: '#19350C',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontFamily: 'var(--font-body)',
                  fontSize: '0.875rem',
                  color: '#F7F6F3',
                  letterSpacing: '0.02em',
                  transition: 'background 0.15s ease',
                }}
              >
                Awesome! 🚀
              </motion.button>

              <div style={{
                fontSize: '0.65rem',
                color: 'rgba(25,53,12,0.3)',
                fontFamily: 'var(--font-body)',
                marginTop: '-0.4rem',
              }}>
                Click anywhere outside to dismiss
              </div>
            </motion.div>
          </motion.div>

          {/* ── Confetti particles (outside the backdrop so they overlay everything) ── */}
          {particles.current.map((p) => {
            const rad = (p.angle * Math.PI) / 180;
            const tx = Math.cos(rad) * p.speed;
            const ty = Math.sin(rad) * p.speed - 60;
            return (
              <motion.div
                key={`confetti-${p.id}`}
                initial={{
                  position: 'fixed',
                  left: '50%',
                  top: '50%',
                  width: p.size,
                  height: p.shape === 'rect' ? p.size * 0.45 : p.shape === 'diamond' ? p.size : p.size,
                  borderRadius: p.shape === 'circle' ? '50%' : p.shape === 'diamond' ? '2px' : '1px',
                  background: p.color,
                  zIndex: 9995,
                  opacity: 1,
                  x: 0,
                  y: 0,
                  rotate: 0,
                  marginLeft: -p.size / 2,
                  marginTop: -p.size / 2,
                }}
                animate={{
                  x: tx, y: ty,
                  opacity: 0,
                  rotate: Math.random() * 540 - 270,
                }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.1 + Math.random() * 0.7, ease: 'easeOut' }}
              />
            );
          })}
        </>
      )}
    </AnimatePresence>
  );
};

export default XPCelebrationOverlay;
