import { CameraRecord, CameraFrame } from '../types';

/**
 * Prototype choice: 10-minute maximum temporal window between rider report and camera frame.
 * Documented in README as a prototype choice.
 */
export const CAMERA_FRAME_WINDOW_MINUTES = 10;

export const CAMERA_REGISTRY: Record<string, CameraRecord> = {
  'CAM-01': {
    id: 'CAM-01',
    roadSegmentId: 'seg_bolwar_darbe',
    roadName: 'Darbe West Approach (Main Rd)',
    viewingDirection: 'Facing East towards Darbe Junction',
    locationDescription: 'Mounted on utility mast #14, Bolwar–Darbe corridor',
    mapMarker: {
      x: 350,
      y: 362,
      angleDegrees: 0, // Points East along the road towards Darbe Junction (480, 370)
    },
    frames: [
      {
        id: 'FRM-20261120-0812',
        cameraId: 'CAM-01',
        roadSegmentId: 'seg_bolwar_darbe',
        timestamp: '08:12 IST',
        imageUrl: '/assets/cctv/cam-01-darbe-west.png',
        thumbnailUrl: '/assets/cctv/cam-01-darbe-west-thumb.png',
        sourceLabel: 'Recorded demo frame',
        isIllustrative: true,
        roadName: 'Darbe West Approach (Main Rd)',
        viewingDirection: 'Facing East towards Darbe Junction',
      },
    ],
  },
  'CAM-02': {
    id: 'CAM-02',
    roadSegmentId: 'seg_darbe_bannur',
    roadName: 'Darbe – Bannur Arterial',
    viewingDirection: 'Facing Northeast toward Bannur Cross',
    locationDescription: 'Mounted on gantry mast #08, Darbe–Bannur connector',
    mapMarker: {
      x: 540,
      y: 330,
      angleDegrees: -40,
    },
    frames: [
      {
        id: 'FRM-20261120-0745',
        cameraId: 'CAM-02',
        roadSegmentId: 'seg_darbe_bannur',
        timestamp: '07:45 IST',
        imageUrl: '/assets/cctv/cam-02-darbe-bannur.png',
        thumbnailUrl: '/assets/cctv/cam-02-darbe-bannur.png',
        sourceLabel: 'Recorded demo frame',
        isIllustrative: true,
        roadName: 'Darbe – Bannur Arterial',
        viewingDirection: 'Facing Northeast toward Bannur Cross',
      },
    ],
  },
};

/**
 * Returns the camera record registered for a road segment, or undefined if not covered.
 */
export function getCameraForSegment(segmentId: string): CameraRecord | undefined {
  return Object.values(CAMERA_REGISTRY).find((c) => c.roadSegmentId === segmentId);
}

/**
 * Parses time strings like "08:14 IST", "08:14 AM", "08:14" into minutes from midnight.
 */
export function parseTimeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  // Match HH:MM
  const match = timeStr.match(/(\d{1,2}):(\d{2})/);
  if (!match) return 0;
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);

  // If PM is explicitly mentioned and hours < 12
  if (/PM/i.test(timeStr) && hours < 12) {
    hours += 12;
  } else if (/AM/i.test(timeStr) && hours === 12) {
    hours = 0;
  }

  return hours * 60 + minutes;
}

export interface TimeDifferenceResult {
  diffMinutes: number; // positive = frame captured before report; negative = frame captured after report
  absDiffMinutes: number;
  label: string;
}

/**
 * Calculates temporal relationship between report time and camera frame capture time.
 */
export function calculateTimeDifference(
  reportTime: string,
  frameTime: string
): TimeDifferenceResult {
  const repMin = parseTimeToMinutes(reportTime);
  const frmMin = parseTimeToMinutes(frameTime);
  const diffMinutes = repMin - frmMin;
  const absDiffMinutes = Math.abs(diffMinutes);

  let label: string;
  if (absDiffMinutes === 0) {
    label = 'Captured at the same time as report';
  } else if (diffMinutes > 0) {
    label = `${absDiffMinutes} minute${absDiffMinutes === 1 ? '' : 's'} before the report`;
  } else {
    label = `${absDiffMinutes} minute${absDiffMinutes === 1 ? '' : 's'} after the report`;
  }

  return {
    diffMinutes,
    absDiffMinutes,
    label,
  };
}

export interface FrameMatchResult {
  status: 'no_camera' | 'no_frame_in_window' | 'match';
  camera?: CameraRecord;
  nearestFrame?: CameraFrame;
  diffResult?: TimeDifferenceResult;
}

/**
 * Evaluates whether a camera covers the segment and if a frame is within the window.
 */
export function getFrameReportMatch(
  segmentId: string,
  reportTimestamp: string,
  windowMinutes: number = CAMERA_FRAME_WINDOW_MINUTES
): FrameMatchResult {
  const camera = getCameraForSegment(segmentId);
  if (!camera || camera.frames.length === 0) {
    return { status: 'no_camera' };
  }

  // Find nearest frame by absolute minute difference
  const repMin = parseTimeToMinutes(reportTimestamp);
  let nearestFrame: CameraFrame = camera.frames[0];
  let minDiff = Math.abs(repMin - parseTimeToMinutes(nearestFrame.timestamp));

  for (let i = 1; i < camera.frames.length; i++) {
    const d = Math.abs(repMin - parseTimeToMinutes(camera.frames[i].timestamp));
    if (d < minDiff) {
      minDiff = d;
      nearestFrame = camera.frames[i];
    }
  }

  const diffResult = calculateTimeDifference(reportTimestamp, nearestFrame.timestamp);

  if (diffResult.absDiffMinutes > windowMinutes) {
    return {
      status: 'no_frame_in_window',
      camera,
      nearestFrame,
      diffResult,
    };
  }

  return {
    status: 'match',
    camera,
    nearestFrame,
    diffResult,
  };
}
