-- ==============================================================================
-- JALAMAP V3 — DATABASE SCHEMA & REALTIME ARCHITECTURE (SUPABASE / POSTGRESQL)
-- Project: JALAMAP Smart Monsoon Road Navigation (Puttur, Dakshina Kannada)
-- ==============================================================================

-- 1. Profiles & Commuter Identities
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'commuter' CHECK (role IN ('commuter', 'delivery_partner', 'auto_driver', 'emergency_responder', 'local_resident')),
  trust_score NUMERIC(3, 2) NOT NULL DEFAULT 1.00 CHECK (trust_score >= 0.0 AND trust_score <= 1.0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. Road Segments Master Registry
CREATE TABLE IF NOT EXISTS public.road_segments (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  from_node TEXT NOT NULL,
  to_node TEXT NOT NULL,
  distance_km NUMERIC(4, 2) NOT NULL,
  is_secondary BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. Incidents Lifecycle
CREATE TABLE IF NOT EXISTS public.incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  segment_id TEXT NOT NULL REFERENCES public.road_segments(id) ON DELETE CASCADE,
  hazard_type TEXT NOT NULL DEFAULT 'waterlogging' CHECK (hazard_type IN ('waterlogging', 'tree_fall', 'structural_damage', 'landslip')),
  severity TEXT NOT NULL DEFAULT 'moderate' CHECK (severity IN ('low', 'moderate', 'high', 'critical')),
  status TEXT NOT NULL DEFAULT 'provisional_hazard' CHECK (status IN ('provisional_hazard', 'confirmed_blocked', 'reopening_review', 'resolved')),
  first_reported_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. Crowdsourced Observations (Unlimited Multi-Contributor Model)
CREATE TABLE IF NOT EXISTS public.observations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID REFERENCES public.incidents(id) ON DELETE SET NULL,
  segment_id TEXT NOT NULL REFERENCES public.road_segments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  condition TEXT NOT NULL CHECK (condition IN ('blocked', 'partially_blocked', 'passable', 'not_sure')),
  note TEXT,
  image_url TEXT,
  source TEXT NOT NULL DEFAULT 'community' CHECK (source IN ('community', 'cctv_simulation', 'official')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5. Authoritative Road Restrictions
CREATE TABLE IF NOT EXISTS public.road_restrictions (
  segment_id TEXT PRIMARY KEY REFERENCES public.road_segments(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'passable' CHECK (status IN ('passable', 'provisional_hazard', 'confirmed_blocked', 'reopening_review')),
  penalty_multiplier NUMERIC(6, 2) NOT NULL DEFAULT 1.0,
  reason TEXT NOT NULL DEFAULT 'Normal conditions',
  distinct_block_count INT NOT NULL DEFAULT 0,
  distinct_passable_count INT NOT NULL DEFAULT 0,
  cctv_active BOOLEAN NOT NULL DEFAULT FALSE,
  last_evaluated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 6. CCTV Events Telemetry (Background System Only)
CREATE TABLE IF NOT EXISTS public.cctv_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  camera_id TEXT NOT NULL,
  segment_id TEXT NOT NULL REFERENCES public.road_segments(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('waterlogging', 'obstruction', 'clear')),
  confidence NUMERIC(3, 2) NOT NULL CHECK (confidence >= 0.0 AND confidence <= 1.0),
  recommendation TEXT NOT NULL CHECK (recommendation IN ('avoid_hazard', 'confirmed_closure', 'clearance')),
  is_demonstration BOOLEAN NOT NULL DEFAULT TRUE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 7. Audit Log for Safety & Decision Traceability
CREATE TABLE IF NOT EXISTS public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  action TEXT NOT NULL,
  previous_state JSONB,
  new_state JSONB,
  triggered_by TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.road_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.road_restrictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cctv_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Read access: Publicly readable for navigation clients
CREATE POLICY "Public read profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Public read road_segments" ON public.road_segments FOR SELECT USING (true);
CREATE POLICY "Public read incidents" ON public.incidents FOR SELECT USING (true);
CREATE POLICY "Public read observations" ON public.observations FOR SELECT USING (true);
CREATE POLICY "Public read road_restrictions" ON public.road_restrictions FOR SELECT USING (true);

-- Insert observations: Authenticated users can submit their own observation
CREATE POLICY "Users can insert own observation" ON public.observations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- CCTV events: Inserters must be service role or authorized admin
CREATE POLICY "Service can insert cctv_events" ON public.cctv_events
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- Automatic consensus evaluation trigger function
CREATE OR REPLACE FUNCTION public.recalculate_segment_consensus(target_segment_id TEXT)
RETURNS VOID AS $$
DECLARE
  block_count INT;
  passable_count INT;
  has_cctv_hazard BOOLEAN;
  has_cctv_clear BOOLEAN;
  new_status TEXT := 'passable';
  new_penalty NUMERIC := 1.0;
  new_reason TEXT := 'Normal traffic flow.';
BEGIN
  -- Count distinct recent contributors (within last 45 minutes)
  SELECT COUNT(DISTINCT user_id) INTO block_count
  FROM public.observations
  WHERE segment_id = target_segment_id
    AND condition IN ('blocked', 'partially_blocked')
    AND created_at >= (now() - INTERVAL '45 minutes');

  SELECT COUNT(DISTINCT user_id) INTO passable_count
  FROM public.observations
  WHERE segment_id = target_segment_id
    AND condition = 'passable'
    AND created_at >= (now() - INTERVAL '45 minutes');

  -- Check recent CCTV telemetry (within last 30 minutes)
  SELECT EXISTS(
    SELECT 1 FROM public.cctv_events
    WHERE segment_id = target_segment_id
      AND category IN ('waterlogging', 'obstruction')
      AND confidence >= 0.75
      AND created_at >= (now() - INTERVAL '30 minutes')
  ) INTO has_cctv_hazard;

  SELECT EXISTS(
    SELECT 1 FROM public.cctv_events
    WHERE segment_id = target_segment_id
      AND category = 'clear'
      AND confidence >= 0.80
      AND created_at >= (now() - INTERVAL '30 minutes')
  ) INTO has_cctv_clear;

  -- Reopening takes priority if >= 3 passable reports or CCTV clear without blocks
  IF passable_count >= 3 AND NOT has_cctv_hazard THEN
    new_status := 'passable';
    new_penalty := 1.0;
    new_reason := format('Verified passable by %s independent commuters.', passable_count);
  ELSIF has_cctv_clear AND block_count = 0 THEN
    new_status := 'passable';
    new_penalty := 1.0;
    new_reason := 'Background CCTV confirmed road surface clear.';
  ELSIF block_count >= 3 OR (has_cctv_hazard AND block_count >= 1) THEN
    new_status := 'confirmed_blocked';
    new_penalty := 99999.0;
    new_reason := format('Confirmed impassable (%s reports). Avoid corridor.', block_count);
  ELSIF has_cctv_hazard OR block_count >= 1 THEN
    new_status := 'provisional_hazard';
    new_penalty := 6.0;
    new_reason := 'Provisional caution: Waterlogging hazard detected.';
  END IF;

  -- Upsert restriction record
  INSERT INTO public.road_restrictions (
    segment_id, status, penalty_multiplier, reason,
    distinct_block_count, distinct_passable_count, cctv_active, last_evaluated_at
  )
  VALUES (
    target_segment_id, new_status, new_penalty, new_reason,
    block_count, passable_count, has_cctv_hazard, now()
  )
  ON CONFLICT (segment_id) DO UPDATE SET
    status = EXCLUDED.status,
    penalty_multiplier = EXCLUDED.penalty_multiplier,
    reason = EXCLUDED.reason,
    distinct_block_count = EXCLUDED.distinct_block_count,
    distinct_passable_count = EXCLUDED.distinct_passable_count,
    cctv_active = EXCLUDED.cctv_active,
    last_evaluated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
