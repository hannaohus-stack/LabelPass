import { useNavigate } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import LogoLockup from '../components/LogoLockup'

export default function Privacy() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-white">
      <nav className="sticky top-0 z-40 border-b border-[rgba(10,10,11,0.1)] bg-white/75 px-5 py-4 backdrop-blur-[18px] md:px-12">
        <div className="mx-auto flex max-w-[800px] items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 font-en text-[12px] text-[rgba(10,10,11,0.5)] transition-colors hover:text-ink"
          >
            <ChevronLeft size={14} />
            Back
          </button>
          <LogoLockup />
          <div className="w-16" />
        </div>
      </nav>

      <main className="mx-auto max-w-[800px] px-5 py-12 md:px-8 md:py-16">
        <h1 className="mb-2 font-kr text-[28px] font-semibold tracking-[-0.02em] text-ink">개인정보처리방침</h1>
        <p className="mb-10 font-kr text-[13px] text-[rgba(10,10,11,0.45)]">최종 업데이트: 2025년 1월</p>

        <div className="space-y-8 font-kr text-[14px] leading-[1.8] text-[rgba(10,10,11,0.75)]">
          <section>
            <h2 className="mb-3 font-semibold text-ink">1. 수집하는 개인정보</h2>
            <p>KRK CHECKER는 서비스 제공을 위해 다음의 정보를 수집합니다.</p>
            <ul className="mt-2 list-disc pl-5 space-y-1">
              <li>이메일 주소 (회원가입 및 로그인 시)</li>
              <li>제품 정보 및 원재료 데이터 (서비스 이용 시 입력)</li>
              <li>결제 정보 (결제 처리는 Lemon Squeezy를 통해 처리되며, 카드 정보는 당사에 저장되지 않습니다)</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 font-semibold text-ink">2. 개인정보의 이용 목적</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>서비스 제공 및 운영</li>
              <li>결제 처리 및 영수증 발송</li>
              <li>고객 문의 응대</li>
              <li>서비스 개선 및 신규 기능 개발</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 font-semibold text-ink">3. 개인정보의 보유 및 이용 기간</h2>
            <p>회원 탈퇴 시까지 보유하며, 관련 법령에 따라 일정 기간 보관이 필요한 경우 해당 기간 동안 보관합니다.</p>
          </section>

          <section>
            <h2 className="mb-3 font-semibold text-ink">4. 개인정보의 제3자 제공</h2>
            <p>당사는 이용자의 동의 없이 개인정보를 제3자에게 제공하지 않습니다. 단, 결제 처리를 위해 Lemon Squeezy에 필요한 정보가 전달될 수 있습니다.</p>
          </section>

          <section>
            <h2 className="mb-3 font-semibold text-ink">5. 이용자의 권리</h2>
            <p>이용자는 언제든지 개인정보 열람, 수정, 삭제를 요청할 수 있습니다. 문의: <a href="mailto:hello@krk.team" className="text-heritage-500 underline">hello@krk.team</a></p>
          </section>

          <section>
            <h2 className="mb-3 font-semibold text-ink">6. 문의</h2>
            <p>개인정보 관련 문의사항은 아래로 연락해주세요.<br />이메일: <a href="mailto:hello@krk.team" className="text-heritage-500 underline">hello@krk.team</a></p>
          </section>
        </div>
      </main>
    </div>
  )
}
