import { PUTTUR_SEGMENTS, ORIGIN_NODE_ID, DESTINATION_NODE_ID } from '../data/putturNetwork';
import { RoadSegment, RouteResult } from '../types';

interface Edge {
  segment: RoadSegment;
  neighborId: string;
  weight: number;
}

export function computeShortestRoute(
  originId: string = ORIGIN_NODE_ID,
  destinationId: string = DESTINATION_NODE_ID,
  blockedSegmentIds: string[] = []
): RouteResult {
  const blockedSet = new Set(blockedSegmentIds);
  const activeSegments = PUTTUR_SEGMENTS.filter(seg => !blockedSet.has(seg.id));

  // Build adjacency graph (undirected roads for pilot commutes)
  const adjacency = new Map<string, Edge[]>();

  for (const seg of activeSegments) {
    if (!adjacency.has(seg.from)) adjacency.set(seg.from, []);
    if (!adjacency.has(seg.to)) adjacency.set(seg.to, []);

    adjacency.get(seg.from)!.push({
      segment: seg,
      neighborId: seg.to,
      weight: seg.distanceKm,
    });

    adjacency.get(seg.to)!.push({
      segment: seg,
      neighborId: seg.from,
      weight: seg.distanceKm,
    });
  }

  // Dijkstra's algorithm
  const distances = new Map<string, number>();
  const previous = new Map<string, { nodeId: string; segment: RoadSegment } | null>();
  const unvisited = new Set<string>();

  // Collect all known nodes
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
    // Find unvisited node with smallest distance
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
      break; // No reachable remaining nodes
    }

    if (current === destinationId) {
      break; // Found destination!
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

  // Check if destination was reached
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

  // Calculate accurate total distance from the actual segments in order
  let totalDist = 0;
  const pathDParts: string[] = [];

  for (const segId of segmentIds) {
    const seg = PUTTUR_SEGMENTS.find(s => s.id === segId);
    if (seg) {
      totalDist += seg.distanceKm;
      pathDParts.push(seg.pathD);
    }
  }

  // Combined path string
  const combinedPathD = pathDParts.join(' ');

  return {
    nodeIds,
    segmentIds,
    totalDistanceKm: Number(totalDist.toFixed(1)),
    isFound: true,
    pathD: combinedPathD,
  };
}
