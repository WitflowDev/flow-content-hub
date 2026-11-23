import { NextResponse } from 'next/server'
import { exportFormat, isCustomFormatId, parseExportIds, pixelSize, type ExportId } from '@/data/exports'
import { openAdminUpload } from '@/lib/admin/uploads'
import { openUploadTicket } from '@/lib/admin/upload-ticket'
import { requireAdmin } from '@/lib/auth/admin'
import { invalidateLibrary } from '@/lib/drive/cache'
import { isDriveFileId } from '@/lib/drive/client'
import { attachAssetVariant, attachCustomVariant, saveAssetCopy } from '@/lib/drive/tags'
import { readUserProfile } from '@/lib/firebase/profile'
import { syncAccountNotices } from '@/lib/notifications/sync'

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
  formats: ReturnType<typeof parseExportIds>
  variantParentId: string
  variantFormat: ExportId | null
  variantCustomId: string
  variantCustomLabel: string
  variantCustomWidth: number
  variantCustomHeight: number
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
  const variantUpload = Boolean(ticket.variantParentId)
  const customUpload = Boolean(ticket.variantCustomId && ticket.variantCustomLabel)
  if (variantUpload && ((!ticket.variantFormat && !customUpload) || !fileId)) {
    return NextResponse.json({ error: 'The extra format could not be saved.' }, { status: 400 })
  }
  try {
    if (variantUpload && ticket.variantFormat && fileId) {
      await attachAssetVariant(ticket.variantParentId, ticket.accountId, ticket.variantFormat, {
        fileId,
        name: ticket.fileName,
        bytes: ticket.size,
        mimeType: ticket.mimeType,
      })
    } else if (variantUpload && customUpload && fileId) {
      await attachCustomVariant(
        ticket.variantParentId,
        ticket.accountId,
        ticket.variantCustomId,
        ticket.variantCustomLabel,
        {
          fileId,
          name: ticket.fileName,
          bytes: ticket.size,
          mimeType: ticket.mimeType,
        },
        { width: ticket.variantCustomWidth, height: ticket.variantCustomHeight },
      )
    } else if (fileId) {
      await saveAssetCopy(fileId, ticket.accountId, ticket.tags, ticket.suggestedUse, ticket.formats)
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : 'The photo notes could not be saved.')
    if (variantUpload) {
      return NextResponse.json({ error: 'The extra format could not be linked to the photo.' }, { status: 502 })
    }
  }
  try {
    const profile = await readUserProfile(ticket.accountId)
    if (profile?.driveFolderId) invalidateLibrary(profile.driveFolderId)
    await syncAccountNotices(ticket.accountId, {
      fileIds: !variantUpload && fileId ? [fileId] : [],
      folderName: profile?.companyName || null,
      hasFolder: Boolean(profile?.driveFolderId),
    })
  } catch (error) {
    console.error(error instanceof Error ? error.message : 'The library notice could not be saved.')
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
  const variant = readVariantLink(body)
  if (!variant) return null
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
    formats: parseExportIds(body.formats),
    variantParentId: variant.parentId,
    variantFormat: variant.format,
    variantCustomId: variant.customId,
    variantCustomLabel: variant.customLabel,
    variantCustomWidth: variant.customWidth,
    variantCustomHeight: variant.customHeight,
  }
}

function readVariantLink(
  body: Record<string, unknown>,
): { parentId: string; format: ExportId | null; customId: string; customLabel: string; customWidth: number; customHeight: number } | null {
  const parentId = typeof body.variantParentId === 'string' ? body.variantParentId : ''
  const format = typeof body.variantFormat === 'string' ? (exportFormat(body.variantFormat)?.id ?? null) : null
  const customId = typeof body.variantCustomId === 'string' && isCustomFormatId(body.variantCustomId) ? body.variantCustomId : ''
  const customLabel = typeof body.variantCustomLabel === 'string' ? body.variantCustomLabel.trim().slice(0, 40) : ''
  const customWidth = pixelSize(body.variantCustomWidth) ?? 0
  const customHeight = pixelSize(body.variantCustomHeight) ?? 0
  const linked = Boolean(format || (customId && customLabel))
  if (!parentId && !linked) return { parentId: '', format: null, customId: '', customLabel: '', customWidth: 0, customHeight: 0 }
  if (!parentId || !isDriveFileId(parentId) || !linked || (format && customId)) return null
  if (customId && (!customWidth || !customHeight)) return null
  return {
    parentId,
    format,
    customId: format ? '' : customId,
    customLabel: format ? '' : customLabel,
    customWidth: format ? 0 : customWidth,
    customHeight: format ? 0 : customHeight,
  }
}

function publicMessage(error: unknown, fallback: string): string {
  const message = error instanceof Error ? error.message : ''
  if (!message || message.length > 180) return fallback
  return message
}
