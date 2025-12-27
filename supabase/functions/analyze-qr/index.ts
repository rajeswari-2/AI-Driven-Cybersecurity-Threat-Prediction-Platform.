import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

// SECURITY: URL validation to prevent SSRF attacks
function validateUrl(urlString: string): { valid: boolean; error?: string; url?: URL } {
  let url: URL;
  
  try {
    url = new URL(urlString);
  } catch (e) {
    return { valid: false, error: 'Invalid URL format' };
  }

  // Only allow HTTP/HTTPS protocols
  if (!['http:', 'https:'].includes(url.protocol)) {
    return { valid: false, error: 'Only HTTP and HTTPS protocols are allowed' };
  }

  const hostname = url.hostname.toLowerCase();

  // Block localhost and loopback
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1' || hostname === '0.0.0.0') {
    return { valid: false, error: 'Localhost access is not allowed' };
  }

  // Block private IPv4 ranges
  const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  const ipv4Match = hostname.match(ipv4Regex);
  if (ipv4Match) {
    const [_, a, b, c, d] = ipv4Match.map(Number);
    if (
      (a === 10) || // 10.0.0.0/8
      (a === 172 && b >= 16 && b <= 31) || // 172.16.0.0/12
      (a === 192 && b === 168) || // 192.168.0.0/16
      (a === 169 && b === 254) || // 169.254.0.0/16 (link-local, cloud metadata)
      (a === 127) || // 127.0.0.0/8
      (a === 0) // 0.0.0.0/8
    ) {
      return { valid: false, error: 'Private IP ranges are not allowed' };
    }
  }

  // Block cloud metadata endpoints
  const blockedDomains = [
    'metadata.google.internal',
    'metadata',
    'instance-data',
    '169.254.169.254',
    'metadata.azure.com'
  ];
  if (blockedDomains.some(d => hostname.includes(d))) {
    return { valid: false, error: 'Cloud metadata endpoints are not allowed' };
  }

  return { valid: true, url };
}

async function analyzeWithGemini(url: string): Promise<any> {
  const prompt = `You are a cybersecurity expert specializing in phishing and malware detection.
Analyze this URL extracted from a QR code: ${url}

Provide a JSON response with:
{
  "decoded_url": "the URL",
  "is_malicious": boolean,
  "threat_score": (0-100, higher means more dangerous),
  "threats_detected": ["list of specific threats"],
  "redirect_chain": ["list of URLs in redirect chain if suspicious"],
  "recommendation": "what the user should do",
  "analysis_details": {
    "domain_age_suspicious": boolean,
    "typosquatting_detected": boolean,
    "known_phishing_pattern": boolean,
    "suspicious_tld": boolean,
    "homograph_attack": boolean
  }
}

Consider these threat indicators:
- Shortened URLs that hide destination
- Recently registered domains
- Typosquatting (e.g., g00gle instead of google)
- Suspicious TLDs (.xyz, .tk, .ml for phishing)
- Homograph attacks (lookalike characters)
- Known phishing patterns
- Credential harvesting forms
- Malware distribution patterns

Only respond with valid JSON.`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 1024,
          },
        }),
      }
    );

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error('Invalid JSON response');
  } catch (error) {
    console.error('Gemini analysis error:', error);
    return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // SECURITY: Validate authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify JWT and get user
    const userSupabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await userSupabase.auth.getUser();
    if (authError || !user) {
      console.error('Authentication error:', authError);
      return new Response(
        JSON.stringify({ error: 'Invalid or expired authentication token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Authenticated user ${user.id} initiating QR analysis`);

    const { url } = await req.json();
    
    if (!url) {
      return new Response(
        JSON.stringify({ error: 'URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // SECURITY: Validate URL to prevent SSRF
    const validation = validateUrl(url);
    if (!validation.valid) {
      console.warn(`URL validation failed for ${url}: ${validation.error}`);
      return new Response(
        JSON.stringify({ error: validation.error }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const validatedUrl = validation.url!.href;
    console.log(`Analyzing QR code URL: ${validatedUrl}`);

    // Use service role for database operations
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check monitoring status
    const { data: monitoringStatus } = await supabase
      .from('monitoring_status')
      .select('status')
      .single();

    if (monitoringStatus?.status === 'paused') {
      return new Response(
        JSON.stringify({ error: 'Monitoring is paused. Resume to perform scans.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if domain is blocked
    const domain = validation.url!.hostname;
    const { data: blockedEntity } = await supabase
      .from('blocked_entities')
      .select('*')
      .eq('type', 'domain')
      .eq('value', domain)
      .maybeSingle();

    if (blockedEntity) {
      return new Response(
        JSON.stringify({ 
          decoded_url: validatedUrl,
          is_malicious: true,
          threat_score: 100,
          threats_detected: ['Domain is on blocklist'],
          recommendation: 'Do not visit this URL. It has been blocked as malicious.',
          blocked: true
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use Gemini for analysis
    let analysisResult = await analyzeWithGemini(validatedUrl);
    
    if (!analysisResult) {
      // Fallback analysis based on simple heuristics
      const suspiciousTlds = ['.xyz', '.tk', '.ml', '.ga', '.cf', '.gq'];
      const isSuspiciousTld = suspiciousTlds.some(tld => validatedUrl.toLowerCase().includes(tld));
      const isShortener = /bit\.ly|tinyurl|t\.co|goo\.gl|ow\.ly|is\.gd/i.test(validatedUrl);
      
      analysisResult = {
        decoded_url: validatedUrl,
        is_malicious: isSuspiciousTld || isShortener,
        threat_score: isSuspiciousTld ? 75 : isShortener ? 50 : 15,
        threats_detected: [
          ...(isSuspiciousTld ? ['Suspicious top-level domain'] : []),
          ...(isShortener ? ['URL shortener may hide malicious destination'] : [])
        ],
        redirect_chain: isShortener ? [validatedUrl, 'Unknown final destination'] : [],
        recommendation: isSuspiciousTld || isShortener 
          ? 'Exercise caution. Verify the destination before clicking.'
          : 'URL appears safe, but always verify the source.'
      };
    }

    // Store scan result with user ID
    await supabase.from('scan_results').insert({
      scan_type: 'qr',
      target: validatedUrl,
      status: 'completed',
      result: analysisResult,
      threats_found: analysisResult.is_malicious ? 1 : 0,
      severity: analysisResult.is_malicious ? 'high' : 'low',
      completed_at: new Date().toISOString(),
      created_by: user.id
    });

    // If malicious, create threat record
    if (analysisResult.is_malicious) {
      await supabase.from('threats').insert({
        source_type: 'qr',
        domain: domain || validatedUrl,
        severity: analysisResult.threat_score > 70 ? 'critical' : 'high',
        attack_type: 'Phishing/Malicious URL',
        confidence: analysisResult.threat_score / 100,
        raw_data: analysisResult
      });
    }

    // Audit log the scan
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      action: 'qr_analysis',
      resource_type: 'scan',
      details: { url: validatedUrl, is_malicious: analysisResult.is_malicious }
    });

    console.log(`QR analysis completed for user ${user.id}: ${validatedUrl}`);

    return new Response(
      JSON.stringify(analysisResult),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('QR analysis error:', error);
    return new Response(
      JSON.stringify({ error: error?.message || 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});