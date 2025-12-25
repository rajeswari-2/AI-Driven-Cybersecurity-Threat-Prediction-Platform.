import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');

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
    const { url } = await req.json();
    
    if (!url) {
      return new Response(
        JSON.stringify({ error: 'URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Analyzing QR code URL: ${url}`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
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
    let domain;
    try {
      domain = new URL(url).hostname;
      const { data: blockedEntity } = await supabase
        .from('blocked_entities')
        .select('*')
        .eq('type', 'domain')
        .eq('value', domain)
        .maybeSingle();

      if (blockedEntity) {
        return new Response(
          JSON.stringify({ 
            decoded_url: url,
            is_malicious: true,
            threat_score: 100,
            threats_detected: ['Domain is on blocklist'],
            recommendation: 'Do not visit this URL. It has been blocked as malicious.',
            blocked: true
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } catch (e) {
      // Invalid URL
    }

    // Use Gemini for analysis
    let analysisResult = await analyzeWithGemini(url);
    
    if (!analysisResult) {
      // Fallback analysis based on simple heuristics
      const suspiciousTlds = ['.xyz', '.tk', '.ml', '.ga', '.cf', '.gq'];
      const isSuspiciousTld = suspiciousTlds.some(tld => url.toLowerCase().includes(tld));
      const isShortener = /bit\.ly|tinyurl|t\.co|goo\.gl|ow\.ly|is\.gd/i.test(url);
      
      analysisResult = {
        decoded_url: url,
        is_malicious: isSuspiciousTld || isShortener,
        threat_score: isSuspiciousTld ? 75 : isShortener ? 50 : 15,
        threats_detected: [
          ...(isSuspiciousTld ? ['Suspicious top-level domain'] : []),
          ...(isShortener ? ['URL shortener may hide malicious destination'] : [])
        ],
        redirect_chain: isShortener ? [url, 'Unknown final destination'] : [],
        recommendation: isSuspiciousTld || isShortener 
          ? 'Exercise caution. Verify the destination before clicking.'
          : 'URL appears safe, but always verify the source.'
      };
    }

    // Store scan result
    await supabase.from('scan_results').insert({
      scan_type: 'qr',
      target: url,
      status: 'completed',
      result: analysisResult,
      threats_found: analysisResult.is_malicious ? 1 : 0,
      severity: analysisResult.is_malicious ? 'high' : 'low',
      completed_at: new Date().toISOString()
    });

    // If malicious, create threat record
    if (analysisResult.is_malicious) {
      await supabase.from('threats').insert({
        source_type: 'qr',
        domain: domain || url,
        severity: analysisResult.threat_score > 70 ? 'critical' : 'high',
        attack_type: 'Phishing/Malicious URL',
        confidence: analysisResult.threat_score / 100,
        raw_data: analysisResult
      });
    }

    console.log('QR analysis completed:', url);

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
