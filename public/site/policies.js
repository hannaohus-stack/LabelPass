/* LabelPass 정책 모달 (이용약관 · 개인정보처리방침 · 환불정책)
   - 푸터의 /terms, /privacy, /refund 링크와 .rf-open 버튼, 주소 해시(#terms 등)로 열립니다.
   - [대괄호] 표시는 사업자 정보 확정 후 채워야 하는 자리입니다. */
(function () {
  var EFFECTIVE = '2026년 [ ]월 [ ]일';
  var CO = '[상호]';

  var css = '' +
  '.pm-open{color:var(--blue,#3358EE);font-weight:700;padding:0;font-size:inherit;background:none;border:0;cursor:pointer}' +
  '.pm-open:hover{text-decoration:underline}' +
  'dialog.pm{width:min(760px,calc(100% - 32px));height:min(820px,calc(100vh - 48px));border:0;border-radius:24px;padding:0;color:#182136;box-shadow:0 30px 80px rgba(17,26,46,.35);overflow:hidden}' +
  'dialog.pm[open]{display:flex;flex-direction:column;animation:pmin .25s ease}' +
  'dialog.pm::backdrop{background:rgba(17,26,46,.55)}' +
  '@keyframes pmin{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}' +
  '.pm-h{flex-shrink:0;padding:22px 26px 0;border-bottom:1px solid #E4E8F0;background:#fff}' +
  '.pm-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:14px}' +
  '.pm-top b{font-size:13px;font-weight:800;color:#3358EE;letter-spacing:.04em}' +
  '.pm-x{width:40px;height:40px;border-radius:50%;display:grid;place-items:center;background:#F4F6FB;border:0;cursor:pointer}' +
  '.pm-x svg{width:18px;height:18px;stroke:#182136;stroke-width:2;stroke-linecap:round;fill:none}' +
  '.pm-tabs{display:flex;gap:4px;overflow-x:auto}' +
  '.pm-tabs button{flex-shrink:0;height:46px;padding:0 16px;border:0;background:none;font:inherit;font-size:16px;font-weight:700;color:#8A94A8;border-bottom:2px solid transparent;cursor:pointer}' +
  '.pm-tabs button[aria-selected="true"]{color:#182136;border-bottom-color:#182136}' +
  '.pm-b{flex:1;overflow-y:auto;padding:26px 30px 34px;font-size:14.5px;line-height:1.8;color:#4B5873;overscroll-behavior:contain}' +
  '.pm-b section[hidden]{display:none}' +
  '.pm-b h2{font-size:22px;color:#182136;margin:0 0 4px;letter-spacing:-0.03em}' +
  '.pm-meta{font-size:13px;color:#8A94A8;margin:0 0 22px}' +
  '.pm-b h3{font-size:15.5px;font-weight:800;color:#182136;margin:24px 0 6px}' +
  '.pm-b p{margin:0 0 8px}' +
  '.pm-b ol,.pm-b ul{margin:0 0 8px;padding-left:20px}' +
  '.pm-b li{margin-bottom:4px}' +
  '.pm-b table{width:100%;border-collapse:collapse;font-size:13.5px;margin:8px 0 10px}' +
  '.pm-b th,.pm-b td{border:1px solid #E4E8F0;padding:8px 10px;text-align:left;vertical-align:top}' +
  '.pm-b th{background:#F4F6FB;color:#182136;font-weight:700}' +
  '.pm-sum{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:4px 0 18px}' +
  '.pm-sum div{border-radius:14px;padding:16px;background:#F4F6FB}' +
  '.pm-sum div.y{background:#EEF2FF}' +
  '.pm-sum b{display:block;color:#182136}' +
  '.pm-sum strong{font-size:19px;color:#3358EE}' +
  '.pm-sum .n strong{color:#8A94A8}' +
  '.pm-note{background:#F4F6FB;border-radius:12px;padding:12px 14px;font-size:13px}' +
  '@media (max-width:640px){dialog.pm{width:100%;height:100%;max-height:100%;max-width:100%;border-radius:0}.pm-b{padding:20px 20px 28px}.pm-h{padding:16px 16px 0}.pm-sum{grid-template-columns:1fr}.pm-tabs button{font-size:15px;padding:0 12px}}';

  var terms = '' +
  '<h2>이용약관</h2><p class="pm-meta">시행일 ' + EFFECTIVE + '</p>' +
  '<h3>제1조 (목적)</h3><p>이 약관은 ' + CO + '(이하 "회사")가 운영하는 라벨패스(이하 "서비스")의 이용 조건과 절차, 회사와 회원의 권리·의무 및 책임 사항을 정합니다.</p>' +
  '<h3>제2조 (정의)</h3><ol><li>"서비스"란 회원이 입력한 식품 정보를 바탕으로 표시사항을 검토하고, 검토 결과와 라벨 파일 등 결과물을 제공하는 온라인 서비스를 말합니다.</li><li>"회원"이란 이 약관에 동의하고 회원가입을 한 자를 말합니다.</li><li>"결과물"이란 검토 결과, 라벨 파일(PDF·PNG), 표시사항 텍스트, 검토 리포트, 신고 가이드, 분리배출 마크 파일 등 서비스가 제공하는 자료를 말합니다.</li></ol>' +
  '<h3>제3조 (약관의 게시와 개정)</h3><ol><li>회사는 이 약관을 서비스 화면에 게시합니다.</li><li>회사는 관련 법령을 위반하지 않는 범위에서 약관을 개정할 수 있으며, 개정 시 시행일 7일 전(회원에게 불리한 변경은 30일 전)부터 공지합니다.</li><li>회원이 개정 약관 시행일까지 거부 의사를 표시하지 않으면 동의한 것으로 봅니다. 동의하지 않는 회원은 탈퇴할 수 있습니다.</li></ol>' +
  '<h3>제4조 (회원가입과 계정)</h3><ol><li>회원가입은 이메일 또는 카카오 계정으로 할 수 있습니다.</li><li>회원은 계정 정보를 정확하게 유지하고, 계정을 제3자가 이용하게 해서는 안 됩니다.</li><li>회원은 언제든지 탈퇴를 요청할 수 있으며, 회사는 지체 없이 처리합니다.</li></ol>' +
  '<h3>제5조 (서비스의 내용)</h3><ol><li>무료 검토: 17개 표시 항목의 통과·주의·위반 개수 제공</li><li>기본: 항목별 검토 결과, 라벨 파일(PDF·PNG), 표시사항 텍스트</li><li>전문: 기본 내용에 더해 수정 방법, 관련 법령과 과태료 정보, 검토 리포트, 정부24 신고 가이드, 분리배출 마크 파일, 결제 후 30일 이내 같은 제품의 수정본 재검토 1회</li><li>서비스의 세부 내용과 가격은 서비스 화면에 게시된 바에 따릅니다.</li></ol>' +
  '<h3>제6조 (이용요금과 결제)</h3><ol><li>유료 서비스는 제품별 1회 결제 방식이며, 자동 갱신되는 구독 결제는 없습니다.</li><li>결제는 회사가 지정한 결제대행사를 통해 이루어집니다.</li><li>결제가 완료되면 결과물이 즉시 제공됩니다.</li></ol>' +
  '<h3>제7조 (청약철회와 환불)</h3><p>청약철회와 환불은 「전자상거래 등에서의 소비자보호에 관한 법률」과 회사의 환불정책에 따릅니다. 결과물은 결제 즉시 제공되는 디지털 콘텐츠로, 열람하거나 내려받은 뒤에는 청약철회가 제한될 수 있으며 회사는 결제 전에 이를 안내합니다.</p>' +
  '<h3>제8조 (결과물의 성격)</h3><ol><li>서비스는 회원이 입력한 정보를 바탕으로 관련 법령과 고시에 따라 표시사항을 검토하는 도구이며, 결과물은 법적 적합성을 보증하거나 법률 자문을 대신하지 않습니다.</li><li>검토 결과는 회원이 입력한 정보의 정확성에 따라 달라질 수 있으며, 입력 정보가 사실과 다른 경우의 결과에 대해서는 회원이 책임을 집니다.</li><li>회원은 결과물을 참고하여 최종 표시사항을 스스로 확인하고 결정해야 합니다.</li></ol>' +
  '<h3>제9조 (결과물의 보관)</h3><p>회사는 유료 결과물을 결제일로부터 1년간 마이페이지에 보관하며, 회원은 이 기간 동안 다시 내려받을 수 있습니다.</p>' +
  '<h3>제10조 (회원의 의무)</h3><ul><li>타인의 정보를 도용하거나 허위 정보를 입력하는 행위</li><li>서비스를 역설계·복제하거나 자동화된 방법으로 대량 이용하는 행위</li><li>서비스 운영을 방해하거나 결과물을 무단으로 재판매하는 행위</li></ul><p>회원은 위와 같은 행위를 해서는 안 되며, 회사는 위반 시 이용을 제한할 수 있습니다.</p>' +
  '<h3>제11조 (서비스의 변경과 중단)</h3><p>회사는 시스템 점검, 설비 장애, 법령 변경 등 부득이한 경우 서비스의 전부 또는 일부를 변경하거나 일시 중단할 수 있으며, 사전에 공지합니다. 다만 긴급한 경우 사후에 공지할 수 있습니다.</p>' +
  '<h3>제12조 (지식재산권)</h3><p>서비스와 검토 기준, 화면 구성에 대한 권리는 회사에 있습니다. 회원이 입력한 제품 정보와 회원이 결제하여 받은 결과물은 회원이 자신의 제품 표시와 신고 목적으로 자유롭게 이용할 수 있습니다.</p>' +
  '<h3>제13조 (책임의 제한)</h3><ol><li>회사는 천재지변, 회원의 귀책 사유, 회원의 입력 오류로 인한 손해에 대해 책임을 지지 않습니다.</li><li>회사의 고의 또는 중대한 과실이 없는 한, 결과물 이용으로 발생한 손해에 대한 회사의 책임은 해당 제품에 대해 회원이 지급한 이용요금을 한도로 합니다.</li></ol>' +
  '<h3>제14조 (분쟁 해결과 관할)</h3><p>서비스 이용과 관련한 분쟁은 대한민국 법을 따르며, 소송이 제기되는 경우 「민사소송법」에 따른 관할 법원으로 합니다.</p>' +
  '<p class="pm-note">부칙: 이 약관은 ' + EFFECTIVE + '부터 시행합니다.</p>';

  var privacy = '' +
  '<h2>개인정보처리방침</h2><p class="pm-meta">시행일 ' + EFFECTIVE + '</p>' +
  '<p>' + CO + '(이하 "회사")는 「개인정보 보호법」에 따라 이용자의 개인정보를 보호하고, 관련 고충을 신속하게 처리하기 위해 다음과 같이 개인정보처리방침을 둡니다.</p>' +
  '<h3>1. 처리하는 개인정보 항목</h3><table><tr><th>구분</th><th>항목</th></tr>' +
  '<tr><td>회원가입 (이메일)</td><td>이메일 주소, 비밀번호(암호화 저장)</td></tr>' +
  '<tr><td>회원가입 (카카오)</td><td>카카오 계정 식별값, 이메일 주소, 닉네임</td></tr>' +
  '<tr><td>서비스 이용</td><td>제품 정보 입력값(제품명, 원재료 등), 검토 이력, 결과물</td></tr>' +
  '<tr><td>결제</td><td>주문번호, 결제 금액, 결제 일시, 결제 상태 (카드 정보는 결제대행사가 처리하며 회사는 저장하지 않음)</td></tr>' +
  '<tr><td>도입문의</td><td>회사·브랜드명, 담당자 이름, 연락처, 이메일, 문의 내용</td></tr>' +
  '<tr><td>자동 수집</td><td>접속 기록, IP 주소, 쿠키, 기기·브라우저 정보, 서비스 이용 기록</td></tr></table>' +
  '<h3>2. 처리 목적</h3><ul><li>회원 식별, 가입·탈퇴 처리, 계정 관리</li><li>표시사항 검토와 결과물 제공, 결과물 보관과 재다운로드, 수정본 재검토</li><li>결제와 환불 처리, 이용 내역 확인</li><li>문의 응대와 도입 상담</li><li>서비스 개선과 이용 통계 분석, 부정 이용 방지</li></ul>' +
  '<h3>3. 보유 기간</h3><p>회원 탈퇴 또는 처리 목적이 달성되면 지체 없이 파기합니다. 다만 관계 법령에 따라 아래 정보는 정해진 기간 동안 보관합니다.</p>' +
  '<table><tr><th>항목</th><th>근거</th><th>기간</th></tr>' +
  '<tr><td>계약 또는 청약철회 기록</td><td rowspan="3">전자상거래법</td><td>5년</td></tr>' +
  '<tr><td>대금 결제와 재화 공급 기록</td><td>5년</td></tr>' +
  '<tr><td>소비자 불만 또는 분쟁 처리 기록</td><td>3년</td></tr>' +
  '<tr><td>접속 기록</td><td>통신비밀보호법</td><td>3개월</td></tr>' +
  '<tr><td>도입문의 정보</td><td>이용자 동의</td><td>상담 종료 후 1년</td></tr></table>' +
  '<h3>4. 제3자 제공</h3><p>회사는 이용자의 개인정보를 제3자에게 제공하지 않습니다. 다만 이용자의 동의가 있거나 법령에 특별한 규정이 있는 경우는 예외로 합니다.</p>' +
  '<h3>5. 처리 위탁과 국외 이전</h3><p>회사는 서비스 운영을 위해 다음과 같이 개인정보 처리를 위탁하며, 일부는 국외에서 처리됩니다.</p>' +
  '<table><tr><th>수탁자</th><th>위탁 업무</th><th>이전 국가</th></tr>' +
  '<tr><td>Supabase Inc.</td><td>회원 인증, 데이터 저장</td><td>[서버 리전 확인]</td></tr>' +
  '<tr><td>Vercel Inc.</td><td>웹사이트 호스팅</td><td>미국</td></tr>' +
  '<tr><td>Lemon Squeezy, LLC</td><td>결제 처리</td><td>미국</td></tr>' +
  '<tr><td>(주)카카오</td><td>카카오 로그인</td><td>대한민국</td></tr>' +
  '<tr><td>Google LLC · Microsoft Corp.</td><td>이용 통계 분석 (Google Analytics · Clarity)</td><td>미국</td></tr></table>' +
  '<p>국외 이전 항목은 위 1번의 해당 항목이며, 서비스 이용 시점에 네트워크를 통해 이전되고 위탁 계약 종료 또는 회원 탈퇴 시까지 보관됩니다. 이용자는 국외 이전을 거부할 수 있으나, 이 경우 서비스 이용이 제한될 수 있습니다.</p>' +
  '<h3>6. 파기 절차와 방법</h3><p>보유 기간이 끝난 개인정보는 지체 없이 파기합니다. 전자 파일은 복구할 수 없는 방법으로 삭제하고, 출력물은 분쇄하거나 소각합니다.</p>' +
  '<h3>7. 이용자의 권리</h3><p>이용자는 언제든지 자신의 개인정보 열람, 정정, 삭제, 처리 정지를 요청할 수 있으며, 회사는 지체 없이 조치합니다. 요청은 아래 개인정보 보호책임자에게 이메일 또는 카톡으로 할 수 있습니다.</p>' +
  '<h3>8. 쿠키와 분석 도구</h3><p>회사는 이용 통계 분석을 위해 쿠키와 분석 도구(Google Analytics, Microsoft Clarity)를 사용합니다. 이용자는 브라우저 설정에서 쿠키 저장을 거부할 수 있으며, 이 경우 일부 기능 이용이 어려울 수 있습니다.</p>' +
  '<h3>9. 안전성 확보 조치</h3><ul><li>비밀번호 암호화 저장, 전송 구간 암호화(HTTPS)</li><li>개인정보 접근 권한 최소화와 접근 기록 관리</li><li>보안 업데이트와 정기 점검</li></ul>' +
  '<h3>10. 개인정보 보호책임자</h3><table><tr><th>성명</th><td>[이름]</td></tr><tr><th>직책</th><td>대표</td></tr><tr><th>연락처</th><td>[이메일] · 카톡 [채널명]</td></tr></table>' +
  '<h3>11. 권익 침해 구제</h3><ul><li>개인정보침해신고센터 (privacy.kisa.or.kr / 118)</li><li>개인정보분쟁조정위원회 (www.kopico.go.kr / 1833-6972)</li><li>대검찰청 사이버수사과 (www.spo.go.kr / 1301)</li><li>경찰청 사이버수사국 (ecrm.police.go.kr / 182)</li></ul>' +
  '<h3>12. 방침의 변경</h3><p>이 방침이 변경되는 경우 시행 7일 전부터 서비스 화면에 공지합니다.</p>';

  var refund = '' +
  '<h2>환불정책</h2><p class="pm-meta">시행일 ' + EFFECTIVE + '</p>' +
  '<div class="pm-sum"><div class="y"><b>결과물 열람 전</b>결제 후 7일 이내<br><strong>전액 환불</strong></div><div class="n"><b>결과물 열람 · 다운로드 후</b>디지털 콘텐츠 특성상<br><strong>환불 제한</strong></div></div>' +
  '<h3>1. 환불이 되는 경우</h3><ul><li>결제 후 7일 이내, 항목별 결과·파일을 열람하거나 내려받지 않은 경우 — 전액 환불</li><li>같은 제품을 중복 결제한 경우 — 중복 결제분 전액 환불</li><li>서비스 오류로 결과물이 제공되지 않거나, 안내한 내용과 다르게 제공된 경우 — 재제공 또는 전액 환불</li></ul>' +
  '<h3>2. 환불이 제한되는 경우</h3><ul><li>항목별 결과를 열람했거나 라벨 파일·리포트를 내려받은 경우</li><li>입력한 정보가 실제 제품과 달라 생긴 결과 차이</li><li>전문 서비스의 수정본 재검토(30일 내 1회)를 사용하지 않은 경우 — 미사용분은 환불되지 않습니다</li></ul>' +
  '<h3>3. 신청 방법</h3><ol><li>카톡 또는 이메일로 결제 이메일 주소와 제품명을 알려주세요.</li><li>확인 후 영업일 기준 3일 안에 처리 결과를 안내합니다.</li><li>카드 취소는 카드사 사정에 따라 3~7영업일이 걸릴 수 있습니다.</li></ol>' +
  '<p class="pm-note">결과물은 결제 즉시 제공되는 디지털 콘텐츠로, 「전자상거래 등에서의 소비자보호에 관한 법률」 제17조 제2항에 따라 열람·다운로드 후에는 청약철회가 제한될 수 있습니다. 결제 전 이 내용을 안내합니다.</p>';

  var TABS = [['terms', '이용약관', terms], ['privacy', '개인정보처리방침', privacy], ['refund', '환불정책', refund]];

  function build() {
    var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
    var d = document.createElement('dialog'); d.className = 'pm'; d.id = 'pm'; d.setAttribute('aria-label', '정책 안내');
    var tabs = TABS.map(function (t, i) { return '<button role="tab" id="pmt-' + t[0] + '" aria-controls="pms-' + t[0] + '" aria-selected="' + (i === 0) + '"' + (i ? ' tabindex="-1"' : '') + '>' + t[1] + '</button>'; }).join('');
    var secs = TABS.map(function (t, i) { return '<section role="tabpanel" id="pms-' + t[0] + '" aria-labelledby="pmt-' + t[0] + '"' + (i ? ' hidden' : '') + '>' + t[2] + '</section>'; }).join('');
    d.innerHTML = '<div class="pm-h"><div class="pm-top"><b>LABELPASS POLICY</b><button class="pm-x" type="button" aria-label="닫기"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg></button></div><div class="pm-tabs" role="tablist">' + tabs + '</div></div><div class="pm-b">' + secs + '</div>';
    document.body.appendChild(d);
    var btns = [].slice.call(d.querySelectorAll('.pm-tabs button')), body = d.querySelector('.pm-b');
    function sel(key, focus) {
      btns.forEach(function (b) { var on = b.id === 'pmt-' + key; b.setAttribute('aria-selected', on); b.tabIndex = on ? 0 : -1; d.querySelector('#' + b.getAttribute('aria-controls')).hidden = !on; if (on && focus) b.focus(); });
      body.scrollTop = 0;
    }
    btns.forEach(function (b, i) {
      b.addEventListener('click', function () { sel(b.id.slice(4)); });
      b.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); var n = (i + (e.key === 'ArrowRight' ? 1 : btns.length - 1)) % btns.length; sel(btns[n].id.slice(4), true); }
      });
    });
    d.querySelector('.pm-x').addEventListener('click', function () { d.close(); });
    d.addEventListener('click', function (e) { if (e.target === d) d.close(); });
    function open(key) { sel(key); if (!d.open) d.showModal(); }
    document.addEventListener('click', function (e) {
      var a = e.target.closest('a[href="/terms"],a[href="/privacy"],a[href="/refund"],.rf-open,[data-policy]');
      if (!a) return;
      e.preventDefault();
      var key = a.getAttribute('data-policy') || (a.classList.contains('rf-open') ? 'refund' : a.getAttribute('href').slice(1));
      open(key);
    });
    var h = location.hash.slice(1); if (h === 'terms' || h === 'privacy' || h === 'refund') open(h);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build); else build();
})();

/* ── 외부 채널 링크 (한 곳에서 관리) ──────────────────────────────────────
   주소가 생기면 아래 값만 채우면 모든 페이지(랜딩·요금·서비스·도입문의·블로그)에 반영됩니다.
   비어 있으면: 카톡 버튼 → 도입문의(/contact)로 임시 연결, 푸터 아이콘은 숨김. */
(function () {
  var LINKS = {
    kakao: '',   // 예: https://pf.kakao.com/_xxxx/chat
    naver: '',   // 예: https://blog.naver.com/xxxx
    youtube: ''  // 예: https://www.youtube.com/@xxxx
  };
  function run() {
    ['kakao', 'naver', 'youtube'].forEach(function (k) {
      [].forEach.call(document.querySelectorAll('a[href="#' + k + '"]'), function (a) {
        if (LINKS[k]) { a.href = LINKS[k]; a.target = '_blank'; a.rel = 'noopener'; return; }
        if (a.closest('.foot-sns') || k !== 'kakao' || location.pathname.replace(/\/$/, '') === '/contact') { a.hidden = true; a.style.display = 'none'; return; }
        a.href = '/contact';
      });
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run); else run();
})();
