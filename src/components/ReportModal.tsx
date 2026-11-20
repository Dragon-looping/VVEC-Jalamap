import React, { useState } from 'react';
import { PUTTUR_SEGMENTS } from '../data/putturNetwork';
import { ObservationCondition } from '../types';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultSegmentId: string;
  onSubmitReport: (data: {
    segmentId: string;
    condition: ObservationCondition;
    note: string;
  }) => void;
}

export const ReportModal: React.FC<ReportModalProps> = ({
  isOpen,
  onClose,
  defaultSegmentId,
  onSubmitReport,
}) => {
  const [segmentId, setSegmentId] = useState<string>(defaultSegmentId || 'seg_bolwar_darbe');
  const [condition, setCondition] = useState<ObservationCondition>('blocked');
  const [note, setNote] = useState<string>('');
  const [hasPhoto, setHasPhoto] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const defaultNotes: Record<ObservationCondition, string> = {
      blocked: 'Water depth exceeds safe threshold. Impassable for traffic.',
      partially_blocked: 'Waterlogging pooling in lane. Passable only with high clearance.',
      passable: 'Water has receded. Road is fully passable.',
      not_sure: 'Caution: Surface moisture and debris observed.',
    };

    onSubmitReport({
      segmentId,
      condition,
      note: note.trim() || defaultNotes[condition],
    });

    setIsSubmitting(false);
    onClose();
  };

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="report-modal-title">
      <div className="modal-card">
        <div className="modal-header">
          <div className="modal-title-wrap">
            <span className="modal-icon" aria-hidden="true">📡</span>
            <h2 id="report-modal-title" className="modal-title">
              Report Road Condition
            </h2>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Close report dialog"
          >
            ✕
          </button>
        </div>

        <p className="modal-subtitle">
          Submit observed conditions to update community flood navigation. Verified automatically.
        </p>

        <form onSubmit={handleSubmit} className="report-form">
          {/* Road Segment Selection */}
          <div className="form-group">
            <label htmlFor="road-select" className="form-label">
              Road / Location
            </label>
            <select
              id="road-select"
              value={segmentId}
              onChange={(e) => setSegmentId(e.target.value)}
              className="form-select font-sans"
            >
              {PUTTUR_SEGMENTS.map((seg) => (
                <option key={seg.id} value={seg.id}>
                  {seg.name} ({seg.distanceKm} km)
                </option>
              ))}
            </select>
          </div>

          {/* Condition Choice */}
          <div className="form-group">
            <span className="form-label">Observed Condition</span>
            <div className="condition-grid" role="radiogroup" aria-label="Condition options">
              <label
                className={`condition-tile ${condition === 'blocked' ? 'selected-blocked' : ''}`}
              >
                <input
                  type="radio"
                  name="condition"
                  value="blocked"
                  checked={condition === 'blocked'}
                  onChange={() => setCondition('blocked')}
                  className="sr-only"
                />
                <span className="tile-icon">🛑</span>
                <span className="tile-title">Road Blocked</span>
                <span className="tile-desc">Flooded / Impassable</span>
              </label>

              <label
                className={`condition-tile ${
                  condition === 'partially_blocked' ? 'selected-hazard' : ''
                }`}
              >
                <input
                  type="radio"
                  name="condition"
                  value="partially_blocked"
                  checked={condition === 'partially_blocked'}
                  onChange={() => setCondition('partially_blocked')}
                  className="sr-only"
                />
                <span className="tile-icon">⚠️</span>
                <span className="tile-title">Partially Blocked</span>
                <span className="tile-desc">Water pooling / Slow</span>
              </label>

              <label
                className={`condition-tile ${condition === 'passable' ? 'selected-passable' : ''}`}
              >
                <input
                  type="radio"
                  name="condition"
                  value="passable"
                  checked={condition === 'passable'}
                  onChange={() => setCondition('passable')}
                  className="sr-only"
                />
                <span className="tile-icon">✅</span>
                <span className="tile-title">Road Passable</span>
                <span className="tile-desc">Water receded / Clear</span>
              </label>

              <label
                className={`condition-tile ${condition === 'not_sure' ? 'selected-neutral' : ''}`}
              >
                <input
                  type="radio"
                  name="condition"
                  value="not_sure"
                  checked={condition === 'not_sure'}
                  onChange={() => setCondition('not_sure')}
                  className="sr-only"
                />
                <span className="tile-icon">❓</span>
                <span className="tile-title">Not Sure</span>
                <span className="tile-desc">Potential hazard</span>
              </label>
            </div>
          </div>

          {/* Note */}
          <div className="form-group">
            <label htmlFor="note-input" className="form-label">
              Short Description (Optional)
            </label>
            <input
              id="note-input"
              type="text"
              placeholder="e.g. Water knee-deep near culvert, autos cannot pass"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="form-input"
            />
          </div>

          {/* Simulated Photo Attachment */}
          <div className="form-group">
            <button
              type="button"
              className={`photo-attach-btn ${hasPhoto ? 'attached' : ''}`}
              onClick={() => setHasPhoto(!hasPhoto)}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
              <span>{hasPhoto ? '✓ Photo evidence attached' : '+ Attach photo evidence (Optional)'}</span>
            </button>
          </div>

          <div className="modal-actions-row">
            <button type="button" className="btn-cancel" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn-submit-report"
              disabled={isSubmitting}
            >
              Submit Report
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
