// Hintergrund-Takt: stösst alle 10 Minuten den Immich-Abgleich und die
// Sammelmail an. Die Logik selbst liegt in der App (src/lib/sync.ts); dieses
// Skript ruft nur den internen Endpunkt auf. Gestartet aus dem Dockerfile.
const PORT = process.env.PORT || 3000
const KEY = process.env.NEXTAUTH_SECRET || ''
const INTERVAL = 10 * 60 * 1000

async function tick() {
  try {
    const res = await fetch(`http://127.0.0.1:${PORT}/api/cron/tick`, { method: 'POST', headers: { 'x-cron-key': KEY } })
    console.log(`[worker] tick ${res.status} ${await res.text()}`)
  } catch (err) {
    console.error('[worker] tick failed:', err.message)
  }
}

if (!KEY) {
  console.error('[worker] NEXTAUTH_SECRET fehlt, Hintergrund-Takt deaktiviert')
} else {
  setTimeout(tick, 30 * 1000) // dem Server Zeit zum Starten geben
  setInterval(tick, INTERVAL)
}
