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
  captureTime: string; // e.g. '08:12 IST'
  selectedObservation: CameraObservationChoice;
  reviewTime: string; // e.g. '08:15 IST'
  reviewerName: string;
}

export interface CameraFrame {
  id: string;
  cameraId: string;
  roadSegmentId: string;
  timestamp: string; // e.g. '08:12 IST'
  imageUrl: string;
  thumbnailUrl: string;
  sourceLabel: 'Recorded demo frame';
  isIllustrative: boolean;
  roadName: string;
  viewingDirection: string;
}

export interface CameraRecord {
  id: string; // e.g. 'CAM-01'
  roadSegmentId: string; // e.g. 'seg_bolwar_darbe'
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
