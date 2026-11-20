import { Observation, IncidentStatus, RiderId } from '../types';

export interface VerificationCheck {
  canSubmit: boolean;
  reason?: string;
  uniqueRiderCount: number;
}

/**
 * Checks if a specific rider can add an observation to an incident.
 * Rule: Duplicate observations by the same rider are rejected to ensure
 * crowd-sourced consensus requires independent verification.
 */
export function canRiderObserve(
  observations: Observation[],
  riderId: RiderId,
  type: 'blockage' | 'reopening'
): VerificationCheck {
  const matchingType = observations.filter(o => o.type === type);
  const riders = new Set(matchingType.map(o => o.riderId));

  if (riders.has(riderId)) {
    return {
      canSubmit: false,
      reason: 'You already submitted an observation for this incident.',
      uniqueRiderCount: riders.size,
    };
  }

  return {
    canSubmit: true,
    uniqueRiderCount: riders.size,
  };
}

/**
 * Evaluates the consensus status based on distinct observers.
 * 0 observers -> 'none'
 * 1 observer  -> 'awaiting_confirmation'
 * 2+ observers -> 'confirmed_closure'
 */
export function evaluateConsensus(
  blockageObservations: Observation[],
  reopeningObservations: Observation[]
): IncidentStatus {
  const distinctReopeners = new Set(reopeningObservations.map(o => o.riderId)).size;
  if (distinctReopeners >= 2) {
    return 'none'; // Reopened!
  }
  if (distinctReopeners === 1) {
    return 'reopening_reported';
  }

  const distinctBlockers = new Set(blockageObservations.map(o => o.riderId)).size;
  if (distinctBlockers >= 2) {
    return 'confirmed_closure';
  }
  if (distinctBlockers === 1) {
    return 'awaiting_confirmation';
  }

  return 'none';
}
