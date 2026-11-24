import { NextResponse } from 'next/server'
import { completeAdminUpload } from '@/lib/admin/uploads'
import { requireAdmin } from '@/lib/auth/admin'
import { isDriveFileId } from '@/lib/drive/ids'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Only an admin can upload.' }, { status: 403 })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'The file could not be saved to Drive.' }, { status: 400 })
  }
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'The file could not be saved to Drive.' }, { status: 400 })
  }
  const record = body as Record<string, unknown>
  const token = typeof record.ticket === 'string' ? record.ticket : ''
  const fileId = typeof record.fileId === 'string' ? record.fileId : ''
  if (!token || token.length > 8000 || !isDriveFileId(fileId)) {
    return NextResponse.json({ error: 'The file could not be saved to Drive.' }, { status: 400 })
  }

  try {
    const savedId = await completeAdminUpload(admin.uid, token, fileId)
    return NextResponse.json({ ok: true, fileId: savedId })
  } catch (error) {
    const message = error instanceof Error ? error.message : ''
    return NextResponse.json(
      { error: message && message.length <= 180 ? message : 'The file could not be saved to Drive.' },
      { status: 400 },
    )
  }
}
