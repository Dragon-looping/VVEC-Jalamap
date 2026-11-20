import React from 'react';
import { Observation, IncidentStatus, RouteResult, RiderId, ComparisonRouteSelection } from '../types';
import { RIDERS } from '../data/putturNetwork';

interface IncidentSheetProps {
  currentRider: RiderId;
  selectedSegmentId: string;
  selectedSegmentStatus: IncidentStatus;
  selectedSegmentName: string;
  observations: Observation[];
  reopeningObservations: Observation[];
  activeRoute: RouteResult | null;
  originalRoute: RouteResult | null;
  comparisonSelection: ComparisonRouteSelection;
  onSetComparisonSelection: (sel: ComparisonRouteSelection) => void;
  onReportBlockage: () => void;
  onConfirmBlockage: () => void;
  onSwitchRider: (riderId: RiderId) => void;
  onReportReopening: () => void;
  onConfirmReopening: () => void;
  onSelectObservation: (segmentId: string) => void;
  inlineNotice?: string | null;
}

export const IncidentSheet: React.FC<IncidentSheetProps> = ({
  currentRider,
  selectedSegmentStatus,
  selectedSegmentName,
  observations,
  reopeningObservations,
  activeRoute,
  originalRoute,
  comparisonSelection,
  onSetComparisonSelection,
  onReportBlockage,
  onConfirmBlockage,
  onSwitchRider,
  onReportReopening,
  onConfirmReopening,
  onSelectObservation,
  inlineNotice,
}) => {
  const isAwaiting = selectedSegmentStatus === 'awaiting_confirmation';
  const isConfirmed = selectedSegmentStatus === 'confirmed_closure';
  const isReopening = selectedSegmentStatus === 'reopening_reported';

  const origDist = originalRoute?.totalDistanceKm ?? 4.8;
  const currentDist = activeRoute?.totalDistanceKm ?? origDist;
  const deltaMeters = Math.max(0, Math.round((currentDist - origDist) * 1000));

  const otherRiderId: RiderId = currentRider === 'rider_a' ? 'rider_b' : 'rider_a';
  const otherRiderProfile = RIDERS[otherRiderId];
  const firstObservation = observations[0];

  return (
    <aside className="atlas-sheet" role="region" aria-label="Selected Road Details">
      <div className="sheet-container">
        {/* Editorial Road Header */}
        <div className="sheet-road-header">
          <div className="road-eyebrow">Selected road</div>
          <h1 className="road-title">{selectedSegmentName}</h1>
        </div>

        {/* STATE A: Zero observations on this stretch */}
        {selectedSegmentStatus === 'none' && observations.length === 0 && (
          <div className="sheet-state-block state-clear">
            <p className="state-empty-text">No blockage reported on this stretch.</p>
            <div className="action-row-immediate">
              <button
                type="button"
                className="btn-primary-action"
                onClick={onReportBlockage}
                aria-label={`Report a blockage on ${selectedSegmentName}`}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
                <span>Report a blockage</span>
              </button>
            </div>
          </div>
        )}

        {/* STATE B: One observation on this stretch — Waiting for a second rider */}
        {isAwaiting && firstObservation && (
          <div className="sheet-state-block state-awaiting">
            <div className="status-announcement">
              <span className="status-dot dot-awaiting" aria-hidden="true" />
              <span className="status-heading">Waiting for a second rider</span>
            </div>
            <p className="status-desc">
              {firstObservation.riderName} reported water across this stretch at {firstObservation.timestamp}.
            </p>

            <div className="action-group-awaiting">
              <button
                type="button"
                className="btn-primary-action btn-confirm-action"
                onClick={onConfirmBlockage}
                aria-label={`Confirm blockage on ${selectedSegmentName}`}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span>Confirm blockage</span>
              </button>

              <button
                type="button"
                className="btn-secondary-action"
                onClick={() => onSwitchRider(otherRiderId)}
                aria-label={`Switch demo view to ${otherRiderProfile.shortName}`}
              >
                <span>Switch to {otherRiderProfile.shortName} (Independent witness) →</span>
              </button>
            </div>
          </div>
        )}

        {/* STATE C: Confirmed Closure & Detour */}
        {(isConfirmed || isReopening) && (
          <div className="sheet-state-block state-confirmed">
            <div className="status-announcement">
              <span className="status-dot dot-confirmed" aria-hidden="true" />
              <span className="status-heading">Road closed · Detour active</span>
            </div>

            {/* Clear Delta Result Card */}
            <div className="distance-delta-card" aria-label="Distance comparison metrics">
              <div className="delta-strong font-mono">
                Detour adds {deltaMeters} m
              </div>
              <div className="delta-sub font-mono">
                {origDist.toFixed(1)} km before · {currentDist.toFixed(1)} km now
              </div>
              <div className="delta-note">Two riders confirmed this stretch is impassable.</div>
            </div>

            {/* Working Route Comparison Segmented Control */}
            <div className="comparison-control-box">
              <div className="comparison-control-label">Compare routes</div>
              <div className="segmented-control" role="tablist" aria-label="Route comparison selection">
                <button
                  type="button"
                  role="tab"
                  aria-selected={comparisonSelection === 'original'}
                  className={`segment-btn ${comparisonSelection === 'original' ? 'active' : ''}`}
                  onClick={() => onSetComparisonSelection('original')}
                >
                  <span>Original · {origDist.toFixed(1)} km</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={comparisonSelection === 'detour'}
                  className={`segment-btn ${comparisonSelection === 'detour' ? 'active' : ''}`}
                  onClick={() => onSetComparisonSelection('detour')}
                >
                  <span>Detour · {currentDist.toFixed(1)} km</span>
                </button>
              </div>
              {comparisonSelection === 'original' && (
                <div className="comparison-hint-banner">
                  Displaying path before closure. Darbe barrier remains active.
                </div>
              )}
            </div>

            {/* Reopening Actions (State D lifecycle) */}
            {isConfirmed && !isReopening && (
              <div className="reopen-trigger-row">
                <button
                  type="button"
                  className="btn-reopen-report"
                  onClick={onReportReopening}
                  aria-label="Report road passable (Water receded)"
                >
                  Report road passable (Water receded)
                </button>
              </div>
            )}

            {isReopening && (
              <div className="reopen-awaiting-box">
                <div className="reopen-badge">Reopening reported (1 of 2)</div>
                <p className="reopen-desc">Waiting for a second rider to confirm road is passable.</p>
                <div className="reopen-btn-row">
                  <button
                    type="button"
                    className="btn-primary-action btn-confirm-reopen"
                    onClick={onConfirmReopening}
                  >
                    Confirm road reopened
                  </button>
                  <button
                    type="button"
                    className="btn-secondary-action"
                    onClick={() => onSwitchRider(otherRiderId)}
                  >
                    Switch to {otherRiderProfile.shortName}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Inline Guardrail Notice */}
        {inlineNotice && (
          <div className="sheet-inline-notice" role="alert">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{inlineNotice}</span>
          </div>
        )}

        {/* Evidence Timeline — ONLY rendered when observations exist */}
        {observations.length > 0 && (
          <div className="sheet-timeline-section">
            <div className="timeline-title-row">
              <h2 className="timeline-title">Evidence timeline</h2>
              <span className="timeline-count font-mono">
                {observations.length} of 2 required
              </span>
            </div>

            <div className="timeline-list" role="list">
              {observations.map((obs, idx) => (
                <div
                  key={obs.id}
                  className="timeline-item"
                  onClick={() => onSelectObservation(obs.segmentId)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') onSelectObservation(obs.segmentId);
                  }}
                  title="Click to highlight road on map"
                >
                  <div className="timeline-marker" aria-hidden="true">
                    <span className="timeline-dot" />
                    {idx < observations.length - 1 && <span className="timeline-connector" />}
                  </div>
                  <div className="timeline-content">
                    <div className="timeline-header">
                      <span className="timeline-author">{obs.riderName}</span>
                      <time className="timeline-time font-mono">{obs.timestamp}</time>
                    </div>
                    <p className="timeline-note">“{obs.note}”</p>
                    <span className="timeline-hint">Tap to highlight road</span>
                  </div>
                </div>
              ))}

              {reopeningObservations.map((obs) => (
                <div
                  key={obs.id}
                  className="timeline-item timeline-reopen"
                  onClick={() => onSelectObservation(obs.segmentId)}
                  role="button"
                  tabIndex={0}
                >
                  <div className="timeline-marker" aria-hidden="true">
                    <span className="timeline-dot dot-reopen" />
                  </div>
                  <div className="timeline-content">
                    <div className="timeline-header">
                      <span className="timeline-author">{obs.riderName} (Reopening)</span>
                      <time className="timeline-time font-mono">{obs.timestamp}</time>
                    </div>
                    <p className="timeline-note">“{obs.note}”</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
