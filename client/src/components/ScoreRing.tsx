import React, { useEffect, useState } from 'react';

interface ScoreRingProps {
  value: number;
  max?: number;
  color: string;
  label: string;
  size?: number;
}

export const ScoreRing: React.FC<ScoreRingProps> = ({ value, max = 100, color, label, size = 124 }) => {
  const [animatedValue, setAnimatedValue] = useState(0);

  useEffect(() => {
    // Staggered trigger for clean entry animation
    const timer = setTimeout(() => {
      setAnimatedValue(Math.max(0, Math.min(max, value)));
    }, 150);
    return () => clearTimeout(timer);
  }, [value, max]);

  const RADIUS = Math.round(size / 2 - 10);
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
  const percentage = (animatedValue / max) * 100;
  const strokeDashoffset = CIRCUMFERENCE - (percentage / 100) * CIRCUMFERENCE;

  // Determine indicator color based on score health
  const getScoreColor = (score: number) => {
    if (score < 40) return '#ef4444'; // Red (Poor)
    if (score < 70) return '#f59e0b'; // Amber (Moderate)
    return color; // Accent color (Good)
  };

  const activeColor = getScoreColor(animatedValue);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '0.75rem'
    }}>
      <div style={{ position: 'relative', width: `${size}px`, height: `${size}px` }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={RADIUS}
            fill="transparent"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth="8"
          />
          {/* Active progress circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={RADIUS}
            fill="transparent"
            stroke={activeColor}
            strokeWidth="8"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="score-ring-circle"
          />
        </svg>
        {/* Centered raw value text */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <span style={{ fontSize: size > 130 ? 'var(--text-4xl)' : 'var(--text-3xl)', fontWeight: 800, letterSpacing: '-0.05em' }}>
            {Math.round(animatedValue)}
          </span>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontWeight: 500 }}>
            /{max}
          </span>
        </div>
      </div>
      <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-secondary)' }}>
        {label}
      </span>
    </div>
  );
};
export default ScoreRing;
