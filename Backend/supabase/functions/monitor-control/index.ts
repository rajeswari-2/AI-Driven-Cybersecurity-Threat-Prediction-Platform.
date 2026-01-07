import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action } = await req.json();
    
    if (!action || !['pause', 'resume', 'status'].includes(action)) {
      return new Response(
        JSON.stringify({ error: 'Invalid action. Use: pause, resume, or status' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get current status
    const { data: currentStatus, error: fetchError } = await supabase
      .from('monitoring_status')
      .select('*')
      .single();

    if (fetchError) {
      console.error('Error fetching monitoring status:', fetchError);
      throw fetchError;
    }

    if (action === 'status') {
      return new Response(
        JSON.stringify({ 
          status: currentStatus.status,
          updated_at: currentStatus.updated_at 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const newStatus = action === 'pause' ? 'paused' : 'active';
    
    // Update monitoring status
    const { data, error } = await supabase
      .from('monitoring_status')
      .update({ 
        status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', currentStatus.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating monitoring status:', error);
      throw error;
    }

    // Log the action
    await supabase.from('audit_logs').insert({
      action: `monitoring_${action}`,
      resource_type: 'monitoring_status',
      resource_id: currentStatus.id,
      details: { 
        previous_status: currentStatus.status,
        new_status: newStatus 
      }
    });

    console.log(`Monitoring ${action}d successfully`);

    return new Response(
      JSON.stringify({ 
        success: true,
        status: newStatus,
        message: `Monitoring ${action === 'pause' ? 'paused' : 'resumed'} successfully`,
        updated_at: data.updated_at
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Monitor control error:', error);
    return new Response(
      JSON.stringify({ error: error?.message || 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
