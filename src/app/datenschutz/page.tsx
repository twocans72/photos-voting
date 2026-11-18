'use client'

import { useLang } from '@/lib/LanguageContext'
import { SiteFooter, SiteHeader } from '@/components/ui'

// ENTWURF vom 18.11.2026 – von Renzo gegenzulesen, bevor er als verbindlich gilt.
export default function PrivacyPage() {
  const { lang } = useLang()
  return (
    <>
      <SiteHeader />
      <main className="page">
        {lang === 'de' ? (
          <>
            <h1 className="display">Datenschutz</h1>
            <p>Diese Seite ist ein privates Projekt von Renzo Peduzzi. Sie zeigt Fotoalben und lässt dich Bilder bewerten. Es gibt keine Werbung, kein Tracking und keine Analyse-Dienste.</p>

            <h2>Ohne Konto</h2>
            <p>
              Du kannst alles ansehen und bewerten, ohne dich anzumelden. Wenn du ein Bild bewertest, setzt die Seite ein Cookie mit einer zufälligen Kennung auf deinem Gerät. Damit erkennt sie
              deine Stimmen wieder und zählt jede nur einmal. Zum Schutz vor Missbrauch wird zu jeder Stimme ein gekürzter, nicht umkehrbarer Hash deiner IP-Adresse gespeichert.
            </p>

            <h2>Mit Konto</h2>
            <p>Für ein Konto brauchst du nur eine E-Mail-Adresse. Ein Passwort gibt es nicht: Du bekommst jedes Mal einen Link zum Anmelden. Gespeichert werden:</p>
            <ul>
              <li>deine E-Mail-Adresse,</li>
              <li>deine Stimmen und deine Favoriten,</li>
              <li>die gewählte Sprache und ob du Benachrichtigungen möchtest,</li>
              <li>ein Cookie, das dich angemeldet hält.</li>
            </ul>
            <p>Deine Stimmen fliessen anonym in die «Wand aller» ein. Deine Favoriten und deine E-Mail-Adresse sieht ausser dem Betreiber niemand.</p>

            <h2>E-Mails</h2>
            <p>
              Du bekommst Anmelde-Links und, wenn eingeschaltet, höchstens eine Sammelmail pro Tag über neue Bilder und Alben. Jede Benachrichtigung enthält einen Link zum Abbestellen. Die
              Mails werden über einen E-Mail-Anbieter verschickt, der dafür deine Adresse verarbeitet.
            </p>

            <h2>Verlosungen</h2>
            <p>Läuft in einem Album eine Verlosung, nimmt teil, wer angemeldet mindestens ein Bild dieses Albums bewertet. Die Gewinnerin oder der Gewinner wird per E-Mail kontaktiert.</p>

            <h2>Löschen</h2>
            <p>Im Konto kannst du dein Konto jederzeit löschen. Damit verschwinden deine E-Mail-Adresse, deine Stimmen und deine Favoriten. Stimmen ohne Konto hängen nur am Cookie deines Geräts.</p>

            <h2>Speicherort</h2>
            <p>Die Daten liegen auf einem privaten Server des Betreibers und werden nicht an Dritte weitergegeben.</p>
          </>
        ) : (
          <>
            <h1 className="display">Privacy</h1>
            <p>This site is a private project by Renzo Peduzzi. It shows photo albums and lets you rate pictures. There is no advertising, no tracking and no analytics.</p>

            <h2>Without an account</h2>
            <p>
              You can view and rate everything without signing in. When you rate a photo, the site sets a cookie with a random identifier on your device. This lets it recognise your votes and
              count each one only once. To prevent abuse, a truncated, irreversible hash of your IP address is stored with each vote.
            </p>

            <h2>With an account</h2>
            <p>An account only needs an email address. There is no password: you receive a sign-in link each time. The site stores:</p>
            <ul>
              <li>your email address,</li>
              <li>your votes and your favourites,</li>
              <li>your chosen language and whether you want notifications,</li>
              <li>a cookie that keeps you signed in.</li>
            </ul>
            <p>Your votes feed anonymously into &quot;Everyone&apos;s wall&quot;. Nobody but the operator can see your favourites or your email address.</p>

            <h2>Emails</h2>
            <p>
              You receive sign-in links and, if switched on, at most one digest per day about new photos and albums. Every notification contains an unsubscribe link. Emails are sent through an
              email provider that processes your address for this purpose.
            </p>

            <h2>Prize draws</h2>
            <p>If an album runs a prize draw, anyone who is signed in and rates at least one photo of that album takes part. The winner is contacted by email.</p>

            <h2>Deletion</h2>
            <p>You can delete your account at any time on the account page. This removes your email address, your votes and your favourites. Votes without an account are tied only to your device&apos;s cookie.</p>

            <h2>Where the data lives</h2>
            <p>The data is stored on a private server run by the operator and is not shared with third parties.</p>
          </>
        )}
      </main>
      <SiteFooter />
    </>
  )
}
