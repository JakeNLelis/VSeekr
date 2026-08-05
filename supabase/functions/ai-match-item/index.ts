import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.2.1"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function fetchBase64(url: string) {
  const res = await fetch(url);
  const arrayBuffer = await res.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { record } = await req.json()
    if (!record || !record.id || !record.image_urls || record.image_urls.length === 0) {
      return new Response(JSON.stringify({ message: "No images provided" }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const targetType = record.type === 'lost' ? 'found' : 'lost'

    // Fetch up to 5 recent active reports of the opposite type in the same category
    const { data: candidates, error } = await supabaseAdmin
      .from('reports')
      .select('id, user_id, item_name, image_urls')
      .eq('type', targetType)
      .eq('category', record.category)
      .eq('status', 'active')
      .neq('image_urls', null)
      .order('created_at', { ascending: false })
      .limit(5)

    if (error) throw error
    if (!candidates || candidates.length === 0) {
      return new Response(JSON.stringify({ message: "No candidates found" }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Fetch images and convert to base64
    const newImageBase64 = await fetchBase64(record.image_urls[0])
    
    const parts: any[] = [
      { text: `I need your help to determine if a newly reported item matches any potential candidate items based on their images.\nThe newly reported item is a ${record.type} ${record.item_name}.\n\nIs it the exact same object as any of the candidates?\nOnly reply with the exact CANDIDATE ID of the matching candidate, or "none" if there is no match.\nDo not include any other text, just the UUID or "none".` },
      { text: "NEW ITEM IMAGE:" },
      { inlineData: { data: newImageBase64, mimeType: "image/jpeg" } },
    ]

    for (const candidate of candidates) {
      if (candidate.image_urls && candidate.image_urls.length > 0) {
        try {
          const b64 = await fetchBase64(candidate.image_urls[0])
          parts.push({ text: `CANDIDATE ID: ${candidate.id}` })
          parts.push({ inlineData: { data: b64, mimeType: "image/jpeg" } })
        } catch (e) {
          console.error("Failed to fetch image for candidate", candidate.id, e)
        }
      }
    }

    if (parts.length <= 3) {
      return new Response(JSON.stringify({ message: "No candidate images could be fetched" }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const genAI = new GoogleGenerativeAI(Deno.env.get('GEMINI_API_KEY') || '');
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const result = await model.generateContent(parts);
    const response = await result.response;
    const text = response.text().trim();

    console.log("Gemini Response:", text);

    if (text.toLowerCase() !== 'none' && text.length > 5) {
      // It's likely a UUID
      const matchId = text;
      const match = candidates.find(c => c.id === matchId);
      
      if (match) {
        // Create Notification for the MATCH owner
        await supabaseAdmin.from('notifications').insert({
          user_id: match.user_id,
          title: 'Potential Match Found!',
          body: `Someone posted a ${record.type} ${record.item_name} that looks like your item.`,
          type: 'ai_match',
          reference_id: record.id
        });

        // Try to trigger push notification
        try {
          await supabaseAdmin.functions.invoke('send-push', {
            body: {
              user_id: match.user_id,
              title: 'Potential Match Found!',
              body: `Someone posted a ${record.type} ${record.item_name} that looks like your item.`,
              data: { url: `/details/${record.id}` }
            }
          });
        } catch (e) {
          console.error("Failed to send push", e);
        }
      }
    }

    return new Response(JSON.stringify({ success: true, match_response: text }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (err: any) {
    console.error(err)
    return new Response(JSON.stringify({ error: err.message }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 })
  }
})
