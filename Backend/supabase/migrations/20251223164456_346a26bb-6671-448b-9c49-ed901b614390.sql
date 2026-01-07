-- Create app_role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'analyst', 'viewer');

-- Create monitoring_status table
CREATE TABLE public.monitoring_status (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused')),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Insert default monitoring status
INSERT INTO public.monitoring_status (status) VALUES ('active');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'viewer',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Create threats table
CREATE TABLE public.threats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source_type TEXT NOT NULL CHECK (source_type IN ('network', 'api', 'file', 'qr', 'website')),
  ip_address TEXT,
  domain TEXT,
  country TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('critical', 'high', 'medium', 'low', 'info')),
  attack_type TEXT,
  confidence DOUBLE PRECISION,
  raw_data JSONB,
  detected_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create live_attacks table (for real-time display)
CREATE TABLE public.live_attacks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source_ip TEXT NOT NULL,
  source_country TEXT,
  source_lat DOUBLE PRECISION,
  source_lng DOUBLE PRECISION,
  target_ip TEXT,
  target_country TEXT,
  target_lat DOUBLE PRECISION,
  target_lng DOUBLE PRECISION,
  attack_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('critical', 'high', 'medium', 'low', 'info')),
  confidence DOUBLE PRECISION,
  description TEXT,
  detected_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create blocked_entities table
CREATE TABLE public.blocked_entities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('ip', 'domain', 'api_key')),
  value TEXT NOT NULL,
  reason TEXT,
  blocked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  blocked_by UUID REFERENCES auth.users(id),
  UNIQUE(type, value)
);

-- Create blocked_attacks table (for UI display)
CREATE TABLE public.blocked_attacks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  attack_id UUID REFERENCES live_attacks(id),
  source_ip TEXT NOT NULL,
  attack_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'medium',
  blocked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  blocked_by UUID REFERENCES auth.users(id),
  auto_blocked BOOLEAN NOT NULL DEFAULT false,
  reason TEXT
);

-- Create realtime_logs table
CREATE TABLE public.realtime_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  raw_log JSONB NOT NULL,
  log_type TEXT,
  source TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create scan_results table
CREATE TABLE public.scan_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  scan_type TEXT NOT NULL CHECK (scan_type IN ('static', 'api', 'qr', 'website')),
  target TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  result JSONB,
  threats_found INTEGER DEFAULT 0,
  severity TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Create audit_logs table
CREATE TABLE public.audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id UUID,
  details JSONB,
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create incidents table
CREATE TABLE public.incidents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('critical', 'high', 'medium', 'low', 'info')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved', 'closed')),
  attack_type TEXT,
  source_ip TEXT,
  assigned_to UUID REFERENCES auth.users(id),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  resolved_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS on all tables
ALTER TABLE public.monitoring_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.threats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_attacks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocked_entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocked_attacks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.realtime_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scan_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;

-- RLS Policies for monitoring_status (all authenticated users can read, only admins can update)
CREATE POLICY "Authenticated users can view monitoring status" ON public.monitoring_status FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can update monitoring status" ON public.monitoring_status FOR UPDATE TO authenticated USING (true);

-- RLS Policies for profiles
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- RLS Policies for user_roles
CREATE POLICY "Users can view all roles" ON public.user_roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- RLS Policies for threats (all authenticated users can read/write)
CREATE POLICY "Authenticated users can view threats" ON public.threats FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert threats" ON public.threats FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Service role can manage threats" ON public.threats FOR ALL TO service_role USING (true);

-- RLS Policies for live_attacks
CREATE POLICY "Authenticated users can view live attacks" ON public.live_attacks FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert live attacks" ON public.live_attacks FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Service role can manage live attacks" ON public.live_attacks FOR ALL TO service_role USING (true);

-- RLS Policies for blocked_entities
CREATE POLICY "Authenticated users can view blocked entities" ON public.blocked_entities FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage blocked entities" ON public.blocked_entities FOR ALL TO authenticated USING (true);
CREATE POLICY "Service role can manage blocked entities" ON public.blocked_entities FOR ALL TO service_role USING (true);

-- RLS Policies for blocked_attacks
CREATE POLICY "Authenticated users can view blocked attacks" ON public.blocked_attacks FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage blocked attacks" ON public.blocked_attacks FOR ALL TO authenticated USING (true);
CREATE POLICY "Service role can manage blocked attacks" ON public.blocked_attacks FOR ALL TO service_role USING (true);

-- RLS Policies for realtime_logs
CREATE POLICY "Authenticated users can view logs" ON public.realtime_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Service role can manage logs" ON public.realtime_logs FOR ALL TO service_role USING (true);

-- RLS Policies for scan_results
CREATE POLICY "Authenticated users can view scans" ON public.scan_results FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can create scans" ON public.scan_results FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update scans" ON public.scan_results FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Service role can manage scans" ON public.scan_results FOR ALL TO service_role USING (true);

-- RLS Policies for audit_logs
CREATE POLICY "Authenticated users can view audit logs" ON public.audit_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can create audit logs" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Service role can manage audit logs" ON public.audit_logs FOR ALL TO service_role USING (true);

-- RLS Policies for incidents
CREATE POLICY "Authenticated users can view incidents" ON public.incidents FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage incidents" ON public.incidents FOR ALL TO authenticated USING (true);

-- Enable realtime for key tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_attacks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.blocked_attacks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.threats;
ALTER PUBLICATION supabase_realtime ADD TABLE public.monitoring_status;
ALTER PUBLICATION supabase_realtime ADD TABLE public.incidents;

-- Set REPLICA IDENTITY FULL for realtime tables
ALTER TABLE public.live_attacks REPLICA IDENTITY FULL;
ALTER TABLE public.blocked_attacks REPLICA IDENTITY FULL;
ALTER TABLE public.threats REPLICA IDENTITY FULL;
ALTER TABLE public.monitoring_status REPLICA IDENTITY FULL;
ALTER TABLE public.incidents REPLICA IDENTITY FULL;

-- Create function to handle new user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'viewer');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for timestamp updates
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_incidents_updated_at BEFORE UPDATE ON public.incidents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_monitoring_status_updated_at BEFORE UPDATE ON public.monitoring_status FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();