-- Fix monitoring_status update policy to be admin-only
DROP POLICY IF EXISTS "Authenticated users can update monitoring status" ON public.monitoring_status;

CREATE POLICY "Admins can update monitoring status" 
  ON public.monitoring_status 
  FOR UPDATE TO authenticated 
  USING (public.is_admin(auth.uid()));