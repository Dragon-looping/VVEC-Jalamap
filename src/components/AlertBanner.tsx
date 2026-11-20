import React from 'react';
import { AlertNotification } from '../types';

interface AlertBannerProps {
  alert: AlertNotification | null;
  onDismiss: () => void;
}

export const AlertBanner: React.FC<AlertBannerProps> = ({ alert, onDismiss }) => {
  if (!alert) return null;

  const isReroute = alert.type === 'reroute' || alert.type === 'warning';
  const isReopened = alert.type === 'reopened';

  return (
    <div
      className={`alert-banner-hud ${isReroute ? 'alert-reroute' : ''} ${isReopened ? 'alert-reopen' : ''}`}
      role="alert"
      aria-live="assertive"
    >
      <div className="alert-content-group">
        <div className="alert-icon-wrap" aria-hidden="true">
          {isReroute ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          ) : isReopened ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
          )}
        </div>
        <div className="alert-text-body">
          <div className="alert-title">{alert.title}</div>
          <div className="alert-message">{alert.message}</div>
        </div>
      </div>
      <button
        type="button"
        className="alert-dismiss-btn"
        onClick={onDismiss}
        title="Dismiss notice"
        aria-label="Dismiss notice"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
};
