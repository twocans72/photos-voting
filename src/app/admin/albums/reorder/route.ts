export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getAdminFromRequest } from '@/lib/auth'
import { getDb } from '@/lib/db'

export async function POST(request: NextRequest) {
  if (!getAdminFromRequest()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { order } = await request.json()
  const db = getDb()
  const update = db.prepare('UPDATE albums SET sort_order = ? WHERE id = ?')
  for (const { id, sort_order } of order) {
    update.run(sort_order, id)
  }
  return NextResponse.json({ ok: true })
}
```

---

**2. `src/app/api/admin/albums/route.ts`** – eine Zeile ändern, `ORDER BY` von:
```
ORDER BY a.updated_at DESC
```
auf:
```
ORDER BY a.sort_order ASC, a.updated_at DESC