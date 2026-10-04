/**
 * LogoLockup — 라벨패스(LabelPass) 공식 로고
 * dark (기본): 블루 로고 / light: 화이트 로고 — 원본 public/site/*.svg
 */

interface LogoLockupProps {
  size?: number                  // 이미지 height (px), default 28
  variant?: 'dark' | 'light'
}

export default function LogoLockup({ size = 28, variant = 'dark' }: LogoLockupProps) {
  const src = variant === 'light'
    ? '/site/LabelPass_Logo_Primary_White_v1.0.svg'
    : '/site/LabelPass_Logo_Primary_Blue_v1.0.svg'

  return (
    <img
      src={src}
      alt="LabelPass 라벨패스"
      style={{ height: size, width: 'auto', display: 'block' }}
    />
  )
}
