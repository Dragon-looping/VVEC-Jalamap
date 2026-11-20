import React from 'react';

interface LogoProps {
  size?: number;
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({ size = 22, className = '' }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="JALAMAP emblem"
      role="img"
    >
      {/* Straight road stroke: petrol teal */}
      <line x1="6" y1="20" x2="6" y2="4" stroke="#007C76" strokeWidth="2.5" strokeLinecap="round" />
      {/* Diverging detour stroke with road-bend radius */}
      <path
        d="M 14 20 L 14 15 C 14 12 19 13.5 19 10 L 19 4"
        stroke="#202C2C"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};
