import { PUTTUR_SEGMENTS, ORIGIN_NODE_ID, DESTINATION_NODE_ID } from '../data/putturNetwork';
import { RoadSegment, RouteResult, RoadRestriction } from '../types';

interface Edge {
  segment: RoadSegment;
  neighborId: string;
  weight: number;
  isBlocked: boolean;
  isProvisional: boolean;
}

export interface BezierCoordinates {
  x: number;
  y: number;
  headingDeg: number;
}

// Parses SVG path "M x0 y0 C x1 y1 x2 y2 x3 y3"
interface CubicBezierPoints {
  p0: { x: number; y: number };
  p1: { x: number; y: number };
  p2: { x: number; y: number };
  p3: { x: number; y: number };
}

const PARSED_BEZIERS = new Map<string, CubicBezierPoints>();

function parseSegmentBezier(seg: RoadSegment): CubicBezierPoints {
  if (PARSED_BEZIERS.has(seg.id)) {
    return PARSED_BEZIERS.get(seg.id)!;
  }

  const parts = seg.pathD.trim().split(/\s+/);
  if (parts[0] === 'M' && parts[3] === 'C') {
    const p0 = { x: parseFloat(parts[1]), y: parseFloat(parts[2]) };
    const p1 = { x: parseFloat(parts[4]), y: parseFloat(parts[5]) };
    const p2 = { x: parseFloat(parts[6]), y: parseFloat(parts[7]) };
    const p3 = { x: parseFloat(parts[8]), y: parseFloat(parts[9]) };
    const curve = { p0, p1, p2, p3 };
    PARSED_BEZIERS.set(seg.id, curve);
    return curve;
  }

  // Fallback for simple line
  const p0 = { x: 0, y: 0 };
  const p3 = { x: 100, y: 100 };
  return { p0, p1: p0, p2: p3, p3 };
}

/**
 * Calculates exact (x, y) coordinates and heading angle (degrees) along a segment
 * for a given progress ratio (0.0 to 1.0).
 * If reverse is true, progress is from segment.to to segment.from.
 */
export function getPointAlongSegment(
  segmentId: string,
  progressRatio: number,
  reverse: boolean = false
): BezierCoordinates {
  const seg = PUTTUR_SEGMENTS.find((s) => s.id === segmentId);
  if (!seg) {
    return { x: 0, y: 0, headingDeg: 0 };
  }

  const curve = parseSegmentBezier(seg);
  const clampedRatio = Math.max(0, Math.min(1, progressRatio));
  const t = reverse ? 1 - clampedRatio : clampedRatio;

  const mt = 1 - t;
  const mt2 = mt * mt;
  const mt3 = mt2 * mt;
  const t2 = t * t;
  const t3 = t2 * t;

  // Position: B(t) = (1-t)^3 P0 + 3(1-t)^2 t P1 + 3(1-t) t^2 P2 + t^3 P3
  const x =
    mt3 * curve.p0.x +
    3 * mt2 * t * curve.p1.x +
    3 * mt * t2 * curve.p2.x +
    t3 * curve.p3.x;

  const y =
    mt3 * curve.p0.y +
    3 * mt2 * t * curve.p1.y +
    3 * mt * t2 * curve.p2.y +
    t3 * curve.p3.y;

  // Tangent derivative: B'(t) = 3(1-t)^2(P1 - P0) + 6(1-t)t(P2 - P1) + 3t^2(P3 - P2)
  const dx =
    3 * mt2 * (curve.p1.x - curve.p0.x) +
    6 * mt * t * (curve.p2.x - curve.p1.x) +
    3 * t2 * (curve.p3.x - curve.p2.x);

  const dy =
    3 * mt2 * (curve.p1.y - curve.p0.y) +
    6 * mt * t * (curve.p2.y - curve.p1.y) +
    3 * t2 * (curve.p3.y - curve.p2.y);

  let angleRad = Math.atan2(dy, dx);
  if (reverse) {
    angleRad += Math.PI; // Invert direction when traveling backwards
  }

  let headingDeg = (angleRad * 180) / Math.PI;
  if (headingDeg < 0) headingDeg += 360;

  return {
    x: Number(x.toFixed(1)),
    y: Number(y.toFixed(1)),
    headingDeg: Math.round(headingDeg),
  };
}

