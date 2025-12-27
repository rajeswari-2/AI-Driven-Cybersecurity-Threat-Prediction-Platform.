-- Create a security definer function to check admin role (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'admin'::app_role
  )
$$;

-- Fix profiles: Users can only view their own profile (protects email/PII)
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id);

-- Fix user_roles: Users can view own role, admins can view all
DROP POLICY IF EXISTS "Users can view all roles" ON public.user_roles;
CREATE POLICY "Users can view roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

-- Fix audit_logs: Only admins can view audit logs (contains sensitive activity data)
DROP POLICY IF EXISTS "Authenticated users can view audit logs" ON public.audit_logs;
CREATE POLICY "Admins can view audit logs" ON public.audit_logs
  FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));