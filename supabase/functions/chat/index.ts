import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    const auth = req.headers.get('Authorization')
    if (!auth) return new Response(JSON.stringify({ error: { message: 'Unauthorized' } }), { status: 401, headers: cors })

    const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!)
    const { data: { user }, error } = await sb.auth.getUser(auth.replace('Bearer ', ''))
    if (error || !user) return new Response(JSON.stringify({ error: { message: 'Unauthorized' } }), { status: 401, headers: cors })

    // Parse incoming Gemini-format body from app.html
    const body = await req.json()
    const { systemInstruction, contents = [], generationConfig = {} } = body

    // Convert Gemini format → OpenAI format
    const messages: { role: string; content: string }[] = []
    if (systemInstruction) {
      const sysText = (systemInstruction.parts || []).map((p: any) => p.text).join('\n')
      messages.push({ role: 'system', content: sysText })
    }
    for (const turn of contents) {
      messages.push({
        role: turn.role === 'model' ? 'assistant' : 'user',
        content: (turn.parts || []).map((p: any) => p.text).join(''),
      })
    }

    // Call OpenRouter (OpenAI-compatible)
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('OPENROUTER_KEY')}`,
        'HTTP-Referer': 'https://propfirmterminal.com',
        'X-Title': 'PropFirmTerminal',
      },
      body: JSON.stringify({
        model: 'meta-llama/llama-3.3-70b-instruct:free',
        messages,
        max_tokens: generationConfig.maxOutputTokens || 600,
        temperature: generationConfig.temperature ?? 0.7,
      }),
    })
    const orData = await res.json()

    // Convert OpenAI response → Gemini format so app.html needs no changes
    if (orData.error) {
      return new Response(JSON.stringify({ error: orData.error }), { headers: { ...cors, 'Content-Type': 'application/json' } })
    }
    const text = orData.choices?.[0]?.message?.content || ''
    const geminiShape = { candidates: [{ content: { parts: [{ text }] } }] }
    return new Response(JSON.stringify(geminiShape), { headers: { ...cors, 'Content-Type': 'application/json' } })

  } catch (err) {
    return new Response(JSON.stringify({ error: { message: err.message } }), { status: 500, headers: cors })
  }
})
