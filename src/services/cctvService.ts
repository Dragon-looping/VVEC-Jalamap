import { CctvDetectionEvent } from '../types';

export interface CameraConfig {
  cameraId: string;
  roadSegmentId: string;
  roadName: string;
  locationDescription: string;
  status: 'active' | 'standby';
}

/**
 * Registered Pilot CCTV Cameras in Puttur
 * Associated strictly with specific road segments.
 */
export const PUTTUR_CCTV_REGISTRY: Record<string, CameraConfig> = {
  'CAM-01': {
    cameraId: 'CAM-01',
    roadSegmentId: 'seg_bolwar_darbe',
    roadName: 'Darbe West Approach (Main Rd)',
    locationDescription: 'Utility Mast #14, Bolwar–Darbe Corridor',
    status: 'active',
  },
  'CAM-02': {
    cameraId: 'CAM-02',
    roadSegmentId: 'seg_darbe_bannur',
    roadName: 'Darbe – Bannur Arterial',
    locationDescription: 'Gantry Mast #08, Darbe–Bannur Connector',
    status: 'active',
  },
  'CAM-03': {
    cameraId: 'CAM-03',
    roadSegmentId: 'seg_courthill_town',
    roadName: 'Town Bypass / Ring Corridor',
    locationDescription: 'Pole #22, Town Bypass Radial',
    status: 'active',
  },
  'CAM-04': {
    cameraId: 'CAM-04',
    roadSegmentId: 'seg_kallare_mukwe',
    roadName: 'Mukwe South Ring',
    locationDescription: 'Mast #05, Mukwe South Approach',
    status: 'active',
  },
};

type CctvListener = (event: CctvDetectionEvent) => void;

class CctvService {
  private listeners: Set<CctvListener> = new Set();
  private eventHistory: CctvDetectionEvent[] = [];

  /**
   * Subscribe to background CCTV detection events.
   * Commuter UI never sees footage or controls; routing engine listens to this.
   */
  public subscribe(listener: CctvListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Dispatches an event to subscribers and logs history.
   */
  private emitEvent(event: CctvDetectionEvent): void {
    this.eventHistory.push(event);
    this.listeners.forEach((listener) => {
      try {
        listener(event);
      } catch (err) {
        console.error('Error in CCTV subscriber handler:', err);
      }
    });
  }

  /**
   * Triggers a deterministic background CCTV waterlogging/hazard detection.
   * Explicitly flagged as demonstration data for hackathon evaluation.
   */
  public triggerHazardDetection(
    cameraId: string = 'CAM-01',
    confidence: number = 0.88,
    category: 'waterlogging' | 'obstruction' = 'waterlogging'
  ): CctvDetectionEvent {
    const config = PUTTUR_CCTV_REGISTRY[cameraId] || PUTTUR_CCTV_REGISTRY['CAM-01'];

    const event: CctvDetectionEvent = {
      eventId: `CCTV-EVT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      cameraId: config.cameraId,
      segmentId: config.roadSegmentId,
      category,
      timestamp: Date.now(),
      confidence,
      recommendation: confidence >= 0.85 ? 'confirmed_closure' : 'avoid_hazard',
      evidenceFreshnessMinutes: 1,
      isDemonstration: true, // Explicit label: Never claim to be live unauthorized surveillance
      notes: `Demonstration feed telemetry: Surface water accumulation detected on ${config.roadName}.`,
    };

    this.emitEvent(event);
    return event;
  }

  /**
   * Triggers a sustained clearance detection event from background camera analysis.
   */
  public triggerClearanceDetection(
    cameraId: string = 'CAM-01',
    confidence: number = 0.92
  ): CctvDetectionEvent {
    const config = PUTTUR_CCTV_REGISTRY[cameraId] || PUTTUR_CCTV_REGISTRY['CAM-01'];

    const event: CctvDetectionEvent = {
      eventId: `CCTV-EVT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      cameraId: config.cameraId,
      segmentId: config.roadSegmentId,
      category: 'clear',
      timestamp: Date.now(),
      confidence,
      recommendation: 'clearance',
      evidenceFreshnessMinutes: 1,
      isDemonstration: true,
      notes: `Demonstration feed telemetry: Road surface clear of standing water on ${config.roadName}.`,
    };

    this.emitEvent(event);
    return event;
  }

  public getHistory(): CctvDetectionEvent[] {
    return [...this.eventHistory];
  }

  public clearHistory(): void {
    this.eventHistory = [];
  }
}

export const cctvService = new CctvService();
