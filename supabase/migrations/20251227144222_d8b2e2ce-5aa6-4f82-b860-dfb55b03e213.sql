-- Fix RLS policies for security data tables
-- Apply role-based restrictions using the existing is_admin function

-- 1. SCAN_RESULTS: Users can only see their own scans, admins see all
DROP POLICY IF EXISTS "Authenticated users can view scans" ON public.scan_results;
DROP POLICY IF EXISTS "Authenticated users can create scans" ON public.scan_results;
DROP POLICY IF EXISTS "Authenticated users can update scans" ON public.scan_results;

CREATE POLICY "Users can view own scans or admin sees all" ON public.scan_results
  FOR SELECT TO authenticated
  USING (created_by = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "Users can create own scans" ON public.scan_results
  FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update own scans" ON public.scan_results
  FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR public.is_admin(auth.uid()));

-- 2. INCIDENTS: Users see assigned/created incidents, admins see all
DROP POLICY IF EXISTS "Authenticated users can view incidents" ON public.incidents;
DROP POLICY IF EXISTS "Authenticated users can manage incidents" ON public.incidents;

CREATE POLICY "Users can view relevant incidents" ON public.incidents
  FOR SELECT TO authenticated
  USING (assigned_to = auth.uid() OR created_by = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "Admins can manage all incidents" ON public.incidents
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Users can create incidents" ON public.incidents
  FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update assigned incidents" ON public.incidents
  FOR UPDATE TO authenticated
  USING (assigned_to = auth.uid() OR created_by = auth.uid());

-- 3. BLOCKED_ENTITIES: Only admins can manage (security-critical)
DROP POLICY IF EXISTS "Authenticated users can manage blocked entities" ON public.blocked_entities;
DROP POLICY IF EXISTS "Authenticated users can view blocked entities" ON public.blocked_entities;
DROP POLICY IF EXISTS "Service role can manage blocked entities" ON public.blocked_entities;

CREATE POLICY "Admins can manage blocked entities" ON public.blocked_entities
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Authenticated users can view blocked entities" ON public.blocked_entities
  FOR SELECT TO authenticated
  USING (true);

-- 4. BLOCKED_ATTACKS: Only admins can manage, all can view
DROP POLICY IF EXISTS "Authenticated users can manage blocked attacks" ON public.blocked_attacks;
DROP POLICY IF EXISTS "Authenticated users can view blocked attacks" ON public.blocked_attacks;
DROP POLICY IF EXISTS "Service role can manage blocked attacks" ON public.blocked_attacks;

CREATE POLICY "Admins can manage blocked attacks" ON public.blocked_attacks
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Authenticated users can view blocked attacks" ON public.blocked_attacks
  FOR SELECT TO authenticated
  USING (true);

-- 5. THREATS: All authenticated can view (threat intel is shared), only admins insert
DROP POLICY IF EXISTS "Authenticated users can view threats" ON public.threats;
DROP POLICY IF EXISTS "Authenticated users can insert threats" ON public.threats;
DROP POLICY IF EXISTS "Service role can manage threats" ON public.threats;

CREATE POLICY "Authenticated users can view threats" ON public.threats
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can manage threats" ON public.threats
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()));

-- 6. LIVE_ATTACKS: All authenticated can view, only admins manage
DROP POLICY IF EXISTS "Authenticated users can view live attacks" ON public.live_attacks;
DROP POLICY IF EXISTS "Authenticated users can insert live attacks" ON public.live_attacks;
DROP POLICY IF EXISTS "Service role can manage live attacks" ON public.live_attacks;

CREATE POLICY "Authenticated users can view live attacks" ON public.live_attacks
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can manage live attacks" ON public.live_attacks
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()));

-- 7. REALTIME_LOGS: Only admins can view (contains sensitive activity)
DROP POLICY IF EXISTS "Authenticated users can view logs" ON public.realtime_logs;
DROP POLICY IF EXISTS "Service role can manage logs" ON public.realtime_logs;

CREATE POLICY "Admins can view logs" ON public.realtime_logs
  FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can manage logs" ON public.realtime_logs
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()));