/**
 * Computes shortest route using Dijkstra's algorithm.
 * Accepts either:
 * - string[] of blocked segment IDs (backward compatibility)
 * - Map<string, RoadRestriction> for dynamic multi-condition penalty routing
 */
export function computeShortestRoute(
  originId: string = ORIGIN_NODE_ID,
  destinationId: string = DESTINATION_NODE_ID,
  restrictionsInput: string[] | Map<string, RoadRestriction> | Record<string, RoadRestriction> = []
): RouteResult {
  if (originId === destinationId) {
    return {
      nodeIds: [originId],
      segmentIds: [],
      totalDistanceKm: 0,
      isFound: true,
      pathD: '',
    };
  }

  // Normalize restrictions map
  const restrictionsMap = new Map<string, RoadRestriction>();
  if (Array.isArray(restrictionsInput)) {
    for (const segId of restrictionsInput) {
      restrictionsMap.set(segId, {
        segmentId: segId,
        status: 'confirmed_blocked',
        reason: 'Closure in effect',
        penaltyMultiplier: Infinity,
        lastUpdated: Date.now(),
        sources: ['community'],
        evidenceSummary: {
          distinctBlockCount: 2,
          distinctPassableCount: 0,
          cctvActive: false,
        },
      });
    }
  } else if (restrictionsInput instanceof Map) {
    restrictionsInput.forEach((val, key) => restrictionsMap.set(key, val));
  } else if (typeof restrictionsInput === 'object') {
    Object.entries(restrictionsInput).forEach(([key, val]) =>
      restrictionsMap.set(key, val)
    );
  }

  // Filter out completely blocked segments for primary routing
  const activeSegments = PUTTUR_SEGMENTS.filter((seg) => {
    const restr = restrictionsMap.get(seg.id);
    if (!restr) return true;
    return restr.status !== 'confirmed_blocked';
  });

  // Build adjacency graph
  const adjacency = new Map<string, Edge[]>();

  for (const seg of activeSegments) {
    if (!adjacency.has(seg.from)) adjacency.set(seg.from, []);
    if (!adjacency.has(seg.to)) adjacency.set(seg.to, []);

    const restr = restrictionsMap.get(seg.id);
    const penaltyMultiplier = restr ? restr.penaltyMultiplier : 1.0;
    const isProvisional = restr?.status === 'provisional_hazard';

    const edgeWeight = seg.distanceKm * penaltyMultiplier;

    adjacency.get(seg.from)!.push({
      segment: seg,
      neighborId: seg.to,
      weight: edgeWeight,
      isBlocked: false,
      isProvisional,
    });

    adjacency.get(seg.to)!.push({
      segment: seg,
      neighborId: seg.from,
      weight: edgeWeight,
      isBlocked: false,
      isProvisional,
    });
  }

  // Dijkstra's algorithm
  const distances = new Map<string, number>();
  const previous = new Map<string, { nodeId: string; segment: RoadSegment } | null>();
  const unvisited = new Set<string>();

  for (const seg of PUTTUR_SEGMENTS) {
    unvisited.add(seg.from);
    unvisited.add(seg.to);
    distances.set(seg.from, Infinity);
    distances.set(seg.to, Infinity);
    previous.set(seg.from, null);
    previous.set(seg.to, null);
  }

  distances.set(originId, 0);

  while (unvisited.size > 0) {
    let current: string | null = null;
    let shortestDist = Infinity;

    for (const node of unvisited) {
      const d = distances.get(node) ?? Infinity;
      if (d < shortestDist) {
        shortestDist = d;
        current = node;
      }
    }

    if (!current || shortestDist === Infinity) {
      break;
    }

    if (current === destinationId) {
      break;
    }

    unvisited.delete(current);

    const neighbors = adjacency.get(current) || [];
    for (const edge of neighbors) {
      if (!unvisited.has(edge.neighborId)) continue;

      const alt = shortestDist + edge.weight;
      if (alt < (distances.get(edge.neighborId) ?? Infinity)) {
        distances.set(edge.neighborId, alt);
        previous.set(edge.neighborId, { nodeId: current, segment: edge.segment });
      }
    }
  }

  if ((distances.get(destinationId) ?? Infinity) === Infinity) {
    return {
      nodeIds: [],
      segmentIds: [],
      totalDistanceKm: 0,
      isFound: false,
      pathD: '',
    };
  }

  // Reconstruct path
  const nodeIds: string[] = [];
  const segmentIds: string[] = [];
  let curr: string | null = destinationId;

  while (curr && curr !== originId) {
    nodeIds.unshift(curr);
    const prevEntry = previous.get(curr);
    if (!prevEntry) break;
    segmentIds.unshift(prevEntry.segment.id);
    curr = prevEntry.nodeId;
  }
  nodeIds.unshift(originId);

  let totalDist = 0;
  const pathDParts: string[] = [];

  for (const segId of segmentIds) {
    const seg = PUTTUR_SEGMENTS.find((s) => s.id === segId);
    if (seg) {
      totalDist += seg.distanceKm;
      pathDParts.push(seg.pathD);
    }
  }

  return {
    nodeIds,
    segmentIds,
    totalDistanceKm: Number(totalDist.toFixed(1)),
    isFound: true,
    pathD: pathDParts.join(' '),
  };
}

