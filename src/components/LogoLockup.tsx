/**
 * LogoLockup — KRK CHECKER 공식 로고 컴포넌트
 * dark (기본): 검정 로고 (krk-checker-logo.png)
 * light: 화이트 로고 (krk-checker-logo-white.png)
 */

interface LogoLockupProps {
  size?: number                  // 이미지 height (px), default 16
  variant?: 'dark' | 'light'
}

export default function LogoLockup({ size = 16, variant = 'dark' }: LogoLockupProps) {
  const src = variant === 'light'
    ? '/krk-checker-logo-white.png'
    : '/krk-checker-logo.png'

  return (
    <img
      src={src}
      alt="KRK Checker"
      style={{ height: size, display: 'block' }}
    />
  )
}
