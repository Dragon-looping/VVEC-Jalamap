// Self-contained logic verification runner for JALAMAP

const PUTTUR_SEGMENTS = [
  { id: 'seg_kallare_bolwar', from: 'kallare', to: 'bolwar', name: 'Kallare – Bolwar Corridor', distanceKm: 0.9 },
  { id: 'seg_bolwar_darbe', from: 'bolwar', to: 'darbe', name: 'Darbe West Approach (Main Rd)', distanceKm: 1.2 },
  { id: 'seg_darbe_bannur', from: 'darbe', to: 'bannur', name: 'Darbe – Bannur Arterial', distanceKm: 1.4 },
  { id: 'seg_bannur_kombettu', from: 'bannur', to: 'kombettu', name: 'Bannur – Kombettu Access', distanceKm: 1.3 },
  { id: 'seg_bolwar_courthill', from: 'bolwar', to: 'courthill', name: 'Court Hill Radial', distanceKm: 1.1 },
  { id: 'seg_courthill_town', from: 'courthill', to: 'town', name: 'Town Bypass / Ring Corridor', distanceKm: 1.6 },
  { id: 'seg_town_kombettu', from: 'town', to: 'kombettu', name: 'North Kombettu Express', distanceKm: 2.0 },
  { id: 'seg_town_bannur', from: 'town', to: 'bannur', name: 'College Cross Link', distanceKm: 1.8, isSecondary: true },
  { id: 'seg_kallare_mukwe', from: 'kallare', to: 'mukwe', name: 'Mukwe South Ring', distanceKm: 1.5, isSecondary: true },
  { id: 'seg_mukwe_parladka', from: 'mukwe', to: 'parladka', name: 'Parladka Connector', distanceKm: 1.7, isSecondary: true },
  { id: 'seg_darbe_parladka', from: 'darbe', to: 'parladka', name: 'Darbe South Link', distanceKm: 1.3, isSecondary: true },
  { id: 'seg_parladka_bannur', from: 'parladka', to: 'bannur', name: 'Bannur South Radial', distanceKm: 2.2, isSecondary: true },
];

function computeShortestRoute(originId, destinationId, blockedSegmentIds = []) {
  const blockedSet = new Set(blockedSegmentIds);
  const activeSegments = PUTTUR_SEGMENTS.filter(seg => !blockedSet.has(seg.id));
  const adjacency = new Map();

  for (const seg of activeSegments) {
    if (!adjacency.has(seg.from)) adjacency.set(seg.from, []);
    if (!adjacency.has(seg.to)) adjacency.set(seg.to, []);
    adjacency.get(seg.from).push({ segment: seg, neighborId: seg.to, weight: seg.distanceKm });
    adjacency.get(seg.to).push({ segment: seg, neighborId: seg.from, weight: seg.distanceKm });
  }

  const distances = new Map();
  const previous = new Map();
  const unvisited = new Set();

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
    let current = null;
    let shortestDist = Infinity;

    for (const node of unvisited) {
      const d = distances.get(node) ?? Infinity;
      if (d < shortestDist) {
        shortestDist = d;
        current = node;
      }
    }

    if (!current || shortestDist === Infinity) break;
    if (current === destinationId) break;

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
    return { nodeIds: [], segmentIds: [], totalDistanceKm: 0, isFound: false };
  }

  const nodeIds = [];
  const segmentIds = [];
  let curr = destinationId;
  while (curr && curr !== originId) {
    nodeIds.unshift(curr);
    const prevEntry = previous.get(curr);
    if (!prevEntry) break;
    segmentIds.unshift(prevEntry.segment.id);
    curr = prevEntry.nodeId;
  }
  nodeIds.unshift(originId);

  let totalDist = 0;
  for (const segId of segmentIds) {
    const seg = PUTTUR_SEGMENTS.find(s => s.id === segId);
    if (seg) totalDist += seg.distanceKm;
  }

  return {
    nodeIds,
    segmentIds,
    totalDistanceKm: Number(totalDist.toFixed(1)),
    isFound: true,
  };
}

function canRiderObserve(observations, riderId, type) {
  const matchingType = observations.filter(o => o.type === type);
  const riders = new Set(matchingType.map(o => o.riderId));
  if (riders.has(riderId)) {
    return { canSubmit: false, reason: 'Duplicate' };
  }
  return { canSubmit: true };
}

function evaluateConsensus(blockageObservations, reopeningObservations) {
  const distinctReopeners = new Set(reopeningObservations.map(o => o.riderId)).size;
  if (distinctReopeners >= 2) return 'none';
  if (distinctReopeners === 1) return 'reopening_reported';

  const distinctBlockers = new Set(blockageObservations.map(o => o.riderId)).size;
  if (distinctBlockers >= 2) return 'confirmed_closure';
  if (distinctBlockers === 1) return 'awaiting_confirmation';
  return 'none';
}

console.log('>>> TEST 1: STATE A ROUTE CALCULATION');
const rA = computeShortestRoute('kallare', 'kombettu', []);
console.log('Route nodes:', rA.nodeIds.join(' -> '));
console.log('Distance:', rA.totalDistanceKm, 'km');
if (rA.totalDistanceKm !== 4.8) throw new Error('Expected 4.8 km');

console.log('>>> TEST 2: SINGLE RIDER REPORT');
const obsA = [{ riderId: 'rider_a', type: 'blockage' }];
const stB = evaluateConsensus(obsA, []);
console.log('Consensus status with 1 report:', stB);
if (stB !== 'awaiting_confirmation') throw new Error('Expected awaiting_confirmation');

console.log('>>> TEST 3: DUPLICATE RIDER A REPORT PREVENTION');
const dupCheck = canRiderObserve(obsA, 'rider_a', 'blockage');
console.log('Duplicate check Rider A:', dupCheck);
if (dupCheck.canSubmit !== false) throw new Error('Rider A duplicate should be blocked!');

console.log('>>> TEST 4: SECOND INDEPENDENT RIDER CONFIRMATION');
const obsB = [...obsA, { riderId: 'rider_b', type: 'blockage' }];
const stC = evaluateConsensus(obsB, []);
console.log('Consensus status with 2 reports:', stC);
if (stC !== 'confirmed_closure') throw new Error('Expected confirmed_closure');

console.log('>>> TEST 5: STATE C DETOUR CALCULATION');
const rC = computeShortestRoute('kallare', 'kombettu', ['seg_bolwar_darbe']);
console.log('Detour nodes:', rC.nodeIds.join(' -> '));
console.log('Detour distance:', rC.totalDistanceKm, 'km');
const delta = Number((rC.totalDistanceKm - rA.totalDistanceKm).toFixed(1));
console.log('Added distance:', delta, 'km');
if (rC.totalDistanceKm !== 5.6 || delta !== 0.8) throw new Error('Expected 5.6 km (+0.8 km)');

console.log('>>> TEST 6: NO ALTERNATIVE FALLBACK');
const rNone = computeShortestRoute('kallare', 'kombettu', PUTTUR_SEGMENTS.map(s => s.id));
console.log('No route result:', rNone);
if (rNone.isFound !== false) throw new Error('Expected isFound: false');

console.log('>>> ALL VERIFICATION TESTS PASSED SUCCESSFULLY! <<<');
