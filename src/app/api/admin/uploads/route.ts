import { NextResponse } from 'next/server'
import { openAdminUpload } from '@/lib/admin/uploads'
import { openUploadTicket } from '@/lib/admin/upload-ticket'
import { requireAdmin } from '@/lib/auth/admin'
import { saveAssetCopy } from '@/lib/drive/tags'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type UploadRequest = {
  accountId: string
  destinationId: string
  collectionName: string
  collectionDescription: string
  fileName: string
  mimeType: string
  size: number
  tags: string
  suggestedUse: string
}

export async function POST(request: Request) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Only an admin can upload.' }, { status: 403 })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'The upload could not be started.' }, { status: 400 })
  }
  const parsed = readUploadRequest(body)
  if (!parsed) return NextResponse.json({ error: 'Check the file and the client account.' }, { status: 400 })

  try {
    const session = await openAdminUpload(admin.uid, parsed)
    return NextResponse.json(session)
  } catch (error) {
    return NextResponse.json({ error: publicMessage(error, 'The upload could not be started.') }, { status: 400 })
  }
}

export async function PUT(request: Request) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: 'Only an admin can upload.' }, { status: 403 })
  const token = request.headers.get('x-upload-ticket') ?? ''
  let ticket: ReturnType<typeof openUploadTicket>
  try {
    ticket = openUploadTicket(token, admin.uid)
  } catch {
    return NextResponse.json({ error: 'The upload could not be saved.' }, { status: 400 })
  }
  if (!ticket || !request.body) return NextResponse.json({ error: 'The upload could not be saved.' }, { status: 400 })

  const declared = request.headers.get('content-length')
  if (declared && Number(declared) !== ticket.size) {
    return NextResponse.json({ error: 'The file size did not match.' }, { status: 400 })
  }

  const saved = await fetch(ticket.uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': ticket.mimeType,
      'Content-Length': String(ticket.size),
    },
    body: request.body,
    duplex: 'half',
  } as RequestInit & { duplex: 'half' })
  if (!saved.ok) {
    return NextResponse.json({ error: 'The file could not be saved to Drive.' }, { status: 502 })
  }
  const fileId = await savedFileId(saved)
  if (fileId && (ticket.tags.length > 0 || ticket.suggestedUse)) {
    try {
      await saveAssetCopy(fileId, ticket.accountId, ticket.tags, ticket.suggestedUse)
    } catch (error) {
      console.error(error instanceof Error ? error.message : 'The photo notes could not be saved.')
    }
  }
  return NextResponse.json({ ok: true, fileId })
}

async function savedFileId(response: Response): Promise<string> {
  try {
    const body: unknown = await response.json()
    if (!body || typeof body !== 'object' || !('id' in body)) return ''
    const id = (body as { id?: unknown }).id
    return typeof id === 'string' ? id : ''
  } catch {
    return ''
  }
}

function readUploadRequest(value: unknown): UploadRequest | null {
  if (!value || typeof value !== 'object') return null
  const body = value as Record<string, unknown>
  if (typeof body.accountId !== 'string' || body.accountId.length > 128) return null
  if (typeof body.destinationId !== 'string' || body.destinationId.length > 128) return null
  if (typeof body.collectionName !== 'string' || body.collectionName.length > 180) return null
  if (typeof body.collectionDescription !== 'string' || body.collectionDescription.length > 500) return null
  if (typeof body.fileName !== 'string' || body.fileName.length > 240) return null
  if (typeof body.mimeType !== 'string' || body.mimeType.length > 120) return null
  if (typeof body.size !== 'number' || !Number.isFinite(body.size)) return null
  if (typeof body.tags !== 'string' || body.tags.length > 300) return null
  if (typeof body.suggestedUse !== 'string' || body.suggestedUse.length > 500) return null
  return {
    accountId: body.accountId,
    destinationId: body.destinationId,
    collectionName: body.collectionName,
    collectionDescription: body.collectionDescription,
    fileName: body.fileName,
    mimeType: body.mimeType,
    size: body.size,
    tags: body.tags,
    suggestedUse: body.suggestedUse,
  }
}

function publicMessage(error: unknown, fallback: string): string {
  const message = error instanceof Error ? error.message : ''
  if (!message || message.length > 180) return fallback
  return message
}
