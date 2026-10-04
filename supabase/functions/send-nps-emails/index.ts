/**
 * send-nps-emails
 *
 * 역할: pg_cron으로 매일 오전 10시(KST) 자동 호출.
 *       nps_email_queue에서 send_at <= now() AND sent = false 인 row를
 *       Resend API로 이메일 발송 후 sent = true로 업데이트.
 *
 * 환경변수 (Supabase Secrets — Hanna가 직접 추가):
 *   RESEND_API_KEY       — Resend 대시보드에서 발급
 *   NPS_URL              — https://checker.krk.team/beta/nps
 *   SUPABASE_URL         — 자동 주입
 *   SUPABASE_SERVICE_ROLE_KEY — 자동 주입
 *
 * pg_cron 등록 SQL (Hanna가 Supabase 대시보드 SQL Editor에서 직접 실행):
 * ──────────────────────────────────────────────────────────────────────────
 * select cron.schedule(
 *   'send-nps-emails-daily',
 *   '0 1 * * *',   -- 매일 UTC 01:00 = KST 10:00
 *   $$
 *   select net.http_post(
 *     url := 'https://ershciqovotewsxzjyeq.supabase.co/functions/v1/send-nps-emails',
 *     headers := '{"Authorization": "Bearer <SERVICE_ROLE_KEY>"}'::jsonb
 *   );
 *   $$
 * );
 * ──────────────────────────────────────────────────────────────────────────
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Resend }        from 'npm:resend'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface QueueRow {
  id:             string
  email:          string
  application_id: string
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const resend = new Resend(Deno.env.get('RESEND_API_KEY')!)
  const npsUrl = Deno.env.get('NPS_URL') ?? 'https://checker.krk.team/beta/nps'

  try {
    // 1. 발송 대상 조회
    const { data: rows, error: fetchError } = await supabase
      .from('nps_email_queue')
      .select('id, email, application_id')
      .lte('send_at', new Date().toISOString())
      .eq('sent', false)
      .limit(50)

    if (fetchError) {
      console.error('[send-nps-emails] fetch error:', fetchError.message)
      return new Response(JSON.stringify({ error: fetchError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!rows || rows.length === 0) {
      return new Response(JSON.stringify({ ok: true, sent: 0 }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    let sentCount = 0

    for (const row of rows as QueueRow[]) {
      try {
        // 2. Resend로 이메일 발송
        await resend.emails.send({
          from:    'KRK CHECKER <noreply@checker.krk.team>',
          to:      row.email,
          subject: '[KRK CHECKER] 3분이면 돼요 — 솔직한 한마디 부탁드려요 🙏',
          html: `
<!DOCTYPE html>
<html lang="ko">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background:#f9f9f9; margin:0; padding:0;">
  <div style="max-width:480px; margin:40px auto; background:#fff; border-radius:16px; padding:40px 36px; border:1px solid #eee;">
    <div style="font-size:13px; font-weight:800; letter-spacing:0.2em; color:#002D72; margin-bottom:28px;">
      KRK CHECKER
    </div>
    <h1 style="font-size:20px; font-weight:700; color:#0A0A0B; margin:0 0 12px; line-height:1.3;">
      안녕하세요, KRK CHECKER 베타 파트너님! 👋
    </h1>
    <p style="font-size:14px; color:rgba(10,10,11,0.65); line-height:1.7; margin:0 0 28px;">
      사용해보셨나요? 딱 3분이면 되는 설문이에요.<br>
      완료하시면 정식 출시 후 <strong>50% 평생 할인 코드</strong>를 드려요.
    </p>
    <a href="${npsUrl}" style="display:block; background:#002D72; color:#fff; text-decoration:none; border-radius:10px; padding:14px 0; text-align:center; font-size:14.5px; font-weight:600; margin-bottom:28px;">
      👉 설문 참여하기
    </a>
    <p style="font-size:12px; color:rgba(10,10,11,0.4); line-height:1.6; margin:0;">
      감사합니다.<br>KRK CHECKER 한나 드림
    </p>
  </div>
</body>
</html>
          `.trim(),
        })

        // 3. sent = true 업데이트
        await supabase
          .from('nps_email_queue')
          .update({ sent: true })
          .eq('id', row.id)

        sentCount++
      } catch (emailErr) {
        console.error(`[send-nps-emails] 발송 실패 (id=${row.id}):`, emailErr)
        // 개별 실패는 계속 진행
      }
    }

    return new Response(JSON.stringify({ ok: true, sent: sentCount }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('[send-nps-emails] unexpected error:', err)
    return new Response(JSON.stringify({ error: 'internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
