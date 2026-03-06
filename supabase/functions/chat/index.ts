import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    // Verify the user is authenticated
    const auth = req.headers.get('Authorization')
    if (!auth) return new Response(JSON.stringify({ error: { message: 'Unauthorized' } }), { status: 401, headers: cors })

    const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!)
    const { data: { user }, error } = await sb.auth.getUser(auth.replace('Bearer ', ''))
    if (error || !user) return new Response(JSON.stringify({ error: { message: 'Unauthorized' } }), { status: 401, headers: cors })

    // Forward request to Gemini
    const body = await req.json()
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${Deno.env.get('GEMINI_KEY')}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
    )
    const data = await res.json()
    return new Response(JSON.stringify(data), { headers: { ...cors, 'Content-Type': 'application/json' } })

  } catch (err) {
    return new Response(JSON.stringify({ error: { message: err.message } }), { status: 500, headers: cors })
  }
})
