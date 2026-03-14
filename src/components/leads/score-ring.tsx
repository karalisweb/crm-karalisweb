"use client";

import { useEffect, useState } from "react";

interface ScoreRingProps {
  score: number | null;
  size?: number;
  strokeWidth?: number;
  className?: string;
}

function getScoreColor(score: number): string {
  if (score >= 80) return "#ef4444";
  if (score >= 60) return "#f59e0b";
  if (score >= 40) return "#22c55e";
  return "#3b82f6";
}

function getScoreLabel(score: number): string {
  if (score >= 80) return "Hot";
  if (score >= 60) return "Buono";
  if (score >= 40) return "Medio";
  return "Basso";
}

export function ScoreRing({
  score,
  size = 120,
  strokeWidth = 8,
  className = "",
}: ScoreRingProps) {
  const [animatedOffset, setAnimatedOffset] = useState(0);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  useEffect(() => {
    if (score === null) return;
    const targetOffset = ((100 - score) / 100) * circumference;
    // Small delay for mount animation
    const timer = setTimeout(() => {
      setAnimatedOffset(targetOffset);
    }, 100);
    return () => clearTimeout(timer);
  }, [score, circumference]);

  if (score === null) {
    return (
      <div
        className={`flex flex-col items-center justify-center ${className}`}
        style={{ width: size, height: size }}
      >
        <span className="text-2xl font-bold text-muted-foreground">N/A</span>
        <span className="text-[10px] text-muted-foreground">Score</span>
      </div>
    );
  }

  const color = getScoreColor(score);
  const label = getScoreLabel(score);

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      <svg width={size} height={size} className="-rotate-90">
        {/* Background track */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="#1a2d44"
          strokeWidth={strokeWidth}
        />
        {/* Progress arc */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={animatedOffset}
          style={{
            transition: "stroke-dashoffset 1s ease-out",
          }}
        />
      </svg>
      {/* Center text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold" style={{ color }}>
          {score}
        </span>
        <span className="text-[10px] text-muted-foreground">{label}</span>
      </div>
    </div>
  );
}
