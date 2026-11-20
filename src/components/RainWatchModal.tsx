import React from 'react';
import { RainWatchData } from '../types';

interface RainWatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: RainWatchData;
}

export const RainWatchModal: React.FC<RainWatchModalProps> = ({
  isOpen,
  onClose,
  data,
}) => {
  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="rainwatch-modal-title">
      <div className="modal-card modal-rainwatch">
        <div className="modal-header">
          <div className="modal-title-wrap">
            <span className="modal-icon" aria-hidden="true">⛈️</span>
            <div>
              <h2 id="rainwatch-modal-title" className="modal-title">
                RainWatch · {data.location}
              </h2>
              <div className="rainwatch-subtitle">{data.district}</div>
            </div>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Close RainWatch dialog"
          >
            ✕
          </button>
        </div>

        <div className="rainwatch-body">
          {/* Main Alert Card */}
          <div className={`rainwatch-alert-banner banner-${data.alertLevel.toLowerCase()}`}>
            <div className="alert-badge-row">
              <span className="alert-badge font-mono">{data.alertLevel.toUpperCase()} ALERT</span>
              <span className="alert-rate font-mono">{data.currentRainfallMmHr} mm/hr</span>
            </div>
            <div className="alert-headline">{data.intensity}</div>
            <p className="alert-desc">{data.forecastSummary}</p>
          </div>

          {/* Localized Inundation Advisory */}
          <div className="rainwatch-section">
            <h3 className="section-label">Local Road Impact Advisory</h3>
            <p className="section-text">{data.advisory}</p>
          </div>

          {/* Meta & Sources */}
          <div className="rainwatch-meta-grid">
            <div className="meta-item">
              <span className="meta-label">Data Source</span>
              <span className="meta-val">{data.source}</span>
            </div>
            <div className="meta-item">
              <span className="meta-label">Last Updated</span>
              <span className="meta-val font-mono">{data.lastUpdated}</span>
            </div>
          </div>

          <div className="rainwatch-disclaimer">
            <small>
              Note: RainWatch provides situational meteorological context. Actual road restrictions in JALAMAP are determined automatically by evaluated observations and CCTV intelligence.
            </small>
          </div>
        </div>

        <div className="modal-actions-row">
          <button type="button" className="btn-primary-action" onClick={onClose}>
            Close RainWatch
          </button>
        </div>
      </div>
    </div>
  );
};
