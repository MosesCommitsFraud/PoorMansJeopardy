"use client";

import React, { useEffect, useRef } from "react";

interface DottedGlowBackgroundProps extends React.HTMLAttributes<HTMLDivElement> {
  gap?: number;
  radius?: number;
  color?: string;
  darkColor?: string;
  glowColor?: string;
  darkGlowColor?: string;
  colorLightVar?: string;
  colorDarkVar?: string;
  glowColorLightVar?: string;
  glowColorDarkVar?: string;
  opacity?: number;
  backgroundOpacity?: number;
  speedMin?: number;
  speedMax?: number;
  speedScale?: number;
}

export function DottedGlowBackground({
  className = "",
  gap = 12,
  radius = 2,
  color = "rgba(0,0,0,0.7)",
  darkColor,
  glowColor = "rgba(0, 170, 255, 0.85)",
  darkGlowColor,
  opacity = 0.6,
  backgroundOpacity = 0,
  speedMin = 0.4,
  speedMax = 1.3,
  speedScale = 1,
  children,
  ...props
}: DottedGlowBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let dots: Array<{
      x: number;
      y: number;
      speed: number;
      phase: number;
    }> = [];

    const resizeCanvas = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = canvas.offsetWidth * dpr;
      canvas.height = canvas.offsetHeight * dpr;
      ctx.scale(dpr, dpr);
      initDots();
    };

    const initDots = () => {
      dots = [];
      const cols = Math.ceil(canvas.offsetWidth / gap);
      const rows = Math.ceil(canvas.offsetHeight / gap);

      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          dots.push({
            x: i * gap,
            y: j * gap,
            speed: speedMin + Math.random() * (speedMax - speedMin),
            phase: Math.random() * Math.PI * 2,
          });
        }
      }
    };

    const animate = (time: number) => {
      ctx.clearRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);

      // Get active color based on theme
      const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      const dotColor = isDark && darkColor ? darkColor : color;
      const dotGlowColor = isDark && darkGlowColor ? darkGlowColor : glowColor;

      dots.forEach((dot) => {
        const phase = dot.phase + (time / 1000) * dot.speed * speedScale;
        const alpha = (Math.sin(phase) + 1) / 2;

        ctx.save();
        ctx.globalAlpha = opacity * alpha;

        // Draw glow
        if (alpha > 0.5) {
          ctx.shadowBlur = 8 * (alpha - 0.5) * 2;
          ctx.shadowColor = dotGlowColor;
        }

        // Draw dot
        ctx.beginPath();
        ctx.arc(dot.x, dot.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = dotColor;
        ctx.fill();

        ctx.restore();
      });

      animationFrameId = requestAnimationFrame(animate);
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    animationFrameId = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      cancelAnimationFrame(animationFrameId);
    };
  }, [
    gap,
    radius,
    color,
    darkColor,
    glowColor,
    darkGlowColor,
    opacity,
    speedMin,
    speedMax,
    speedScale,
  ]);

  return (
    <div className={`relative ${className}`} {...props}>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ opacity: backgroundOpacity }}
      />
      {children}
    </div>
  );
}

