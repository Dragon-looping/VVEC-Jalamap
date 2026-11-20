import {
  CommunityObservation,
  RoadRestriction,
  RoadRestrictionStatus,
  CctvDetectionEvent,
} from '../types';

export interface EvidencePolicyConfig {
  blockConfirmedThreshold: number; // default: 3 distinct users
  reopenConfirmedThreshold: number; // default: 3 distinct users
  provisionalThreshold: number; // default: 1 distinct user
  freshnessWindowMinutes: number; // default: 45 minutes
  cctvHazardConfidenceThreshold: number; // default: 0.75
  cctvClearConfidenceThreshold: number; // default: 0.80
}

export const DEFAULT_EVIDENCE_POLICY: EvidencePolicyConfig = {
  blockConfirmedThreshold: 3,
  reopenConfirmedThreshold: 3,
  provisionalThreshold: 1,
  freshnessWindowMinutes: 45,
  cctvHazardConfidenceThreshold: 0.75,
  cctvClearConfidenceThreshold: 0.8,
};

export interface EvaluationResult {
  segmentId: string;
  status: RoadRestrictionStatus;
  penaltyMultiplier: number;
  reason: string;
  sources: ('cctv' | 'community' | 'official')[];
  summary: {
    distinctBlockCount: number;
    distinctPassableCount: number;
    cctvActive: boolean;
    cctvConfidence?: number;
    lastReportTime?: string;
    description?: string;
  };
}

/**
 * Automatically evaluates all observations and background CCTV events for a road segment
 * using independent multi-contributor verification policies.
 * No manual verification buttons required!
 */
