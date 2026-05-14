import Image from 'next/image'

interface LogoProps {
  size?: 'large' | 'small'
}

export function Logo({ size = 'large' }: LogoProps) {
  const px = size === 'large' ? 192 : 112

  return (
    <Image
      src="/logo.png"
      alt="Peduzzi Photo"
      width={px}
      height={px}
      priority
      style={{ height: px, width: 'auto', objectFit: 'contain' }}
    />
  )
}
