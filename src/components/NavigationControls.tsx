import React from 'react';
import { PUTTUR_NODES } from '../data/putturNetwork';
import { RouteResult, NavigationStatus } from '../types';

interface NavigationControlsProps {
  originId: string;
  destinationId: string;
  onChangeOrigin: (id: string) => void;
  onChangeDestination: (id: string) => void;
  navigationStatus: NavigationStatus;
  onStartNavigation: () => void;
  onStopNavigation: () => void;
  activeRoute: RouteResult | null;
  remainingDistanceKm?: number;
  onOpenReportModal: () => void;
}

export const NavigationControls: React.FC<NavigationControlsProps> = ({
  originId,
  destinationId,
  onChangeOrigin,
  onChangeDestination,
  navigationStatus,
  onStartNavigation,
  onStopNavigation,
  activeRoute,
  remainingDistanceKm,
  onOpenReportModal,
}) => {
  const isNavigating = navigationStatus === 'navigating';
  const nodeOptions = Object.values(PUTTUR_NODES);

  const totalDist = activeRoute?.isFound ? activeRoute.totalDistanceKm : 0;
  const currentDist = remainingDistanceKm !== undefined ? remainingDistanceKm : totalDist;

  // Estimate duration assuming 25 km/h urban monsoon transit
  const estimatedMinutes = Math.max(1, Math.round((currentDist / 25) * 60));

  return (
    <div className="nav-controls-card" role="region" aria-label="Route Planning and Navigation">
      <div className="nav-inputs-row">
        {/* Origin Selector */}
        <div className="nav-field">
          <label htmlFor="origin-select" className="nav-field-label">
            <span className="dot-origin" aria-hidden="true" />
            <span>Start</span>
          </label>
          <select
            id="origin-select"
            value={originId}
            disabled={isNavigating}
            onChange={(e) => onChangeOrigin(e.target.value)}
            className="nav-select font-sans"
          >
            {nodeOptions.map((node) => (
              <option key={`orig-${node.id}`} value={node.id}>
                {node.shortLabel} ({node.kind})
              </option>
            ))}
          </select>
        </div>

        <div className="nav-swap-indicator" aria-hidden="true">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </div>

        {/* Destination Selector */}
        <div className="nav-field">
          <label htmlFor="dest-select" className="nav-field-label">
            <span className="dot-dest" aria-hidden="true" />
            <span>Destination</span>
          </label>
          <select
            id="dest-select"
            value={destinationId}
            disabled={isNavigating}
            onChange={(e) => onChangeDestination(e.target.value)}
            className="nav-select font-sans"
          >
            {nodeOptions.map((node) => (
              <option key={`dest-${node.id}`} value={node.id}>
                {node.shortLabel} ({node.kind})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Route metrics summary */}
      <div className="nav-metrics-row">
        {activeRoute?.isFound ? (
          <div className="nav-metrics-details">
            <div className="metric-stat">
              <span className="metric-value font-mono">{currentDist.toFixed(1)} km</span>
              <span className="metric-label">{isNavigating ? 'remaining' : 'total'}</span>
            </div>
            <div className="metric-sep">·</div>
            <div className="metric-stat">
              <span className="metric-value font-mono">~{estimatedMinutes} min</span>
              <span className="metric-label">est. transit</span>
            </div>
            {isNavigating && (
              <span className="nav-status-badge">
                <span className="nav-pulse-dot" aria-hidden="true" />
                <span>Live Navigation Active</span>
              </span>
            )}
          </div>
        ) : (
          <div className="nav-no-route-warning">
            <span className="warning-icon" aria-hidden="true">⚠️</span>
            <span>No available route found in pilot network. Roads blocked.</span>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="nav-actions-row">
        {!isNavigating ? (
          <button
            type="button"
            className="btn-start-nav"
            onClick={onStartNavigation}
            disabled={!activeRoute?.isFound}
            aria-label="Start Navigation"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polygon points="3 11 22 2 13 21 11 13 3 11" />
            </svg>
            <span>Start Navigation</span>
          </button>
        ) : (
          <button
            type="button"
            className="btn-stop-nav"
            onClick={onStopNavigation}
            aria-label="Stop Navigation"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <rect x="6" y="6" width="12" height="12" rx="2" />
            </svg>
            <span>End Trip</span>
          </button>
        )}

        <button
          type="button"
          className="btn-report-condition"
          onClick={onOpenReportModal}
          title="Report road waterlogging, blockage, or reopening"
          aria-label="Report Road Condition"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          <span>Report Road</span>
        </button>
      </div>
    </div>
  );
};
