import {
  CommunityObservation,
  RoadRestriction,
  CctvDetectionEvent,
  UserProfile,
} from '../types';
import { evaluateRoadEvidence, buildRoadRestriction } from '../utils/evidenceEngine';
import { PUTTUR_SEGMENTS } from '../data/putturNetwork';

const LOCAL_OBSERVATIONS_KEY = 'jalamap_v3_observations';
const LOCAL_RESTRICTIONS_KEY = 'jalamap_v3_restrictions';
const LOCAL_USER_KEY = 'jalamap_v3_current_user';

type DatabaseListener = (data: {
  restrictions: Map<string, RoadRestriction>;
  observations: CommunityObservation[];
}) => void;

class DatabaseService {
  private listeners: Set<DatabaseListener> = new Set();
  private observations: CommunityObservation[] = [];
  private restrictions: Map<string, RoadRestriction> = new Map();
  private cctvEvents: CctvDetectionEvent[] = [];
  private currentUser: UserProfile;
  private isSupabaseConnected: boolean = false;

  constructor() {
    this.currentUser = this.loadOrInitUser();
    this.initializeState();
  }

  private loadOrInitUser(): UserProfile {
    try {
      const stored = localStorage.getItem(LOCAL_USER_KEY);
      if (stored) return JSON.parse(stored);
    } catch {
      // fallback
    }
    const newUser: UserProfile = {
      id: `usr-${Math.random().toString(36).substring(2, 9)}`,
      name: 'Commuter',
      role: 'commuter',
      trustScore: 1.0,
    };
    try {
      localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(newUser));
    } catch {}
    return newUser;
  }

  private initializeState(): void {
    // Initialize default passable restrictions for all segments
    for (const seg of PUTTUR_SEGMENTS) {
      this.restrictions.set(seg.id, {
        segmentId: seg.id,
        status: 'passable',
        penaltyMultiplier: 1.0,
        reason: 'Normal road conditions.',
        lastUpdated: Date.now(),
        sources: [],
        evidenceSummary: {
          distinctBlockCount: 0,
          distinctPassableCount: 0,
          cctvActive: false,
        },
      });
    }

    // Hydrate observations from localStorage
    try {
      const rawObs = localStorage.getItem(LOCAL_OBSERVATIONS_KEY);
      if (rawObs) {
        this.observations = JSON.parse(rawObs);
        this.recalculateAllRestrictions();
      }
    } catch (err) {
      console.warn('Failed to hydrate local observations:', err);
    }

    // Check if Supabase credentials are configured
    const metaEnv = (import.meta as unknown as { env?: Record<string, string> }).env;
    const supabaseUrl = metaEnv?.VITE_SUPABASE_URL;
    const supabaseKey = metaEnv?.VITE_SUPABASE_ANON_KEY;
    if (supabaseUrl && supabaseKey && !supabaseUrl.includes('your-project')) {
      this.isSupabaseConnected = true;
    }
  }

  public subscribe(listener: DatabaseListener): () => void {
    this.listeners.add(listener);
    listener({
      restrictions: new Map(this.restrictions),
      observations: [...this.observations],
    });
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifySubscribers(): void {
    const data = {
      restrictions: new Map(this.restrictions),
      observations: [...this.observations],
    };
    this.listeners.forEach((listener) => {
      try {
        listener(data);
      } catch (err) {
        console.error('Error in database subscriber:', err);
      }
    });

    // Save to localStorage
    try {
      localStorage.setItem(LOCAL_OBSERVATIONS_KEY, JSON.stringify(this.observations));
    } catch (err) {
      console.warn('Failed to save observations:', err);
    }
  }

  public getCurrentUser(): UserProfile {
    return this.currentUser;
  }

  public setCurrentUser(user: UserProfile): void {
    this.currentUser = user;
    try {
      localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(user));
    } catch {}
  }

  /**
   * Submits a crowdsourced community observation.
   * Immediately evaluates evidence in background; no manual verification step needed.
   */
  public submitObservation(
    obsData: Omit<CommunityObservation, 'id' | 'timestamp' | 'displayTime'>
  ): CommunityObservation {
    const now = Date.now();
    const displayTime =
      new Date(now).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' IST';

    const newObs: CommunityObservation = {
      ...obsData,
      id: `obs-${now}-${Math.floor(Math.random() * 10000)}`,
      timestamp: now,
      displayTime,
    };

    this.observations.push(newObs);
    this.recalculateSegmentRestriction(obsData.segmentId);
    this.notifySubscribers();
    return newObs;
  }

  /**
   * Ingests a background CCTV detection event.
   */
  public recordCctvEvent(event: CctvDetectionEvent): void {
    this.cctvEvents.push(event);
    this.recalculateSegmentRestriction(event.segmentId);
    this.notifySubscribers();
  }

  /**
   * Evaluates restriction for a single segment based on multi-contributor observations and CCTV.
   */
  public recalculateSegmentRestriction(segmentId: string): RoadRestriction {
    const evalResult = evaluateRoadEvidence(
      segmentId,
      this.observations,
      this.cctvEvents
    );
    const restriction = buildRoadRestriction(segmentId, evalResult);
    this.restrictions.set(segmentId, restriction);
    return restriction;
  }

  /**
   * Recalculates restrictions across the entire road network.
   */
  public recalculateAllRestrictions(): void {
    for (const seg of PUTTUR_SEGMENTS) {
      this.recalculateSegmentRestriction(seg.id);
    }
  }

  public getRestrictions(): Map<string, RoadRestriction> {
    return new Map(this.restrictions);
  }

  public getObservationsForSegment(segmentId: string): CommunityObservation[] {
    return this.observations.filter((o) => o.segmentId === segmentId);
  }

  public getConnectedStatus(): { isSupabase: boolean; label: string } {
    return {
      isSupabase: this.isSupabaseConnected,
      label: this.isSupabaseConnected ? 'Supabase Live Sync' : 'Local Pilot Engine',
    };
  }

  /**
   * Resets all demo observations, restrictions and CCTV telemetry to initial clean state.
   */
  public resetToInitialState(): void {
    this.observations = [];
    this.cctvEvents = [];
    try {
      localStorage.removeItem(LOCAL_OBSERVATIONS_KEY);
      localStorage.removeItem(LOCAL_RESTRICTIONS_KEY);
    } catch {}
    this.initializeState();
    this.notifySubscribers();
  }
}

export const dbService = new DatabaseService();
