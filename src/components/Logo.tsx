const GOLD = 'linear-gradient(90deg,#6A4A18,#B8841C,#F0D060,#B8841C,#6A4A18)'

interface LogoProps {
  size?: 'large' | 'small'
}

export function Logo({ size = 'large' }: LogoProps) {
  const lg   = size === 'large'
  const fsPx = lg ? 36 : 28
  const gap  = lg ? -9 : -7

  const g: React.CSSProperties = {
    fontFamily: "'Raleway', sans-serif",
    fontWeight: 200,
    background: GOLD,
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    display: 'inline-block',
  }

  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', lineHeight: 1 }}>
      {/* gespiegeltes Peduzzi + Photo nebeneinander */}
      <div style={{ display: 'flex', alignItems: 'baseline', whiteSpace: 'nowrap' }}>
        <span style={{ ...g, fontSize: fsPx, transform: 'scaleX(-1)' }}>Peduzzi</span>
        <span style={{ ...g, fontSize: fsPx, marginLeft: gap }}>Photo</span>
      </div>

      {/* Trennlinie */}
      <div style={{ height: '0.5px', background: '#C8941C', opacity: 0.35, width: '100%', margin: '2px 0' }} />

      {/* «photography» nur gross */}
      {lg && (
        <span style={{
          fontFamily: "'Raleway', sans-serif", fontSize: 9, fontWeight: 300,
          letterSpacing: '6px', color: '#C8941C', opacity: 0.6,
        }}>photography</span>
      )}
    </div>
  )
}
