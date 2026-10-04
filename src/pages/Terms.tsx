import { useNavigate } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import LogoLockup from '../components/LogoLockup'

export default function Terms() {
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
        <h1 className="mb-2 font-kr text-[28px] font-semibold tracking-[-0.02em] text-ink">이용약관</h1>
        <p className="mb-10 font-kr text-[13px] text-[rgba(10,10,11,0.45)]">최종 업데이트: 2025년 1월</p>

        <div className="space-y-8 font-kr text-[14px] leading-[1.8] text-[rgba(10,10,11,0.75)]">
          <section>
            <h2 className="mb-3 font-semibold text-ink">1. 서비스 개요</h2>
            <p>KRK CHECKER는 식품 라벨 검토 및 가이드 제공 서비스입니다. 본 서비스는 참고용 정보를 제공하며, 법적 효력을 갖는 공식 검토 결과를 대체하지 않습니다.</p>
          </section>

          <section>
            <h2 className="mb-3 font-semibold text-ink">2. 이용 조건</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>본 서비스는 만 14세 이상 이용 가능합니다.</li>
              <li>회원가입 시 정확한 정보를 제공해야 합니다.</li>
              <li>타인의 계정을 무단으로 사용하거나 서비스를 악용해서는 안 됩니다.</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 font-semibold text-ink">3. 결제 및 환불</h2>
            <p>결제는 Lemon Squeezy를 통해 처리됩니다. 디지털 콘텐츠 특성상 파일 다운로드 후에는 환불이 제한될 수 있습니다. 기술적 오류로 인한 경우 hello@krk.team으로 문의해주세요.</p>
          </section>

          <section>
            <h2 className="mb-3 font-semibold text-ink">4. 서비스 면책</h2>
            <p>KRK CHECKER가 제공하는 정보는 참고용입니다. 실제 식약처 규정 준수 여부는 관련 전문가 또는 기관을 통해 확인하시기 바랍니다. 서비스 이용으로 인한 손해에 대해 당사는 책임을 지지 않습니다.</p>
          </section>

          <section>
            <h2 className="mb-3 font-semibold text-ink">5. 지식재산권</h2>
            <p>서비스 내 모든 콘텐츠의 저작권은 KRK에 귀속됩니다. 무단 복제 및 배포를 금지합니다.</p>
          </section>

          <section>
            <h2 className="mb-3 font-semibold text-ink">6. 약관 변경</h2>
            <p>약관은 사전 공지 후 변경될 수 있습니다. 변경된 약관은 서비스 내 공지 시점부터 효력이 발생합니다.</p>
          </section>

          <section>
            <h2 className="mb-3 font-semibold text-ink">7. 문의</h2>
            <p>이메일: <a href="mailto:hello@krk.team" className="text-heritage-500 underline">hello@krk.team</a></p>
          </section>
        </div>
      </main>
    </div>
  )
}
