import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Header } from './components/Header';
import { MapAtlas } from './components/MapAtlas';
import { IncidentSheet } from './components/IncidentSheet';
import {
  RiderId,
  Observation,
  IncidentStatus,
  RouteResult,
  JalamapState,
  ComparisonRouteSelection,
} from './types';
import {
  PUTTUR_SEGMENTS,
  TARGET_INCIDENT_SEGMENT_ID,
  ORIGIN_NODE_ID,
  DESTINATION_NODE_ID,
  RIDERS,
} from './data/putturNetwork';
import { computeShortestRoute } from './utils/routing';
import { canRiderObserve, evaluateConsensus } from './utils/verification';
import {
  saveStateToStorage,
  loadStateFromStorage,
  clearStorage,
} from './utils/storage';

export const App: React.FC = () => {
  // Baseline initial route (4.8 km via Darbe)
  const initialBaseRoute = useMemo(
    () => computeShortestRoute(ORIGIN_NODE_ID, DESTINATION_NODE_ID, []),
    []
  );

  // Core State
  const [currentRider, setCurrentRider] = useState<RiderId>('rider_a');
  const [selectedSegmentId, setSelectedSegmentId] = useState<string>(
    TARGET_INCIDENT_SEGMENT_ID
  );
  const [highlightedSegmentId, setHighlightedSegmentId] = useState<string | null>(
    null
  );
  const [observations, setObservations] = useState<Observation[]>([]);
  const [reopeningObservations, setReopeningObservations] = useState<Observation[]>([]);
  const [comparisonSelection, setComparisonSelection] = useState<ComparisonRouteSelection>(
    'detour'
  );
  const [inlineNotice, setInlineNotice] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState<string>('');

  // Hydrate from localStorage once on mount
  useEffect(() => {
    const saved = loadStateFromStorage();
    if (saved) {
      setCurrentRider(saved.currentRider || 'rider_a');
      setSelectedSegmentId(saved.selectedSegmentId || TARGET_INCIDENT_SEGMENT_ID);
      setObservations(saved.observations || []);
      setReopeningObservations(saved.reopeningObservations || []);
      setComparisonSelection(saved.comparisonSelection || 'detour');
    }
  }, []);

  // Compute closed segments across the whole pilot network based on 2-observer consensus
  const closedSegmentIds = useMemo<string[]>(() => {
    const closed: string[] = [];
    const segmentsWithReports = new Set(observations.map((o) => o.segmentId));
    for (const segId of segmentsWithReports) {
      const segObs = observations.filter((o) => o.segmentId === segId);
      const segReopen = reopeningObservations.filter((o) => o.segmentId === segId);
      if (evaluateConsensus(segObs, segReopen) === 'confirmed_closure') {
        closed.push(segId);
      }
    }
    return closed;
  }, [observations, reopeningObservations]);

  // Compute active route reactively based on closed segments
  const activeRoute = useMemo<RouteResult>(() => {
    return computeShortestRoute(ORIGIN_NODE_ID, DESTINATION_NODE_ID, closedSegmentIds);
  }, [closedSegmentIds]);

  // Derive status specifically for the currently selected road
  const selectedSegmentObservations = useMemo(
    () => observations.filter((o) => o.segmentId === selectedSegmentId),
    [observations, selectedSegmentId]
  );

  const selectedSegmentReopenings = useMemo(
    () => reopeningObservations.filter((o) => o.segmentId === selectedSegmentId),
    [reopeningObservations, selectedSegmentId]
  );

  const selectedSegmentStatus = useMemo<IncidentStatus>(() => {
    return evaluateConsensus(selectedSegmentObservations, selectedSegmentReopenings);
  }, [selectedSegmentObservations, selectedSegmentReopenings]);

  // Persist state changes to localStorage
  useEffect(() => {
    const stateToSave: JalamapState = {
      currentRider,
      selectedSegmentId,
      highlightedSegmentId,
      observations,
      reopeningObservations,
      incidentStatus: selectedSegmentStatus,
      comparisonSelection,
      originalRoute: initialBaseRoute,
      activeRoute,
      lastActionMessage: inlineNotice || undefined,
    };
    saveStateToStorage(stateToSave);
  }, [
    currentRider,
    selectedSegmentId,
    highlightedSegmentId,
    observations,
    reopeningObservations,
    selectedSegmentStatus,
    comparisonSelection,
    initialBaseRoute,
    activeRoute,
    inlineNotice,
  ]);

  // Handle temporary road highlight
  const handleHighlightSegment = useCallback((segmentId: string) => {
    setHighlightedSegmentId(segmentId);
    setTimeout(() => {
      setHighlightedSegmentId((prev) => (prev === segmentId ? null : prev));
    }, 2800);
  }, []);

  // Action: Reset Demo
  const handleResetDemo = useCallback(() => {
    clearStorage();
    setCurrentRider('rider_a');
    setSelectedSegmentId(TARGET_INCIDENT_SEGMENT_ID);
    setHighlightedSegmentId(null);
    setObservations([]);
    setReopeningObservations([]);
    setComparisonSelection('detour');
    setInlineNotice(null);
    setAnnouncement('Demo reset to initial commute state.');
  }, []);

  // Action: Switch Rider Identity
  const handleSwitchRider = useCallback((riderId: RiderId) => {
    setCurrentRider(riderId);
    setInlineNotice(null);
    setAnnouncement(`Switched demo perspective to ${RIDERS[riderId].shortName}.`);
  }, []);

  // Action: Report Blockage on the Selected Road
  const handleReportBlockage = useCallback(() => {
    const profile = RIDERS[currentRider];
    const targetSegment = PUTTUR_SEGMENTS.find((s) => s.id === selectedSegmentId);
    const segName = targetSegment?.name || 'Selected approach';

    const newObs: Observation = {
      id: `obs-block-${Date.now()}`,
      segmentId: selectedSegmentId,
      riderId: currentRider,
      riderName: profile.shortName,
      type: 'blockage',
      timestamp: '07:18 AM',
      note: selectedSegmentId === TARGET_INCIDENT_SEGMENT_ID
        ? 'Water covers the approach near the junction. Traffic halted.'
        : `Water pooling across roadway on ${segName}. Impassable for two-wheelers.`,
    };

    setObservations((prev) => [...prev, newObs]);
    setInlineNotice(null);
    handleHighlightSegment(selectedSegmentId);
    setAnnouncement(`Blockage reported on ${segName}. Waiting for a second rider.`);
  }, [currentRider, selectedSegmentId, handleHighlightSegment]);

  // Action: Confirm Blockage on the Selected Road
  const handleConfirmBlockage = useCallback(() => {
    // Check if current rider already submitted an observation for this segment
    const check = canRiderObserve(selectedSegmentObservations, currentRider, 'blockage');

    if (!check.canSubmit) {
      setInlineNotice(
        'You already reported this incident. Switch to Rider B to provide independent verification.'
      );
      setAnnouncement(
        'Duplicate report rejected. Consensus requires independent confirmation.'
      );
      return;
    }

    const profile = RIDERS[currentRider];
    const targetSegment = PUTTUR_SEGMENTS.find((s) => s.id === selectedSegmentId);
    const segName = targetSegment?.name || 'Selected approach';

    const newObs: Observation = {
      id: `obs-block-${Date.now()}`,
      segmentId: selectedSegmentId,
      riderId: currentRider,
      riderName: profile.shortName,
      type: 'blockage',
      timestamp: '07:24 AM',
      note: selectedSegmentId === TARGET_INCIDENT_SEGMENT_ID
        ? 'Water rising at Darbe approach, knee-deep. Road impassable.'
        : `Confirmed road impassable on ${segName} due to water accumulation.`,
    };

    setObservations((prev) => [...prev, newObs]);
    setComparisonSelection('detour');
    setInlineNotice(null);
    handleHighlightSegment(selectedSegmentId);

    setAnnouncement(`Consensus confirmed on ${segName}. Route updated.`);
  }, [selectedSegmentObservations, currentRider, selectedSegmentId, handleHighlightSegment]);

  // Action: Report Reopening on the Selected Road
  const handleReportReopening = useCallback(() => {
    const profile = RIDERS[currentRider];
    const newObs: Observation = {
      id: `obs-reopen-${Date.now()}`,
      segmentId: selectedSegmentId,
      riderId: currentRider,
      riderName: profile.shortName,
      type: 'reopening',
      timestamp: '08:05 AM',
      note: 'Water receded. Pickups and autos passing through approach.',
    };

    setReopeningObservations((prev) => [...prev, newObs]);
    setInlineNotice(null);
    handleHighlightSegment(selectedSegmentId);
    setAnnouncement('Road reopening reported by 1 rider. Waiting for a second rider.');
  }, [currentRider, selectedSegmentId, handleHighlightSegment]);

  // Action: Confirm Reopening on the Selected Road
  const handleConfirmReopening = useCallback(() => {
    const check = canRiderObserve(selectedSegmentReopenings, currentRider, 'reopening');

    if (!check.canSubmit) {
      setInlineNotice(
        'You already submitted a reopening observation. A second independent rider is required.'
      );
      return;
    }

    const profile = RIDERS[currentRider];
    const newObs: Observation = {
      id: `obs-reopen-${Date.now()}`,
      segmentId: selectedSegmentId,
      riderId: currentRider,
      riderName: profile.shortName,
      type: 'reopening',
      timestamp: '08:12 AM',
      note: 'Confirmed approach passable. Water level below curb.',
    };

    setReopeningObservations((prev) => [...prev, newObs]);
    setComparisonSelection('detour');
    setInlineNotice(null);
    handleHighlightSegment(selectedSegmentId);
    setAnnouncement('Road confirmed reopened by 2 independent riders.');
  }, [currentRider, selectedSegmentReopenings, selectedSegmentId, handleHighlightSegment]);

  const targetSegment = PUTTUR_SEGMENTS.find((s) => s.id === selectedSegmentId);
  const selectedSegmentName = targetSegment?.name || 'Selected approach';

  return (
    <div className="atlas-app-container">
      {/* Live Region for Screen Readers */}
      <div className="sr-only" role="status" aria-live="assertive" aria-atomic="true">
        {announcement}
      </div>

      {/* Slim, deliberate Header */}
      <Header
        currentRider={currentRider}
        onReset={handleResetDemo}
        onSwitchRider={handleSwitchRider}
      />

      {/* Main Art-Directed Workspace: ~70% Map Atlas + ~30% Incident Sheet */}
      <main className="atlas-main-workspace">
        <section className="atlas-map-pane">
          <MapAtlas
            selectedSegmentId={selectedSegmentId}
            closedSegmentIds={closedSegmentIds}
            activeRoute={activeRoute}
            originalRoute={initialBaseRoute}
            comparisonSelection={comparisonSelection}
            highlightedSegmentId={highlightedSegmentId}
            onSelectSegment={(segId) => {
              setSelectedSegmentId(segId);
              setInlineNotice(null);
              handleHighlightSegment(segId);
            }}
          />
        </section>

        <section className="atlas-sheet-pane">
          <IncidentSheet
            currentRider={currentRider}
            selectedSegmentId={selectedSegmentId}
            selectedSegmentStatus={selectedSegmentStatus}
            selectedSegmentName={selectedSegmentName}
            observations={selectedSegmentObservations}
            reopeningObservations={selectedSegmentReopenings}
            activeRoute={activeRoute}
            originalRoute={initialBaseRoute}
            comparisonSelection={comparisonSelection}
            onSetComparisonSelection={setComparisonSelection}
            onReportBlockage={handleReportBlockage}
            onConfirmBlockage={handleConfirmBlockage}
            onSwitchRider={handleSwitchRider}
            onReportReopening={handleReportReopening}
            onConfirmReopening={handleConfirmReopening}
            onSelectObservation={(segId) => handleHighlightSegment(segId)}
            inlineNotice={inlineNotice}
          />
        </section>
      </main>
    </div>
  );
};

export default App;
