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

export interface JalamapState {
  currentRider: RiderId;
  selectedSegmentId: string;
  highlightedSegmentId: string | null;
  observations: Observation[];
  incidentStatus: IncidentStatus;
  reopeningObservations: Observation[];
  comparisonSelection: ComparisonRouteSelection;
  originalRoute: RouteResult | null;
  activeRoute: RouteResult | null;
  lastActionMessage?: string;
}
