import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Header } from './components/Header';
import { NavigationControls } from './components/NavigationControls';
import { MapAtlas } from './components/MapAtlas';
import { AlertBanner } from './components/AlertBanner';
import { ReportModal } from './components/ReportModal';
import { RainWatchModal } from './components/RainWatchModal';
import { DemoPanel } from './components/DemoPanel';
import {
  RouteResult,
  RoadRestriction,
  VehiclePosition,
  NavigationStatus,
  AlertNotification,
  ObservationCondition,
} from './types';
import {
  ORIGIN_NODE_ID,
  DESTINATION_NODE_ID,
  PUTTUR_SEGMENTS,
  PUTTUR_NODES,
} from './data/putturNetwork';
import {
  computeShortestRoute,
  getPointAlongSegment,
  recalculateRouteFromPosition,
  doesRestrictionAffectRemainingRoute,
} from './utils/routing';
import { dbService } from './services/database';
import { cctvService } from './services/cctvService';
import { getRainWatchStatus } from './services/weatherService';

export const App: React.FC = () => {
  // Navigation & Origin/Destination State
  const [originId, setOriginId] = useState<string>(ORIGIN_NODE_ID);
  const [destinationId, setDestinationId] = useState<string>(DESTINATION_NODE_ID);
  const [navigationStatus, setNavigationStatus] = useState<NavigationStatus>('idle');

  // Road restrictions and observations from shared database / local engine
  const [restrictions, setRestrictions] = useState<Map<string, RoadRestriction>>(
    () => dbService.getRestrictions()
  );
  const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(null);
  const [highlightedSegmentId, setHighlightedSegmentId] = useState<string | null>(null);

  // Dynamic Route Tracking
  const [originalRoute, setOriginalRoute] = useState<RouteResult | null>(null);
  const [activeRoute, setActiveRoute] = useState<RouteResult | null>(null);
  const [remainingDistanceKm, setRemainingDistanceKm] = useState<number | undefined>(undefined);

  // Vehicle Simulation State
  const [vehiclePosition, setVehiclePosition] = useState<VehiclePosition | null>(null);
  const journeyProgressRef = useRef<{
    segmentIndex: number;
    ratio: number;
    activeSegmentIds: string[];
    isReverse: boolean;
  }>({
    segmentIndex: 0,
    ratio: 0,
    activeSegmentIds: [],
    isReverse: false,
  });

  // UI Modals & Drawers
  const [isReportModalOpen, setIsReportModalOpen] = useState<boolean>(false);
  const [isRainWatchOpen, setIsRainWatchOpen] = useState<boolean>(false);
  const [isDemoPanelOpen, setIsDemoPanelOpen] = useState<boolean>(false);
  const [activeScenario, setActiveScenario] = useState<string | null>(null);
  const [alert, setAlert] = useState<AlertNotification | null>(null);

  // Weather data
  const weatherData = useMemo(() => getRainWatchStatus(), []);
  const connectionStatus = useMemo(() => dbService.getConnectedStatus(), []);

  // Show temporary nonintrusive alert
  const showAlert = useCallback(
    (type: 'warning' | 'reroute' | 'reopened' | 'info', title: string, message: string) => {
      setAlert({
        id: `alert-${Date.now()}`,
        type,
        title,
        message,
        timestamp: Date.now(),
      });
    },
    []
  );

  // 1. Subscribe to Authoritative Restrictions & Observations
  useEffect(() => {
    const unsubscribeDb = dbService.subscribe(({ restrictions: newRestr }) => {
      setRestrictions(newRestr);
    });

    const unsubscribeCctv = cctvService.subscribe((cctvEvent) => {
      // Ingest background CCTV hazard directly into database service
      dbService.recordCctvEvent(cctvEvent);
    });

    return () => {
      unsubscribeDb();
      unsubscribeCctv();
    };
  }, []);

  // 2. Initial Route Calculation
  useEffect(() => {
    if (navigationStatus === 'idle') {
      const route = computeShortestRoute(originId, destinationId, restrictions);
      setActiveRoute(route);
      setOriginalRoute(route);
      setRemainingDistanceKm(route.totalDistanceKm);
    }
  }, [originId, destinationId, navigationStatus, restrictions]);

  // 3. Dynamic Rerouting Engine (Listens to Road Condition Changes During Active Navigation)
  const prevRestrictionsRef = useRef<Map<string, RoadRestriction>>(restrictions);

  useEffect(() => {
    const prevRestr = prevRestrictionsRef.current;
    prevRestrictionsRef.current = restrictions;

    if (navigationStatus !== 'navigating' || !activeRoute || !vehiclePosition) {
      return;
    }

    // Identify which segments changed restriction status
    const changedSegments: { id: string; restriction: RoadRestriction }[] = [];
    for (const [segId, curr] of restrictions.entries()) {
      const prev = prevRestr.get(segId);
      if (!prev || prev.status !== curr.status) {
        changedSegments.push({ id: segId, restriction: curr });
      }
    }

    if (changedSegments.length === 0) return;

    // Remaining path segments ahead of the current vehicle position
    const currentSegIndex = journeyProgressRef.current.segmentIndex;
    const remainingSegmentsAhead = activeRoute.segmentIds.slice(currentSegIndex);

    let needsReroute = false;
    let reasonMessage = '';
    let isReopenEvent = false;

    for (const { id: changedId, restriction } of changedSegments) {
      // Check if this segment lies ahead on the remaining journey
      const affectsRemaining = doesRestrictionAffectRemainingRoute(
        changedId,
        remainingSegmentsAhead
      );

      if (affectsRemaining) {
        if (
          restriction.status === 'confirmed_blocked' ||
          restriction.status === 'provisional_hazard'
        ) {
          needsReroute = true;
          if (restriction.sources.includes('cctv')) {
            reasonMessage =
              'Possible flooding detected ahead by background CCTV. Alternative route selected.';
          } else {
            reasonMessage = `${restriction.reason} Route automatically updated.`;
          }
          break;
        }
      }

      // Check if a road reopened that could provide a meaningfully shorter path
      if (restriction.status === 'passable') {
        isReopenEvent = true;
      }
    }

    // Execute automatic reroute from CURRENT VEHICLE POSITION
    if (needsReroute || isReopenEvent) {
      const { newRoute, remainingDistanceKm: newRemainingDist } = recalculateRouteFromPosition(
        vehiclePosition.segmentId,
        vehiclePosition.progressRatio,
        vehiclePosition.fromNodeId,
        vehiclePosition.toNodeId,
        destinationId,
        restrictions
      );

      if (!newRoute.isFound) {
        showAlert(
          'warning',
          'No Alternative Route',
          'No available alternative found in the mapped pilot network.'
        );
        return;
      }

      // If reopened, verify the new route is actually shorter before switching
      if (isReopenEvent && !needsReroute) {
        const currentRemaining = remainingDistanceKm || 999;
        if (newRemainingDist >= currentRemaining - 0.2) {
          return; // Skip route flickering if alternative isn't meaningfully better
        }
        reasonMessage = 'Road verified passable. Route updated to faster path.';
      }

      // Update active route with remaining segments
      setActiveRoute(newRoute);
      setRemainingDistanceKm(newRemainingDist);

      // Adjust journey progress index to the new route segments
      journeyProgressRef.current = {
        segmentIndex: 0,
        ratio: vehiclePosition.progressRatio,
        activeSegmentIds: newRoute.segmentIds,
        isReverse: false,
      };

      showAlert(
        isReopenEvent ? 'reopened' : 'reroute',
        isReopenEvent ? 'Road Reopened' : 'Route Updated Automatically',
        reasonMessage
      );
    }
  }, [
    restrictions,
    navigationStatus,
    activeRoute,
    vehiclePosition,
    destinationId,
    remainingDistanceKm,
    showAlert,
  ]);

  // 4. Vehicle Journey Simulation Loop
  useEffect(() => {
    if (navigationStatus !== 'navigating' || !activeRoute || !activeRoute.isFound) {
      return;
    }

    const segments = activeRoute.segmentIds;
    if (segments.length === 0) return;

    journeyProgressRef.current.activeSegmentIds = segments;

    const interval = setInterval(() => {
      const state = journeyProgressRef.current;
      const currentSegId = state.activeSegmentIds[state.segmentIndex];

      if (!currentSegId) {
        // Commuter has reached the destination!
        setNavigationStatus('arrived');
        setRemainingDistanceKm(0);
        showAlert(
          'info',
          'Destination Reached',
          `You have safely arrived at ${PUTTUR_NODES[destinationId]?.shortLabel || 'destination'}.`
        );
        clearInterval(interval);
        return;
      }

      const seg = PUTTUR_SEGMENTS.find((s) => s.id === currentSegId);
      if (!seg) return;

      // Advance ratio along the segment
      const step = 0.035; // Smooth incremental movement
      let nextRatio = state.ratio + step;

      // Determine heading and orientation between nodes
      const isReverse = state.isReverse;
      const coords = getPointAlongSegment(currentSegId, Math.min(1, nextRatio), isReverse);

      const fromNode = isReverse ? seg.to : seg.from;
      const toNode = isReverse ? seg.from : seg.to;

      setVehiclePosition({
        segmentId: currentSegId,
        progressRatio: Math.min(1, nextRatio),
        x: coords.x,
        y: coords.y,
        headingDeg: coords.headingDeg,
        fromNodeId: fromNode,
        toNodeId: toNode,
      });

      // Recalculate remaining distance dynamically as vehicle travels
      const remainingSegments = state.activeSegmentIds.slice(state.segmentIndex + 1);
      const remainingOnFutureSegments = remainingSegments.reduce((acc, sid) => {
        const s = PUTTUR_SEGMENTS.find((item) => item.id === sid);
        return acc + (s?.distanceKm || 0);
      }, 0);
      const remainingOnCurr = seg.distanceKm * Math.max(0, 1 - nextRatio);
      setRemainingDistanceKm(Number((remainingOnCurr + remainingOnFutureSegments).toFixed(1)));

      if (nextRatio >= 1.0) {
        // Transition to next road segment along the route
        const nextIndex = state.segmentIndex + 1;
        if (nextIndex < state.activeSegmentIds.length) {
          const nextSegId = state.activeSegmentIds[nextIndex];
          const nextSeg = PUTTUR_SEGMENTS.find((s) => s.id === nextSegId);
          // Check if next segment connects backwards
          const nextIsReverse = nextSeg ? nextSeg.to === toNode : false;

          journeyProgressRef.current = {
            segmentIndex: nextIndex,
            ratio: 0,
            activeSegmentIds: state.activeSegmentIds,
            isReverse: nextIsReverse,
          };
        } else {
          // Reached destination!
          setNavigationStatus('arrived');
          setRemainingDistanceKm(0);
          showAlert(
            'info',
            'Destination Reached',
            `You have arrived at ${PUTTUR_NODES[destinationId]?.shortLabel || 'destination'}.`
          );
          clearInterval(interval);
        }
      } else {
        journeyProgressRef.current.ratio = nextRatio;
      }
    }, 140);

    return () => clearInterval(interval);
  }, [navigationStatus, activeRoute, destinationId, showAlert]);

  // Handler: Start Navigation
  const handleStartNavigation = useCallback(() => {
    if (!activeRoute || !activeRoute.isFound) return;

    setNavigationStatus('navigating');
    setOriginalRoute(activeRoute);

    const firstSegId = activeRoute.segmentIds[0];
    const firstSeg = PUTTUR_SEGMENTS.find((s) => s.id === firstSegId);
    const coords = firstSeg ? getPointAlongSegment(firstSegId, 0, false) : { x: 140, y: 440, headingDeg: 0 };

    setVehiclePosition({
      segmentId: firstSegId,
      progressRatio: 0,
      x: coords.x,
      y: coords.y,
      headingDeg: coords.headingDeg,
      fromNodeId: firstSeg?.from || originId,
      toNodeId: firstSeg?.to || originId,
    });

    journeyProgressRef.current = {
      segmentIndex: 0,
      ratio: 0,
      activeSegmentIds: activeRoute.segmentIds,
      isReverse: false,
    };

    showAlert('info', 'Navigation Started', `Heading to ${PUTTUR_NODES[destinationId]?.shortLabel}. Monitoring road conditions automatically.`);
  }, [activeRoute, originId, destinationId, showAlert]);

  // Handler: Stop Navigation
  const handleStopNavigation = useCallback(() => {
    setNavigationStatus('idle');
    setVehiclePosition(null);
    journeyProgressRef.current = {
      segmentIndex: 0,
      ratio: 0,
      activeSegmentIds: [],
      isReverse: false,
    };
    showAlert('info', 'Trip Ended', 'Navigation stopped.');
  }, [showAlert]);

  // Handler: Community Report Submission
  const handleSubmitReport = useCallback(
    ({
      segmentId,
      condition,
      note,
    }: {
      segmentId: string;
      condition: ObservationCondition;
      note: string;
    }) => {
      const user = dbService.getCurrentUser();
      dbService.submitObservation({
        segmentId,
        userId: user.id,
        userName: user.name,
        userRole: user.role,
        condition,
        note,
        source: 'community',
      });

      showAlert(
        'info',
        'Observation Submitted',
        'Thank you! Your observation was processed and evaluated automatically.'
      );
    },
    [showAlert]
  );

  // -------------------------------------------------------------
  // HACKATHON DEMONSTRATION SCENARIOS (Phase 9 & Phase 13)
  // -------------------------------------------------------------

  // Scenario 1: Normal Journey
  const handleRunScenario1 = useCallback(() => {
    setActiveScenario('scenario_1');
    dbService.resetToInitialState();
    setOriginId('kallare');
    setDestinationId('kombettu');

    setTimeout(() => {
      const route = computeShortestRoute('kallare', 'kombettu', []);
      setActiveRoute(route);
      setOriginalRoute(route);
      setNavigationStatus('navigating');

      const firstSegId = route.segmentIds[0];
      const coords = getPointAlongSegment(firstSegId, 0, false);
      setVehiclePosition({
        segmentId: firstSegId,
        progressRatio: 0,
        x: coords.x,
        y: coords.y,
        headingDeg: coords.headingDeg,
        fromNodeId: 'kallare',
        toNodeId: 'bolwar',
      });

      journeyProgressRef.current = {
        segmentIndex: 0,
        ratio: 0,
        activeSegmentIds: route.segmentIds,
        isReverse: false,
      };

      showAlert('info', 'Scenario 1 Active', 'Normal commute Kallare → Kombettu started via Darbe (4.8 km).');
    }, 100);
  }, [showAlert]);

  // Scenario 2: Mid-Journey CCTV Hazard (Automated rerouting from current position)
  const handleRunScenario2 = useCallback(() => {
    setActiveScenario('scenario_2');

    // Simulate vehicle reaching a point before Darbe Junction (midway on seg_kallare_bolwar approaching Bolwar)
    setOriginId('kallare');
    setDestinationId('kombettu');
    setNavigationStatus('navigating');

    const coords = getPointAlongSegment('seg_kallare_bolwar', 0.65, false);
    setVehiclePosition({
      segmentId: 'seg_kallare_bolwar',
      progressRatio: 0.65,
      x: coords.x,
      y: coords.y,
      headingDeg: coords.headingDeg,
      fromNodeId: 'kallare',
      toNodeId: 'bolwar',
    });

    journeyProgressRef.current = {
      segmentIndex: 0,
      ratio: 0.65,
      activeSegmentIds: ['seg_kallare_bolwar', 'seg_bolwar_darbe', 'seg_darbe_bannur', 'seg_bannur_kombettu'],
      isReverse: false,
    };

    // Trigger background CCTV hazard (CAM-01 on Darbe West Approach)
    // No camera footage shown to user!
    setTimeout(() => {
      cctvService.triggerHazardDetection('CAM-01', 0.92, 'waterlogging');
    }, 400);
  }, []);

  // Scenario 3: Community Consensus (3 distinct reports on road without CCTV)
  const handleRunScenario3 = useCallback(() => {
    setActiveScenario('scenario_3');

    // Submit 3 distinct independent community reports on Darbe–Bannur Arterial (seg_darbe_bannur)
    const users = [
      { id: 'usr-karthik', name: 'Karthik (Auto Driver)', role: 'auto_driver' as const },
      { id: 'usr-ananya', name: 'Ananya (Delivery)', role: 'delivery_partner' as const },
      { id: 'usr-ramesh', name: 'Ramesh (Commuter)', role: 'commuter' as const },
    ];

    users.forEach((u, i) => {
      setTimeout(() => {
        dbService.submitObservation({
          segmentId: 'seg_darbe_bannur',
          userId: u.id,
          userName: u.name,
          userRole: u.role,
          condition: 'blocked',
          note: `Water across road at km 1.4 near culvert. Report #${i + 1}`,
          source: 'community',
        });
      }, i * 350);
    });
  }, []);

  // Scenario 4: Road Reopening (3 passable reports)
  const handleRunScenario4 = useCallback(() => {
    setActiveScenario('scenario_4');

    const users = [
      { id: 'usr-reopen-1', name: 'Suma (Local Resident)', role: 'local_resident' as const },
      { id: 'usr-reopen-2', name: 'Prasad (Bus Driver)', role: 'commuter' as const },
      { id: 'usr-reopen-3', name: 'Naveen (Commuter)', role: 'commuter' as const },
    ];

    users.forEach((u, i) => {
      setTimeout(() => {
        dbService.submitObservation({
          segmentId: 'seg_bolwar_darbe',
          userId: u.id,
          userName: u.name,
          userRole: u.role,
          condition: 'passable',
          note: 'Water receded below curb. Pickups and two-wheelers passing freely.',
          source: 'community',
        });
      }, i * 300);
    });

    // Also emit CCTV clearance detection
    setTimeout(() => {
      cctvService.triggerClearanceDetection('CAM-01', 0.94);
    }, 1100);
  }, []);

  // Scenario 5: Second Blockage mid-detour
  const handleRunScenario5 = useCallback(() => {
    setActiveScenario('scenario_5');

    // Block the detour corridor (Town Bypass: seg_courthill_town)
    const users = [
      { id: 'usr-sec-1', name: 'Citizen 1', role: 'commuter' as const },
      { id: 'usr-sec-2', name: 'Citizen 2', role: 'delivery_partner' as const },
      { id: 'usr-sec-3', name: 'Citizen 3', role: 'emergency_responder' as const },
    ];

    users.forEach((u, i) => {
      setTimeout(() => {
        dbService.submitObservation({
          segmentId: 'seg_courthill_town',
          userId: u.id,
          userName: u.name,
          userRole: u.role,
          condition: 'blocked',
          note: 'Tree branch down across Town Bypass lane.',
          source: 'community',
        });
      }, i * 250);
    });
  }, []);

  // Scale Stress Test: Arbitrary contributors (3, 20, 100)
  const handleRunStressTest = useCallback(
    (contributorCount: number) => {
      const now = Date.now();
      for (let i = 0; i < contributorCount; i++) {
        dbService.submitObservation({
          segmentId: 'seg_bolwar_darbe',
          userId: `sim-user-${i}-${now}`,
          userName: `Citizen Contributor #${i + 1}`,
          userRole: 'commuter',
          condition: 'blocked',
          note: `Scale test report #${i + 1}`,
          source: 'community',
        });
      }
      showAlert(
        'info',
        'Scale Test Executed',
        `Processed ${contributorCount} distinct independent contributor submissions. Consensus evaluated automatically.`
      );
    },
    [showAlert]
  );

  // Reset Demo
  const handleResetDemo = useCallback(() => {
    dbService.resetToInitialState();
    cctvService.clearHistory();
    setNavigationStatus('idle');
    setVehiclePosition(null);
    setOriginId('kallare');
    setDestinationId('kombettu');
    setActiveScenario(null);
    setAlert(null);

    const route = computeShortestRoute('kallare', 'kombettu', []);
    setActiveRoute(route);
    setOriginalRoute(route);
    setRemainingDistanceKm(route.totalDistanceKm);

    showAlert('info', 'Demo Reset', 'Reset to initial clean pilot navigation state.');
  }, [showAlert]);

  return (
    <div className="atlas-app-container">
      {/* Accessible Live Region */}
      <div className="sr-only" role="status" aria-live="assertive" aria-atomic="true">
        {alert?.message}
      </div>

      {/* Clean Navigation-First Header */}
      <Header
        onOpenWeather={() => setIsRainWatchOpen(true)}
        onToggleDemoPanel={() => setIsDemoPanelOpen(!isDemoPanelOpen)}
        isDemoPanelOpen={isDemoPanelOpen}
        connectionStatus={connectionStatus}
        weatherAlertLevel={weatherData.alertLevel}
      />

      {/* Main Map Workspace (~75% screen area) */}
      <main className="atlas-main-workspace" role="main">
        {/* Floating Top Navigation Controls */}
        <NavigationControls
          originId={originId}
          destinationId={destinationId}
          onChangeOrigin={setOriginId}
          onChangeDestination={setDestinationId}
          navigationStatus={navigationStatus}
          onStartNavigation={handleStartNavigation}
          onStopNavigation={handleStopNavigation}
          activeRoute={activeRoute}
          remainingDistanceKm={remainingDistanceKm}
          onOpenReportModal={() => setIsReportModalOpen(true)}
        />

        {/* Floating Nonintrusive Alert HUD */}
        <AlertBanner alert={alert} onDismiss={() => setAlert(null)} />

        {/* Full Interactive Cartographic Map Atlas */}
        <MapAtlas
          restrictions={restrictions}
          activeRoute={activeRoute}
          originalRoute={originalRoute}
          vehiclePosition={vehiclePosition}
          selectedSegmentId={selectedSegmentId}
          highlightedSegmentId={highlightedSegmentId}
          onSelectSegment={(segId) => {
            setSelectedSegmentId(segId);
            setHighlightedSegmentId(segId);
            setTimeout(() => setHighlightedSegmentId(null), 2500);
          }}
          onQuickReportSegment={(segId) => {
            setSelectedSegmentId(segId);
            setIsReportModalOpen(true);
          }}
          originId={originId}
          destinationId={destinationId}
        />
      </main>

      {/* Quick Community Report Modal */}
      <ReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        defaultSegmentId={selectedSegmentId || 'seg_bolwar_darbe'}
        onSubmitReport={handleSubmitReport}
      />

      {/* RainWatch Situational Weather Modal */}
      <RainWatchModal
        isOpen={isRainWatchOpen}
        onClose={() => setIsRainWatchOpen(false)}
        data={weatherData}
      />

      {/* Collapsed Simulation Studio Drawer */}
      <DemoPanel
        isOpen={isDemoPanelOpen}
        onClose={() => setIsDemoPanelOpen(false)}
        onRunScenario1={handleRunScenario1}
        onRunScenario2={handleRunScenario2}
        onRunScenario3={handleRunScenario3}
        onRunScenario4={handleRunScenario4}
        onRunScenario5={handleRunScenario5}
        onRunStressTest={handleRunStressTest}
        onResetDemo={handleResetDemo}
        activeScenario={activeScenario}
      />
    </div>
  );
};

export default App;
