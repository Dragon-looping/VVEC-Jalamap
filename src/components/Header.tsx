import React from 'react';
import { Logo } from './Logo';
import { RiderId } from '../types';

interface HeaderProps {
  currentRider: RiderId;
  onReset: () => void;
  onSwitchRider: (rider: RiderId) => void;
}

export const Header: React.FC<HeaderProps> = ({ currentRider, onReset, onSwitchRider }) => {
  return (
    <header className="atlas-header" role="banner">
      <div className="header-brand">
        <Logo size={20} />
        <span className="brand-wordmark">JALAMAP</span>
        <span className="brand-sep" aria-hidden="true">·</span>
        <span className="brand-location">Puttur, Karnataka</span>
      </div>

      <div className="header-demo-controls">
        <div className="demo-rider-pill" role="group" aria-label="Simulated Rider Identity">
          <span className="demo-rider-label">Demo rider:</span>
          <button
            type="button"
            className={`demo-rider-btn ${currentRider === 'rider_a' ? 'active' : ''}`}
            onClick={() => onSwitchRider('rider_a')}
            aria-pressed={currentRider === 'rider_a'}
            title="Switch demo perspective to Rider A"
          >
            Rider A
          </button>
          <button
            type="button"
            className={`demo-rider-btn ${currentRider === 'rider_b' ? 'active' : ''}`}
            onClick={() => onSwitchRider('rider_b')}
            aria-pressed={currentRider === 'rider_b'}
            title="Switch demo perspective to Rider B"
          >
            Rider B
          </button>
        </div>

        <button
          type="button"
          className="demo-reset-btn"
          onClick={onReset}
          title="Reset demo to initial commute"
          aria-label="Reset demo to initial commute"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
          </svg>
          <span>Reset demo</span>
        </button>
      </div>
    </header>
  );
};