/**
 * Recalculates remaining route specifically from the commuter's current position.
 * Does not restart from the initial journey origin.
 */
export function recalculateRouteFromPosition(
  currentSegmentId: string,
  progressRatio: number,
  fromNodeId: string,
  toNodeId: string,
  destinationId: string,
  restrictions: Map<string, RoadRestriction> | string[]
): {
  newRoute: RouteResult;
  remainingDistanceKm: number;
  divergenceNode: string;
} {
  const currentSeg = PUTTUR_SEGMENTS.find((s) => s.id === currentSegmentId);
  const remainingOnCurrent = currentSeg
    ? Number((currentSeg.distanceKm * (1 - progressRatio)).toFixed(2))
    : 0;

  // The commuter is currently advancing towards toNodeId.
  // We calculate the optimal path from toNodeId to destinationId
  const downstreamRoute = computeShortestRoute(toNodeId, destinationId, restrictions);

  if (!downstreamRoute.isFound) {
    // If toNodeId has no path (e.g. toNodeId is isolated), check turning around to fromNodeId
    const turnaroundRoute = computeShortestRoute(fromNodeId, destinationId, restrictions);
    if (turnaroundRoute.isFound) {
      const turnaroundDistance = currentSeg
        ? Number((currentSeg.distanceKm * progressRatio + turnaroundRoute.totalDistanceKm).toFixed(1))
        : turnaroundRoute.totalDistanceKm;

      return {
        newRoute: turnaroundRoute,
        remainingDistanceKm: turnaroundDistance,
        divergenceNode: fromNodeId,
      };
    }

    return {
      newRoute: downstreamRoute,
      remainingDistanceKm: 0,
      divergenceNode: toNodeId,
    };
  }

  // Include current segment if not already at the next junction
  const combinedSegmentIds =
    progressRatio < 0.98
      ? [currentSegmentId, ...downstreamRoute.segmentIds.filter((id) => id !== currentSegmentId)]
      : downstreamRoute.segmentIds;

  const totalRemaining = Number((remainingOnCurrent + downstreamRoute.totalDistanceKm).toFixed(1));

  return {
    newRoute: {
      ...downstreamRoute,
      segmentIds: combinedSegmentIds,
      totalDistanceKm: totalRemaining,
    },
    remainingDistanceKm: totalRemaining,
    divergenceNode: toNodeId,
  };
}

/**
 * Checks whether a modified or restricted road segment lies along the commuter's remaining route ahead.
 * Returns true only if the road is ahead of the user on their journey.
 */
export function doesRestrictionAffectRemainingRoute(
  affectedSegmentId: string,
  remainingSegmentIds: string[]
): boolean {
  return remainingSegmentIds.includes(affectedSegmentId);
}
