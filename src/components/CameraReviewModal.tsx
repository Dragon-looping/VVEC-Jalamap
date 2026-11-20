import React, { useState, useEffect } from 'react';
import {
  CameraRecord,
  CameraFrame,
  CameraObservation,
  CameraObservationChoice,
} from '../types';
import { calculateTimeDifference } from '../data/cameraData';

interface CameraReviewModalProps {
  camera: CameraRecord;
  frame: CameraFrame;
  reportTimestamp: string;
  existingObservation?: CameraObservation;
  onAttachObservation: (obs: CameraObservation) => void;
  onClose: () => void;
}

const OBSERVATION_OPTIONS: CameraObservationChoice[] = [
  'Water visible on the road',
  'Barrier across the lane',
  'View obstructed',
  'Cannot tell from this frame',
];

export const CameraReviewModal: React.FC<CameraReviewModalProps> = ({
  camera,
  frame,
  reportTimestamp,
  existingObservation,
  onAttachObservation,
  onClose,
}) => {
  const [selectedChoice, setSelectedChoice] = useState<CameraObservationChoice | null>(
    existingObservation ? existingObservation.selectedObservation : null
  );
  const [attachedSuccess, setAttachedSuccess] = useState<boolean>(!!existingObservation);

  useEffect(() => {
    if (existingObservation) {
      setSelectedChoice(existingObservation.selectedObservation);
      setAttachedSuccess(true);
    }
  }, [existingObservation]);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const diffResult = calculateTimeDifference(reportTimestamp, frame.timestamp);

  const handleAttach = () => {
    if (!selectedChoice) return;

    const newObs: CameraObservation = {
      id: existingObservation?.id || `cam-obs-${camera.id}-${frame.id}`,
      incidentId: `inc-${camera.roadSegmentId}`,
      segmentId: camera.roadSegmentId,
      cameraId: camera.id,
      frameId: frame.id,
      captureTime: frame.timestamp,
      selectedObservation: selectedChoice,
      reviewTime: '08:15 IST',
      reviewerName: 'Reviewer · Road camera',
    };

    onAttachObservation(newObs);
    setAttachedSuccess(true);
  };

  return (
    <div
      className="camera-review-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="camera-review-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="camera-review-card">
        {/* Header Bar */}
        <div className="camera-review-header">
          <div className="camera-review-meta">
            <div className="camera-meta-badge font-mono">{camera.id}</div>
            <div className="camera-meta-info">
              <h2 id="camera-review-title" className="camera-review-title">
                {camera.roadName}
              </h2>
              <div className="camera-review-dir">{camera.viewingDirection}</div>
            </div>
          </div>
          <button
            type="button"
            className="camera-review-close-btn"
            onClick={onClose}
            aria-label="Close camera frame review"
            title="Close review (Esc)"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="camera-review-body">
          {/* Authentic Camera Still Frame with Timestamp Overlay */}
          <div className="camera-frame-viewport">
            <img
              src={frame.imageUrl}
              alt={`${camera.id} capture of ${camera.roadName} facing ${camera.viewingDirection}`}
              className="camera-frame-img"
            />
          </div>

          {/* Temporal Relationship Block */}
          <div className="camera-temporal-block" aria-label="Report and camera frame timing">
            <div className="temporal-grid">
              <div className="temporal-row">
                <span className="temporal-label">Rider report</span>
                <span className="temporal-value font-mono">{reportTimestamp}</span>
              </div>
              <div className="temporal-row">
                <span className="temporal-label">Frame captured</span>
                <span className="temporal-value font-mono">{frame.timestamp}</span>
              </div>
              <div className="temporal-delta">
                <span className="temporal-delta-text font-mono">
                  {diffResult.label}
                </span>
                <span className="temporal-window-pill">
                  Within 10 min window
                </span>
              </div>
            </div>
          </div>

          {/* Review Decision Block */}
          <div className="camera-decision-block">
            <h3 className="decision-heading">What can you see?</h3>
            <p className="decision-subtext">
              Select visual evidence to attach supporting observation to this incident.
            </p>

            <div className="decision-options" role="radiogroup" aria-label="What can you see?">
              {OBSERVATION_OPTIONS.map((choice) => {
                const isSelected = selectedChoice === choice;
                return (
                  <label
                    key={choice}
                    className={`decision-option-label ${isSelected ? 'selected' : ''}`}
                  >
                    <input
                      type="radio"
                      name="camera-observation"
                      value={choice}
                      checked={isSelected}
                      onChange={() => {
                        setSelectedChoice(choice);
                        setAttachedSuccess(false);
                      }}
                      className="decision-radio-input"
                    />
                    <span className="decision-radio-custom" aria-hidden="true" />
                    <span className="decision-choice-text">{choice}</span>
                  </label>
                );
              })}
            </div>

            {/* Action Row */}
            <div className="decision-actions">
              <button
                type="button"
                className="btn-attach-observation"
                disabled={!selectedChoice}
                onClick={handleAttach}
                aria-label="Attach observation to incident timeline"
              >
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span>
                  {attachedSuccess ? 'Observation attached' : 'Attach observation'}
                </span>
              </button>

              {attachedSuccess && (
                <div className="attached-status-banner" role="status">
                  <span className="attached-check-icon">✓</span>
                  <span>Observation recorded in incident timeline.</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
