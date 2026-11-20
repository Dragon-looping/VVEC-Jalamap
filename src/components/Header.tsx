import React from 'react';
import { Logo } from './Logo';

interface HeaderProps {
  onOpenWeather: () => void;
  onToggleDemoPanel: () => void;
  isDemoPanelOpen: boolean;
  connectionStatus: { isSupabase: boolean; label: string };
  weatherAlertLevel: string;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenWeather,
  onToggleDemoPanel,
  isDemoPanelOpen,
  connectionStatus,
  weatherAlertLevel,
}) => {
  return (
    <header className="atlas-header" role="banner">
      <div className="header-brand-group">
        <div className="header-brand">
          <Logo size={22} />
          <div className="brand-text-block">
            <div className="brand-title-row">
              <span className="brand-wordmark">JALAMAP</span>
              <span className="brand-badge-pilot">Puttur Pilot</span>
            </div>
            <div className="brand-tagline">
              Don't just find the way. Know if the way is clear.
            </div>
          </div>
        </div>
      </div>

      <div className="header-aux-controls">
        {/* Weather Status Pill */}
        <button
          type="button"
          className="header-pill-btn weather-pill"
          onClick={onOpenWeather}
          title="View Puttur Monsoon RainWatch Status"
          aria-label="RainWatch Weather Information"
        >
          <span className={`weather-dot dot-${weatherAlertLevel.toLowerCase()}`} aria-hidden="true" />
          <span className="weather-pill-text">RainWatch · {weatherAlertLevel} Alert</span>
        </button>

        {/* Engine status indicator */}
        <div className="header-status-indicator" title={connectionStatus.label}>
          <span className="status-live-dot" aria-hidden="true" />
          <span className="status-text">{connectionStatus.label}</span>
        </div>

        {/* Collapsible Demo Simulation Controls Pill */}
        <button
          type="button"
          className={`header-pill-btn demo-toggle-btn ${isDemoPanelOpen ? 'active' : ''}`}
          onClick={onToggleDemoPanel}
          title="Toggle Simulation Studio (Demo Testing Controls)"
          aria-label="Simulation Controls"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
          </svg>
          <span>Demo Controls</span>
        </button>
      </div>
    </header>
  );
};
