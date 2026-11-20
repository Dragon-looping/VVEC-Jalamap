export type NodeId = 
  | 'kallare'
  | 'bolwar'
  | 'darbe'
  | 'courthill'
  | 'town'
  | 'bannur'
  | 'kombettu'
  | 'parladka'
  | 'mukwe';

export interface RoadNode {
  id: string;
  label: string;
  shortLabel: string;
  x: number;
  y: number;
  kind: 'origin' | 'destination' | 'junction' | 'waypoint';
}

export interface RoadSegment {
  id: string;
  from: string;
  to: string;
  name: string;
  distanceKm: number;
  pathD: string;
  isSecondary?: boolean;
}

export interface RouteResult {
  nodeIds: string[];
  segmentIds: string[];
  totalDistanceKm: number;
  isFound: boolean;
  pathD: string;
}

// Multi-contributor observation types
export type ObservationCondition = 
  | 'blocked' 
  | 'partially_blocked' 
  | 'passable' 
  | 'not_sure';

export type ContributorRole = 
  | 'commuter' 
  | 'delivery_partner' 
  | 'auto_driver' 
  | 'emergency_responder' 
  | 'local_resident';

export interface UserProfile {
  id: string;
  name: string;
  role: ContributorRole;
  trustScore?: number;
}

export interface CommunityObservation {
  id: string;
  segmentId: string;
  userId: string;
  userName: string;
  userRole?: ContributorRole;
  condition: ObservationCondition;
  timestamp: number; // Unix epoch ms
  displayTime: string; // e.g. "08:14 IST"
  note?: string;
  imageUrl?: string;
  source: 'community' | 'cctv_simulation' | 'official';
}

// Authoritative road condition & restriction
export type RoadRestrictionStatus = 
  | 'passable' 
  | 'provisional_hazard' 
  | 'confirmed_blocked' 
  | 'reopening_review';

export interface RoadRestriction {
  segmentId: string;
  status: RoadRestrictionStatus;
  reason: string;
  penaltyMultiplier: number; // 1.0 = passable, 6.0 = provisional avoid, Infinity = confirmed blocked
  lastUpdated: number;
  sources: ('cctv' | 'community' | 'official')[];
  evidenceSummary: {
    distinctBlockCount: number;
    distinctPassableCount: number;
    cctvActive: boolean;
    cctvConfidence?: number;
    lastReportTime?: string;
    description?: string;
  };
}

// Background CCTV event definition
export interface CctvDetectionEvent {
  eventId: string;
  cameraId: string;
  segmentId: string;
  category: 'waterlogging' | 'obstruction' | 'clear';
  timestamp: number;
  confidence: number; // 0.0 - 1.0
  recommendation: 'avoid_hazard' | 'confirmed_closure' | 'clearance';
  evidenceFreshnessMinutes: number;
  isDemonstration: boolean; // Always true for hackathon simulated feeds
  notes?: string;
}

// Vehicle & Journey state
export interface VehiclePosition {
  segmentId: string;
  progressRatio: number; // 0.0 to 1.0 along the current segment
  x: number;
  y: number;
  headingDeg: number;
  fromNodeId: string;
  toNodeId: string;
}

export type NavigationStatus = 'idle' | 'navigating' | 'arrived' | 'rerouting';

export interface AlertNotification {
  id: string;
  type: 'warning' | 'reroute' | 'reopened' | 'info';
  title: string;
  message: string;
  timestamp: number;
  durationMs?: number;
}

export interface NavigationSession {
  id: string;
  originId: string;
  destinationId: string;
  status: NavigationStatus;
  vehiclePosition: VehiclePosition | null;
  activeRoute: RouteResult | null;
  originalRoute: RouteResult | null;
  historySegmentIds: string[];
  remainingSegmentIds: string[];
  rerouteCount: number;
  lastRerouteReason?: string;
}

// RainWatch weather information
export interface RainWatchData {
  location: string;
  district: string;
  alertLevel: 'Green' | 'Yellow' | 'Orange' | 'Red';
  intensity: string;
  currentRainfallMmHr: number;
  lastUpdated: string;
  forecastSummary: string;
  advisory: string;
  source: string;
}

// Legacy definitions preserved for backward compatibility
export type RiderId = 'rider_a' | 'rider_b';

export interface RiderProfile {
  id: RiderId;
  name: string;
  shortName: string;
  badge: string;
}

export type ObservationType = 'blockage' | 'reopening';

export interface Observation {
  id: string;
  segmentId: string;
  riderId: RiderId;
  riderName: string;
  type: ObservationType;
  timestamp: string;
  note: string;
}

export type IncidentStatus = 
  | 'none'
  | 'awaiting_confirmation'
  | 'confirmed_closure'
  | 'reopening_reported';

export type ComparisonRouteSelection = 'detour' | 'original';

export type CameraObservationChoice =
  | 'Water visible on the road'
  | 'Barrier across the lane'
  | 'View obstructed'
  | 'Cannot tell from this frame';

export interface CameraObservation {
  id: string;
  incidentId: string;
  segmentId: string;
  cameraId: string;
  frameId: string;
  captureTime: string;
  selectedObservation: CameraObservationChoice;
  reviewTime: string;
  reviewerName: string;
}

export interface CameraFrame {
  id: string;
  cameraId: string;
  roadSegmentId: string;
  timestamp: string;
  imageUrl: string;
  thumbnailUrl: string;
  sourceLabel: 'Recorded demo frame';
  isIllustrative: boolean;
  roadName: string;
  viewingDirection: string;
}

export interface CameraRecord {
  id: string;
  roadSegmentId: string;
  roadName: string;
  viewingDirection: string;
  locationDescription: string;
  mapMarker: {
    x: number;
    y: number;
    angleDegrees: number;
  };
  frames: CameraFrame[];
}

export interface JalamapState {
  currentRider: RiderId;
  selectedSegmentId: string;
  highlightedSegmentId: string | null;
  observations: Observation[];
  incidentStatus: IncidentStatus;
  reopeningObservations: Observation[];
  cameraObservations?: CameraObservation[];
  comparisonSelection: ComparisonRouteSelection;
  originalRoute: RouteResult | null;
  activeRoute: RouteResult | null;
  lastActionMessage?: string;
}
