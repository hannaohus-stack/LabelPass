import { useNavigate } from 'react-router-dom'
import { Check, Download, FileText, ListChecks } from 'lucide-react'

const heroModals = [
  {
    title: '원재료 표기 정리됨',
    body: '딸기 50% · 설탕 30% · 레몬즙 10% · 펙틴 5%',
    note: '표시 기준에 맞춰 정돈',
    Icon: FileText,
  },
  {
    title: '표시 항목 확인',
    body: '알레르기 · 내용량 · 보관방법 · 소비기한',
    note: '누락 가능 항목을 먼저 확인',
    Icon: ListChecks,
  },
  {
    title: '파일 준비 완료',
    body: '라벨 PDF · 신고 입력 가이드 · 라벨 검토 리포트',
    note: '결제 후 바로 다운로드',
    Icon: Download,
  },
]

export default function LandingHero() {
  const navigate = useNavigate()

  return (
    <section className="krk-hero" aria-label="KRK checker hero">
      <style>{`
        .krk-hero {
          position: relative;
          min-height: 100svh;
          overflow: hidden;
          background: #0A0A0B;
          color: #fff;
        }

        .krk-hero-video {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          filter: saturate(0.88) contrast(0.95);
        }

        .krk-hero-inner {
          position: relative;
          z-index: 2;
          min-height: 100svh;
          max-width: 1240px;
          margin: 0 auto;
          padding: 112px 40px 64px;
          display: grid;
          grid-template-columns: minmax(0, 1fr) 360px;
          gap: 48px;
          align-items: end;
        }

        .krk-hero-copy {
          max-width: 720px;
          padding-bottom: 28px;
        }

        .krk-hero-kicker {
          margin: 0 0 18px;
          font-family: Inter, system-ui, sans-serif;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0;
          color: rgba(255, 255, 255, 0.62);
        }

        .krk-hero-title {
          margin: 0;
          max-width: 760px;
          font-size: clamp(46px, 7vw, 92px);
          font-weight: 760;
          line-height: 0.98;
          letter-spacing: 0;
          text-wrap: balance;
        }

        .krk-hero-sub {
          margin: 24px 0 0;
          max-width: 520px;
          font-size: clamp(16px, 2vw, 21px);
          line-height: 1.62;
          color: rgba(255, 255, 255, 0.78);
        }

        .krk-hero-actions {
          display: flex;
          align-items: center;
          gap: 14px;
          margin-top: 34px;
          flex-wrap: wrap;
        }

        .krk-hero-primary {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          height: 52px;
          padding: 0 22px;
          border: 1px solid rgba(255, 255, 255, 0.22);
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.95);
          color: #0A0A0B;
          font-size: 14px;
          font-weight: 760;
          cursor: pointer;
          transition: transform 160ms ease, background 160ms ease;
        }

        .krk-hero-primary:hover {
          transform: translateY(-1px);
          background: #fff;
        }

        .krk-hero-secondary {
          color: rgba(255, 255, 255, 0.68);
          font-size: 13px;
          text-decoration: none;
          border-bottom: 1px solid rgba(255, 255, 255, 0.24);
          padding-bottom: 4px;
        }

        .krk-hero-modals {
          display: flex;
          flex-direction: column;
          gap: 14px;
          padding-bottom: 16px;
          width: min(360px, 100%);
          justify-self: end;
        }

        .krk-gloss {
          position: relative;
          overflow: hidden;
          isolation: isolate;
          border: 1px solid rgba(255, 255, 255, 0.46);
          border-radius: 8px;
          background:
            linear-gradient(145deg, rgba(255, 255, 255, 0.52) 0%, rgba(255, 255, 255, 0.18) 42%, rgba(255, 255, 255, 0.08) 100%),
            radial-gradient(120% 120% at 12% 0%, rgba(234, 246, 254, 0.36) 0%, rgba(234, 246, 254, 0) 52%),
            radial-gradient(100% 120% at 100% 100%, rgba(0, 45, 114, 0.28) 0%, rgba(0, 45, 114, 0) 56%),
            rgba(255, 255, 255, 0.1);
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.62),
            inset 0 -1px 0 rgba(255, 255, 255, 0.12),
            0 26px 70px rgba(0, 11, 31, 0.34),
            0 0 0 1px rgba(12, 164, 249, 0.08);
          backdrop-filter: blur(26px) saturate(175%) contrast(108%);
          -webkit-backdrop-filter: blur(26px) saturate(175%) contrast(108%);
          padding: 17px;
          animation: modalIn 720ms ease both;
        }

        .krk-gloss:nth-child(2) { animation-delay: 140ms; }
        .krk-gloss:nth-child(3) { animation-delay: 280ms; }

        .krk-gloss::before {
          content: '';
          position: absolute;
          inset: 0;
          z-index: -1;
          background:
            linear-gradient(115deg, rgba(255,255,255,0.44) 0%, rgba(255,255,255,0.16) 22%, rgba(255,255,255,0) 46%),
            linear-gradient(180deg, rgba(255,255,255,0.18), rgba(255,255,255,0));
          pointer-events: none;
        }

        .krk-gloss::after {
          content: '';
          position: absolute;
          left: 18px;
          right: 18px;
          top: 1px;
          height: 1px;
          background: linear-gradient(90deg, rgba(255,255,255,0), rgba(255,255,255,0.76), rgba(12,164,249,0.48), rgba(255,255,255,0));
          pointer-events: none;
        }

        .krk-gloss-head {
          position: relative;
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 12px;
        }

        .krk-gloss-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 30px;
          height: 30px;
          border-radius: 8px;
          background:
            linear-gradient(145deg, rgba(255,255,255,0.34), rgba(255,255,255,0.12)),
            rgba(234, 246, 254, 0.18);
          border: 1px solid rgba(255,255,255,0.28);
          color: rgba(255, 255, 255, 0.92);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.32);
        }

        .krk-gloss-title {
          margin: 0;
          font-size: 13px;
          font-weight: 760;
          color: rgba(255, 255, 255, 0.98);
        }

        .krk-gloss-body {
          position: relative;
          margin: 0;
          font-size: 12px;
          line-height: 1.55;
          color: rgba(255, 255, 255, 0.9);
        }

        .krk-gloss-note {
          position: relative;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          margin-top: 12px;
          color: rgba(255, 255, 255, 0.76);
          font-size: 11px;
        }

        .krk-gloss-note svg {
          color: #0CA4F9;
          filter: drop-shadow(0 0 8px rgba(12, 164, 249, 0.42));
        }

        @keyframes modalIn {
          from { opacity: 0; transform: translateY(14px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @media (min-width: 1280px) {
          .krk-hero-inner {
            grid-template-columns: minmax(0, 1fr) 380px;
          }

          .krk-hero-modals {
            width: 380px;
          }
        }

        @media (max-width: 860px) {
          .krk-hero-video {
            object-position: 55% center;
          }

          .krk-hero-inner {
            display: flex;
            flex-direction: column;
            justify-content: flex-end;
            align-items: stretch;
            padding: 88px 20px 22px;
            gap: 14px;
          }

          .krk-hero-copy {
            padding-bottom: 0;
          }

          .krk-hero-title {
            font-size: clamp(34px, 11vw, 50px);
            line-height: 1.04;
          }

          .krk-hero-sub {
            max-width: 330px;
            margin-top: 14px;
            font-size: 14px;
            line-height: 1.5;
          }

          .krk-hero-actions {
            margin-top: 18px;
          }

          .krk-hero-primary {
            width: 100%;
            justify-content: center;
            height: 50px;
          }

          .krk-hero-secondary {
            display: none;
          }

          .krk-hero-modals {
            position: relative;
            min-height: 118px;
            padding-bottom: 0;
          }

          .krk-gloss {
            position: absolute;
            inset: auto 0 0;
            padding: 14px;
            backdrop-filter: blur(18px) saturate(160%);
            -webkit-backdrop-filter: blur(18px) saturate(160%);
            animation: mobileModalCycle 9s infinite both;
          }

          .krk-gloss:nth-child(2) { animation-delay: 3s; }
          .krk-gloss:nth-child(3) { animation-delay: 6s; }

          .krk-gloss-body {
            font-size: 11px;
            line-height: 1.45;
          }

          .krk-gloss-head {
            margin-bottom: 10px;
          }

          .krk-gloss-icon {
            width: 26px;
            height: 26px;
          }

          .krk-gloss-title {
            font-size: 13px;
          }

          .krk-gloss-note {
            margin-top: 10px;
            font-size: 11px;
          }
        }

        @keyframes mobileModalCycle {
          0%, 8% { opacity: 0; transform: translateY(10px); }
          13%, 30% { opacity: 1; transform: translateY(0); }
          38%, 100% { opacity: 0; transform: translateY(-8px); }
        }
      `}</style>

      <video
        className="krk-hero-video"
        src="/checker/krk-hero-video.mp4"
        autoPlay
        muted
        loop
        playsInline
        aria-hidden="true"
      />

      <div className="krk-hero-inner">
        <div className="krk-hero-copy">
          <p className="krk-hero-kicker">KRK CHECKER</p>
          <h1 className="krk-hero-title">
            라벨도,
            <br />
            브랜드의 일부니까
          </h1>
          <p className="krk-hero-sub">1인 식품 브랜드의 라벨 검토 시스템</p>
          <div className="krk-hero-actions">
            <button className="krk-hero-primary" onClick={() => navigate('/signup')}>
              3분 만에 시작하기
              <Check size={17} strokeWidth={2.4} />
            </button>
            <a className="krk-hero-secondary" href="#categories">
              지원 카테고리 보기
            </a>
          </div>
        </div>

        <div className="krk-hero-modals" aria-label="KRK 라벨 정리 예시">
          {heroModals.map(({ title, body, note, Icon }) => (
            <article className="krk-gloss" key={title}>
              <div className="krk-gloss-head">
                <span className="krk-gloss-icon">
                  <Icon size={16} strokeWidth={2.1} />
                </span>
                <h2 className="krk-gloss-title">{title}</h2>
              </div>
              <p className="krk-gloss-body">{body}</p>
              <span className="krk-gloss-note">
                <Check size={13} />
                {note}
              </span>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
