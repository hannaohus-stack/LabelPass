/**
 * schedule-nps-email
 *
 * 역할: BetaApply 쿠폰 노출 직후 프론트에서 호출.
 *       nps_email_queue 테이블에 3일 후 발송 예약 row를 INSERT한다.
 *
 * 요청 body (JSON):
 *   { email: string, application_id: string }
 *
 * 환경변수 (Supabase Secrets):
 *   SUPABASE_URL        — 자동 주입
 *   SUPABASE_SERVICE_ROLE_KEY — 자동 주입
 *
 * ⚠️ nps_email_queue 테이블은 Hanna가 Supabase 대시보드 SQL Editor에서
 *    docs/sql/create_nps_email_queue.sql 을 실행해야 사용 가능.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { email, application_id } = await req.json() as {
      email: string
      application_id: string
    }

    if (!email || !application_id) {
      return new Response(
        JSON.stringify({ error: 'email and application_id are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // 3일 후 발송 예약
    const sendAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()

    const { error } = await supabase
      .from('nps_email_queue')
      .insert({
        email,
        application_id,
        send_at: sendAt,
        sent: false,
      })

    if (error) {
      console.error('[schedule-nps-email] insert error:', error.message)
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ ok: true, send_at: sendAt }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('[schedule-nps-email] unexpected error:', err)
    return new Response(
      JSON.stringify({ error: 'internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