export function evaluateRoadEvidence(
  segmentId: string,
  observations: CommunityObservation[],
  cctvEvents: CctvDetectionEvent[] = [],
  policy: EvidencePolicyConfig = DEFAULT_EVIDENCE_POLICY,
  currentTimeMs: number = Date.now()
): EvaluationResult {
  const windowMs = policy.freshnessWindowMinutes * 60 * 1000;
  const recentCutoff = currentTimeMs - windowMs;

  // Filter observations for this road segment and within freshness window
  const segmentObs = observations.filter(
    (o) => o.segmentId === segmentId && o.timestamp >= recentCutoff
  );

  // Group by distinct user to prevent duplicate votes from one contributor
  // If a user submits multiple observations, their latest submission is authoritative
  const userLatestMap = new Map<string, CommunityObservation>();
  for (const obs of segmentObs) {
    const existing = userLatestMap.get(obs.userId);
    if (!existing || obs.timestamp > existing.timestamp) {
      userLatestMap.set(obs.userId, obs);
    }
  }

  const distinctReports = Array.from(userLatestMap.values());
  const blockReports = distinctReports.filter(
    (r) => r.condition === 'blocked' || r.condition === 'partially_blocked'
  );
  const passableReports = distinctReports.filter((r) => r.condition === 'passable');

  const distinctBlockCount = blockReports.length;
  const distinctPassableCount = passableReports.length;

  // Latest recent CCTV event for this segment
  const recentCctv = cctvEvents
    .filter((e) => e.segmentId === segmentId && e.timestamp >= recentCutoff)
    .sort((a, b) => b.timestamp - a.timestamp)[0];

  const hasCctvHazard =
    recentCctv &&
    (recentCctv.category === 'waterlogging' || recentCctv.category === 'obstruction') &&
    recentCctv.confidence >= policy.cctvHazardConfidenceThreshold;

  const hasCctvClear =
    recentCctv &&
    recentCctv.category === 'clear' &&
    recentCctv.confidence >= policy.cctvClearConfidenceThreshold;

  const latestTime =
    distinctReports.length > 0
      ? distinctReports[distinctReports.length - 1].displayTime
      : recentCctv
      ? new Date(recentCctv.timestamp).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        }) + ' IST'
      : undefined;

  const sources: ('cctv' | 'community' | 'official')[] = [];
  if (distinctReports.length > 0) sources.push('community');
  if (recentCctv) sources.push('cctv');

  // 1. REOPENING ASSESSMENT
  // If recent passable reports meet threshold with no new CCTV hazard, reopen!
  if (distinctPassableCount >= policy.reopenConfirmedThreshold && !hasCctvHazard) {
    return {
      segmentId,
      status: 'passable',
      penaltyMultiplier: 1.0,
      reason: `Road verified passable by ${distinctPassableCount} independent commuters.`,
      sources,
      summary: {
        distinctBlockCount,
        distinctPassableCount,
        cctvActive: false,
        lastReportTime: latestTime,
        description: 'Water has receded. Traffic is moving safely.',
      },
    };
  }

  // If CCTV sustained clearance observed and no fresh contradictory community blockage
  if (hasCctvClear && distinctBlockCount === 0) {
    return {
      segmentId,
      status: 'passable',
      penaltyMultiplier: 1.0,
      reason: 'Background CCTV detected sustained clearance.',
      sources,
      summary: {
        distinctBlockCount,
        distinctPassableCount,
        cctvActive: false,
        cctvConfidence: recentCctv?.confidence,
        lastReportTime: latestTime,
        description: 'Monitored camera feed confirms roadway is clear.',
      },
    };
  }

  // 2. CONFIRMED CLOSURE ASSESSMENT
  // Either >= 3 distinct community reports, OR CCTV hazard + >= 1 corroborating community report
  const isConfirmedByCommunity = distinctBlockCount >= policy.blockConfirmedThreshold;
  const isConfirmedByCctvPlusCommunity = hasCctvHazard && distinctBlockCount >= 1;

  if (isConfirmedByCommunity || isConfirmedByCctvPlusCommunity) {
    const reason = isConfirmedByCommunity
      ? `Confirmed impassable by ${distinctBlockCount} independent commuters.`
      : `High water depth detected by CCTV corroborated by ${distinctBlockCount} commuter report${
          distinctBlockCount === 1 ? '' : 's'
        }.`;

    return {
      segmentId,
      status: 'confirmed_blocked',
      penaltyMultiplier: Infinity,
      reason,
      sources,
      summary: {
        distinctBlockCount,
        distinctPassableCount,
        cctvActive: !!hasCctvHazard,
        cctvConfidence: recentCctv?.confidence,
        lastReportTime: latestTime,
        description:
          blockReports[blockReports.length - 1]?.note ||
          'Substantial water accumulation on roadway. Impassable for standard vehicles.',
      },
    };
  }

  // 3. PROVISIONAL HAZARD / PRECAUTIONARY AVOIDANCE
  // From 1 or 2 community reports, or automated CCTV detection
  if (hasCctvHazard || distinctBlockCount >= policy.provisionalThreshold) {
    const reason = hasCctvHazard
      ? 'Automated background CCTV flagged waterlogging ahead.'
      : `Provisional hazard: ${distinctBlockCount} commuter report${
          distinctBlockCount === 1 ? '' : 's'
        } received.`;

    return {
      segmentId,
      status: 'provisional_hazard',
      penaltyMultiplier: 6.0, // Substantial cost penalty so routing diverts if alternative is viable
      reason,
      sources,
      summary: {
        distinctBlockCount,
        distinctPassableCount,
        cctvActive: !!hasCctvHazard,
        cctvConfidence: recentCctv?.confidence,
        lastReportTime: latestTime,
        description:
          blockReports[blockReports.length - 1]?.note ||
          'Water pooling detected on road surface. Exercise caution.',
      },
    };
  }

  // 4. CONFLICT / REOPENING REVIEW
  if (distinctPassableCount > 0 && distinctBlockCount > 0) {
    return {
      segmentId,
      status: 'reopening_review',
      penaltyMultiplier: 2.5,
      reason: `Under review: ${distinctPassableCount} passable vs ${distinctBlockCount} blocked reports.`,
      sources,
      summary: {
        distinctBlockCount,
        distinctPassableCount,
        cctvActive: false,
        lastReportTime: latestTime,
        description: 'Conflicting commuter reports received. Caution advised.',
      },
    };
  }

  // 5. DEFAULT PASSABLE (NO INCIDENT)
  return {
    segmentId,
    status: 'passable',
    penaltyMultiplier: 1.0,
    reason: 'Normal road conditions.',
    sources: [],
    summary: {
      distinctBlockCount: 0,
      distinctPassableCount: 0,
      cctvActive: false,
      lastReportTime: undefined,
    },
  };
}

/**
 * Builds or updates the full RoadRestriction object from evaluation.
 */
export function buildRoadRestriction(
  segmentId: string,
  evalResult: EvaluationResult
): RoadRestriction {
  return {
    segmentId,
    status: evalResult.status,
    reason: evalResult.reason,
    penaltyMultiplier: evalResult.penaltyMultiplier,
    lastUpdated: Date.now(),
    sources: evalResult.sources,
    evidenceSummary: evalResult.summary,
  };
}
