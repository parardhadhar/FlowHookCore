"use client";

import React, { ButtonHTMLAttributes, ReactNode, useRef, useState } from "react";

interface LuxuryButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  icon?: ReactNode;
  className?: string;
}

export function LuxuryButton({ children, icon, className = "", ...props }: LuxuryButtonProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    setMousePosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  return (
    <button
      ref={buttonRef}
      className={`luxury-btn ${className}`}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      {...props}
    >
      <div className="luxury-btn-inner">
        <span className="luxury-btn-content">
          {icon && <span className="luxury-btn-icon">{icon}</span>}
          <span className="luxury-btn-text">{children}</span>
        </span>
      </div>

      {/* Hover glow effect strictly tracking mouse */}
      {isHovered && (
        <div
          className="luxury-btn-glow"
          style={{
            left: mousePosition.x,
            top: mousePosition.y,
          }}
        />
      )}

      {/* Subtle sweeping light reflection line on the top border */}
      <div className="luxury-btn-highlight" />

      <style>{`
        .luxury-btn {
          position: relative;
          appearance: none;
          outline: none;
          border: none;
          background: transparent;
          padding: 0;
          margin: 0;
          cursor: pointer;
          border-radius: 9999px;
          user-select: none;
          transform: translateZ(0);
          transition: transform 0.4s cubic-bezier(0.19, 1, 0.22, 1);
          overflow: hidden;
          font-family: inherit;
        }

        .luxury-btn:active {
          transform: scale(0.96);
        }

        .luxury-btn-inner {
          position: relative;
          z-index: 2;
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.04) 0%, rgba(255, 255, 255, 0) 100%), #12101a;
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 9999px;
          padding: 10px 24px;
          box-shadow:
            0 2px 8px rgba(0, 0, 0, 0.4),
            inset 0 1px 1px rgba(255, 255, 255, 0.1);
          transition: all 0.4s cubic-bezier(0.19, 1, 0.22, 1);
        }

        .luxury-btn:hover .luxury-btn-inner {
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.02) 100%), #181523;
          border-color: rgba(255, 255, 255, 0.2);
          box-shadow:
            0 8px 24px rgba(139, 92, 246, 0.25),
            inset 0 1px 1px rgba(255, 255, 255, 0.2);
        }

        .luxury-btn-content {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          position: relative;
          z-index: 3;
        }

        .luxury-btn-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          color: #a78bfa;
          transition: transform 0.4s cubic-bezier(0.19, 1, 0.22, 1);
        }

        .luxury-btn:hover .luxury-btn-icon {
          transform: rotate(15deg) scale(1.1);
          color: #c4b5fd;
        }

        .luxury-btn-text {
          font-size: 13px;
          font-weight: 600;
          letter-spacing: 0.02em;
          color: #e8e8f0;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
          transition: color 0.4s ease;
        }

        .luxury-btn:hover .luxury-btn-text {
          color: #ffffff;
        }

        .luxury-btn-glow {
          position: absolute;
          width: 80px;
          height: 80px;
          background: radial-gradient(circle closest-side, rgba(139, 92, 246, 0.4), transparent);
          border-radius: 50%;
          transform: translate(-50%, -50%);
          pointer-events: none;
          z-index: 1;
          opacity: 0;
          animation: fade-in 0.3s forwards ease-out;
        }

        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .luxury-btn-highlight {
          position: absolute;
          inset: 0;
          border-radius: 9999px;
          pointer-events: none;
          z-index: 4;
          overflow: hidden;
        }

        .luxury-btn-highlight::after {
          content: "";
          position: absolute;
          top: 0;
          left: -100%;
          width: 50%;
          height: 100%;
          background: linear-gradient(
            90deg,
            transparent,
            rgba(255, 255, 255, 0.25),
            transparent
          );
          transform: skewX(-25deg);
        }

        .luxury-btn:hover .luxury-btn-highlight::after {
          animation: sweep 1.2s cubic-bezier(0.19, 1, 0.22, 1) forwards;
        }

        @keyframes sweep {
          0% { left: -100%; }
          100% { left: 200%; }
        }
      `}</style>
    </button>
  );
}
