import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { invite_code } = await req.json()
    
    if (!invite_code) {
      return new Response(
        JSON.stringify({ error: 'invite_code is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create Supabase client with service role key
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Get the authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser()

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Find band by invite code
    const { data: band, error: bandError } = await supabaseClient
      .from('hub_bands')
      .select('id, name')
      .eq('invite_code', invite_code)
      .single()

    if (bandError || !band) {
      return new Response(
        JSON.stringify({ error: 'Invalid invite code' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if user is already a member
    const { data: existingMember } = await supabaseClient
      .from('hub_band_members')
      .select('band_id, user_id')
      .eq('band_id', band.id)
      .eq('user_id', user.id)
      .single()

    if (existingMember) {
      return new Response(
        JSON.stringify({ message: 'Already a member of this band' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Add user to band
    const { error: joinError } = await supabaseClient
      .from('hub_band_members')
      .insert({
        band_id: band.id,
        user_id: user.id,
      })

    if (joinError) {
      return new Response(
        JSON.stringify({ error: 'Failed to join band' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ 
        message: 'Successfully joined band',
        band: { id: band.id, name: band.name }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
