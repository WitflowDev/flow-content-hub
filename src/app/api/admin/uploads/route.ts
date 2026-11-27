import { NextResponse } from 'next/server'
import { exportFormat, isCustomFormatId, parseExportIds, pixelSize, type ExportId } from '@/data/exports'
import { openAdminUpload, prepareAdminUpload } from '@/lib/admin/uploads'
import { requireAdmin } from '@/lib/auth/admin'
import { isDriveFileId } from '@/lib/drive/ids'

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
  batchToken: string
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
  const prepared = readPrepareRequest(body)
  if (prepared) {
    try {
      const session = await prepareAdminUpload(admin.uid, prepared)
      return NextResponse.json(session)
    } catch (error) {
      return NextResponse.json({ error: publicMessage(error, 'The upload could not be started.') }, { status: 400 })
    }
  }

  const parsed = readUploadRequest(body)
  if (!parsed) return NextResponse.json({ error: 'Check the file and the client account.' }, { status: 400 })

  try {
    const session = await openAdminUpload(admin.uid, { ...parsed, origin: requestOrigin(request) })
    return NextResponse.json(session)
  } catch (error) {
    return NextResponse.json({ error: publicMessage(error, 'The upload could not be started.') }, { status: 400 })
  }
}

function requestOrigin(request: Request): string {
  const urlOrigin = new URL(request.url).origin
  const forwardedHost = request.headers.get('x-forwarded-host')?.split(',')[0]?.trim()
  const forwardedProto = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim() || 'https'
  const expected = forwardedHost ? `${forwardedProto}://${forwardedHost}` : urlOrigin
  const origin = request.headers.get('origin') ?? ''
  if (origin === expected || origin === urlOrigin) return origin
  return expected
}

function readPrepareRequest(value: unknown): {
  accountId: string
  destinationId: string
  collectionName: string
  collectionDescription: string
} | null {
  if (!value || typeof value !== 'object') return null
  const body = value as Record<string, unknown>
  if (body.prepare !== true) return null
  if (typeof body.accountId !== 'string' || body.accountId.length > 128) return null
  if (typeof body.destinationId !== 'string' || body.destinationId.length > 128) return null
  if (typeof body.collectionName !== 'string' || body.collectionName.length > 180) return null
  if (typeof body.collectionDescription !== 'string' || body.collectionDescription.length > 500) return null
  return {
    accountId: body.accountId,
    destinationId: body.destinationId,
    collectionName: body.collectionName,
    collectionDescription: body.collectionDescription,
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
    batchToken: typeof body.batchToken === 'string' ? body.batchToken.slice(0, 12000) : '',
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
