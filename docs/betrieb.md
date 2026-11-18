# Betrieb

Stand: 18.11.2026 (Umbau auf Wand, Konten und Benachrichtigungen).

## Aufbau

- Next.js 14 (App Router), SQLite über `better-sqlite3`, Bilder aus Immich über einen Proxy (`/api/proxy/...`).
- Die Auswahl der Alben läuft weiterhin über Immich und den Admin (`/admin`): sichtbar schalten, Reihenfolge, Verlosung.
- Schema und Migrationen: `scripts/migrate.js`, läuft bei jedem Containerstart.

## Umgebungsvariablen

| Variable | Zweck |
|---|---|
| `IMMICH_URL`, `IMMICH_API_KEY` | Zugriff auf Immich |
| `NEXTAUTH_SECRET` | Salz für IP-Hashes und Schlüssel für den internen Takt-Endpunkt |
| `NEXTAUTH_URL` | Öffentliche Adresse; steht in allen Links der Mails |
| `ADMIN_PASSWORD` | Admin-Login |
| `DATABASE_PATH` | Pfad der SQLite-Datei |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | Versand der Anmelde-Links und Sammelmails. Ohne `SMTP_HOST` werden Mails nur ins Log geschrieben. |

Die SMTP-Variablen müssen in `docker-compose.yml` an den Container durchgereicht werden (seit dem Umbau der Fall).

## Hintergrund-Takt

`scripts/worker.js` läuft im Container neben dem Server und ruft alle 10 Minuten `POST /api/cron/tick` auf. Der Takt (`src/lib/sync.ts`):

1. gleicht die Albumliste mit Immich ab,
2. hält pro sichtbarem Album fest, welche Bilder es enthält (`album_assets`),
3. verschickt die Sammelmail, wenn es Neues gibt, seit 60 Minuten nichts mehr dazukam und die letzte Sammelmail mindestens 20 Stunden her ist.

Neu ist ein Album, das sichtbar geschaltet wurde und noch nie angekündigt war (`albums.announced = 0`). Neue Bilder sind Einträge in `album_assets` mit `notified = 0`. Der erste Stand eines Albums gilt als Ausgangslage und löst keine Mail aus.

## Stimmen, Favoriten, Konten

- Stimmen: `ratings`, Wert 1–4 (Nicht meins, OK, Gutes Foto, Love it). Mit Konto eine Stimme pro Bild und Konto, ohne Konto eine pro Bild und Geräte-Cookie (`vid`).
- Beim Anmelden wandern die anonymen Stimmen des Geräts ins Konto.
- Favoriten: `favorites`, nur mit Konto. Ein Herz auf einem unbewerteten Bild setzt «Love it».
- Anmeldung ohne Passwort: `login_tokens` (Einmal-Link, 30 Minuten), Sitzung in `user_sessions` (Cookie `sid`, 180 Tage).
- Verlosung: teilnahmeberechtigt ist, wer angemeldet mindestens ein Bild des Albums bewertet hat.
- Die alten Top-3-Stimmen (`votes`, `lottery_participants`) bleiben in der Datenbank, werden aber nicht mehr angezeigt.

## Lokal entwickeln

- `better-sqlite3` 9 hat keine fertigen Binärpakete für aktuelle Node-Versionen unter Windows. Lokal deshalb ohne Build installieren und das Binärpaket einer neueren Version nachziehen, ohne `package.json` zu ändern:

  ```powershell
  npm install --ignore-scripts
  npm install better-sqlite3@13 @types/nodemailer --no-save
  ```

  Danach `git checkout package-lock.json`. Im Container (Node 20) wird Version 9 normal gebaut.
- `.env.development.local` (nicht eingecheckt) überschreibt für die Entwicklung `IMMICH_URL` (Tailscale-Adresse der NAS), `DATABASE_PATH=./data/dev.db`, `NEXTAUTH_URL=http://localhost:3000` und leert `SMTP_HOST`, damit Anmelde-Links im Log statt im Postfach landen.
