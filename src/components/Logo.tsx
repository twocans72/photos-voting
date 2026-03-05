const GOLD = 'linear-gradient(90deg,#6A4A18,#B8841C,#F0D060,#B8841C,#6A4A18)'

interface LogoProps {
  size?: 'large' | 'small'
}

export function Logo({ size = 'large' }: LogoProps) {
  const lg = size === 'large'
  const pPx   = lg ? 40 : 28
  const txPx  = lg ? 27 : 19
  const indent = lg ? 22 : 15
  const svgW  = lg ? 58 : 42
  const svgH  = lg ? 90 : 64
  const id    = `lens-${size}`

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
      {/* PP monogram + lens SVG */}
      <div style={{ position: 'relative', display: 'inline-flex', flexDirection: 'column', overflow: 'visible' }}>

        {/* Objektivring + Lichtstrahl */}
        <svg
          style={{ position: 'absolute', left: -5, top: -4, pointerEvents: 'none', overflow: 'visible', zIndex: 0 }}
          width={svgW} height={svgH}
          viewBox={`0 0 ${svgW} ${svgH}`}
          fill="none"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%"   stopColor="#F0D060" stopOpacity="0.55" />
              <stop offset="50%"  stopColor="#C8941C" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#6A4A18" stopOpacity="0.15" />
            </linearGradient>
          </defs>

          {/* Äusserer Objektivring */}
          <ellipse
            cx={svgW / 2} cy={svgH / 2}
            rx={svgW / 2 - 1} ry={svgH / 2 - 1}
            stroke={`url(#${id})`} strokeWidth={lg ? 0.9 : 0.7}
          />

          {/* Innerer Ring – Tiefe */}
          <ellipse
            cx={svgW / 2} cy={svgH / 2}
            rx={svgW / 2 - 5} ry={svgH / 2 - 5}
            stroke="#C8941C" strokeWidth={0.4} opacity={0.18}
          />

          {/* Diagonaler Lichtstrahl */}
          <line
            x1={svgW * 0.16} y1={svgH * 0.16}
            x2={svgW * 0.84} y2={svgH * 0.84}
            stroke="#F0D060" strokeWidth={lg ? 0.7 : 0.5} opacity={0.32}
          />

          {/* Fadenkreuz – Sucherrahmen */}
          <line x1={svgW / 2} y1={5}        x2={svgW / 2} y2={svgH - 5} stroke="#C8941C" strokeWidth={0.3} opacity={0.18} />
          <line x1={5}        y1={svgH / 2} x2={svgW - 5} y2={svgH / 2} stroke="#C8941C" strokeWidth={0.3} opacity={0.18} />
        </svg>

        {/* Peduzzi */}
        <div style={{ display: 'flex', alignItems: 'baseline', position: 'relative', zIndex: 1 }}>
          <span style={{ ...g, fontSize: pPx }}>P</span>
          <span style={{ ...g, fontSize: txPx, marginLeft: 1, letterSpacing: '0.025em' }}>eduzzi</span>
        </div>

        {/* Photo – versetzt */}
        <div style={{ display: 'flex', alignItems: 'baseline', paddingLeft: indent, marginTop: -4, position: 'relative', zIndex: 1 }}>
          <span style={{ ...g, fontSize: pPx }}>P</span>
          <span style={{ ...g, fontSize: txPx, marginLeft: 1, letterSpacing: '0.025em' }}>hoto</span>
        </div>
      </div>

      {/* Trennlinie */}
      <div style={{ height: '0.5px', background: '#C8941C', opacity: 0.35, margin: `${lg ? 4 : 2}px 0` }} />

      {/* «photography» nur auf der grossen Version */}
      {lg && (
        <span style={{
          fontFamily: "'Raleway', sans-serif", fontSize: 9, fontWeight: 300,
          letterSpacing: '6px', color: '#C8941C', opacity: 0.6,
        }}>photography</span>
      )}
    </div>
  )
}
