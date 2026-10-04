// supabase/functions/lemonsqueezy-checkout/index.ts
// 배포: supabase functions deploy lemonsqueezy-checkout
//
// Supabase 환경변수 (supabase secrets set):
//   LEMONSQUEEZY_API_KEY=your_api_key
//   LEMONSQUEEZY_STORE_ID=your_store_id

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { variantId, userId, redirectUrl } = await req.json()

    if (!variantId) {
      return new Response(
        JSON.stringify({ error: 'variantId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const LS_API_KEY  = Deno.env.get('LEMONSQUEEZY_API_KEY')!
    const LS_STORE_ID = Deno.env.get('LEMONSQUEEZY_STORE_ID')!

    const payload = {
      data: {
        type: 'checkouts',
        attributes: {
          checkout_data: {
            custom: { user_id: userId ?? 'anonymous' },
          },
          product_options: {
            redirect_url: redirectUrl ?? 'https://checker.krk.team/payment/complete',
          },
        },
        relationships: {
          store:   { data: { type: 'stores',   id: LS_STORE_ID } },
          variant: { data: { type: 'variants', id: String(variantId) } },
        },
      },
    }

    const lsRes = await fetch('https://api.lemonsqueezy.com/v1/checkouts', {
      method: 'POST',
      headers: {
        'Authorization':  `Bearer ${LS_API_KEY}`,
        'Content-Type':   'application/vnd.api+json',
        'Accept':         'application/vnd.api+json',
      },
      body: JSON.stringify(payload),
    })

    if (!lsRes.ok) {
      const errBody = await lsRes.text()
      console.error('[LS] checkout error', lsRes.status, errBody)
      return new Response(
        JSON.stringify({ error: 'lemonsqueezy_error', detail: errBody }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const data = await lsRes.json()
    const checkoutUrl = data.data.attributes.url

    return new Response(
      JSON.stringify({ checkoutUrl }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    console.error('[LS] unexpected error', err)
    return new Response(
      JSON.stringify({ error: 'internal_error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
