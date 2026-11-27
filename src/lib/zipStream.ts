const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let i = 0; i < 256; i += 1) {
    let crc = i
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc & 1) !== 0 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1
    }
    table[i] = crc >>> 0
  }
  return table
})()

const ZERO_BIGINT = BigInt(0)
const UINT32_MAX = BigInt(0xffffffff)
const ZIP64_EOCD_RECORD_SIZE = BigInt(44)
const UINT16_MAX = 0xffff
const ZIP_FLAGS = 0x0808 // Data descriptor (bit 3) + UTF-8 filename (bit 11)

export type ZipStreamEntry = {
  name: string
  open: () => Promise<ReadableStream<Uint8Array>>
  expectedSize?: number
  modifiedAt?: Date
}

type WrittenEntry = {
  nameBytes: Uint8Array
  dosTime: number
  dosDate: number
  crc32: number
  size: bigint
  localHeaderOffset: bigint
  usedZip64DataDescriptor: boolean
}

export function createZipStream(entries: readonly ZipStreamEntry[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()
  const uniqueEntries = deduplicateEntryNames(entries)

  let offset = ZERO_BIGINT
  const written: WrittenEntry[] = []
  let index = 0
  let prefetched: { index: number; promise: Promise<ReadableStream<Uint8Array>> } | null = null
  let activeReader: ReadableStreamDefaultReader<Uint8Array> | null = null

  function prefetchNext(nextIndex: number) {
    if (nextIndex >= uniqueEntries.length) return
    if (prefetched && prefetched.index === nextIndex) return
    const promise = uniqueEntries[nextIndex].open()
    promise.catch(() => {})
    prefetched = { index: nextIndex, promise }
  }

  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        if (index >= uniqueEntries.length) {
          emitCentralDirectory(controller, written, offset)
          controller.close()
          return
        }

        const currentIndex = index
        const entry = uniqueEntries[currentIndex]
        index += 1

        const openPromise =
          prefetched && prefetched.index === currentIndex ? prefetched.promise : entry.open()
        prefetched = null
        prefetchNext(index)

        const stream = await openPromise
        const nameBytes = encoder.encode(entry.name)
        const { dosTime, dosDate } = toDosDateTime(entry.modifiedAt ?? new Date())
        const useZip64Descriptor =
          typeof entry.expectedSize === 'number' &&
          Number.isFinite(entry.expectedSize) &&
          BigInt(Math.floor(entry.expectedSize)) >= UINT32_MAX

        const localHeaderOffset = offset
        const localHeader = buildLocalFileHeader(nameBytes, dosTime, dosDate, useZip64Descriptor)
        controller.enqueue(localHeader)
        offset += BigInt(localHeader.byteLength)

        let crc = 0xffffffff
        let size = ZERO_BIGINT
        const reader = stream.getReader()
        activeReader = reader
        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            if (!value || value.byteLength === 0) continue
            crc = updateCrc32(crc, value)
            size += BigInt(value.byteLength)
            controller.enqueue(value)
            offset += BigInt(value.byteLength)
          }
        } finally {
          activeReader = null
          reader.releaseLock()
        }

        const finalCrc = (crc ^ 0xffffffff) >>> 0
        const descriptor = buildDataDescriptor(finalCrc, size, useZip64Descriptor)
        controller.enqueue(descriptor)
        offset += BigInt(descriptor.byteLength)

        written.push({
          nameBytes,
          dosTime,
          dosDate,
          crc32: finalCrc,
          size,
          localHeaderOffset,
          usedZip64DataDescriptor: useZip64Descriptor,
        })
      } catch (error) {
        controller.error(error)
      }
    },
    async cancel() {
      if (activeReader) {
        await activeReader.cancel().catch(() => {})
        activeReader = null
      }
      if (prefetched) {
        const pending = prefetched.promise
        prefetched = null
        pending
          .then((stream) => stream.cancel().catch(() => {}))
          .catch(() => {})
      }
    },
  })
}

export function bytesToStream(bytes: Uint8Array): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      if (bytes.byteLength > 0) controller.enqueue(bytes)
      controller.close()
    },
  })
}

function deduplicateEntryNames(entries: readonly ZipStreamEntry[]): ZipStreamEntry[] {
  const used = new Set<string>()
  return entries.map((entry) => {
    const clean = sanitizeZipEntryName(entry.name)
    const lower = clean.toLowerCase()
    if (!used.has(lower)) {
      used.add(lower)
      return { ...entry, name: clean }
    }
    const dot = clean.lastIndexOf('.')
    const stem = dot > 0 ? clean.slice(0, dot) : clean
    const ext = dot > 0 ? clean.slice(dot) : ''
    let suffix = 2
    let candidate = `${stem} (${suffix})${ext}`
    while (used.has(candidate.toLowerCase())) {
      suffix += 1
      candidate = `${stem} (${suffix})${ext}`
    }
    used.add(candidate.toLowerCase())
    return { ...entry, name: candidate }
  })
}

function sanitizeZipEntryName(name: string): string {
  const cleaned = name
    .replace(/\\/g, '/')
    .split('/')
    .pop()
    ?.replace(/[\u0000-\u001F\u007F]/g, '')
    .trim()
  if (!cleaned || cleaned === '.' || cleaned === '..') return 'file'
  return cleaned
}

function updateCrc32(crc: number, chunk: Uint8Array): number {
  let current = crc
  for (let i = 0; i < chunk.byteLength; i += 1) {
    current = CRC_TABLE[(current ^ chunk[i]) & 0xff] ^ (current >>> 8)
  }
  return current
}

function toDosDateTime(date: Date): { dosTime: number; dosDate: number } {
  const year = Math.min(2107, Math.max(1980, date.getUTCFullYear()))
  const month = date.getUTCMonth() + 1
  const day = date.getUTCDate()
  const hours = date.getUTCHours()
  const minutes = date.getUTCMinutes()
  const seconds = Math.floor(date.getUTCSeconds() / 2)
  return {
    dosTime: (hours << 11) | (minutes << 5) | seconds,
    dosDate: ((year - 1980) << 9) | (month << 5) | day,
  }
}

function buildLocalFileHeader(
  nameBytes: Uint8Array,
  dosTime: number,
  dosDate: number,
  zip64: boolean,
): Uint8Array {
  const buffer = new Uint8Array(30 + nameBytes.byteLength)
  const view = new DataView(buffer.buffer)
  view.setUint32(0, 0x04034b50, true)
  view.setUint16(4, zip64 ? 45 : 20, true)
  view.setUint16(6, ZIP_FLAGS, true)
  view.setUint16(8, 0, true) // STORE
  view.setUint16(10, dosTime, true)
  view.setUint16(12, dosDate, true)
  view.setUint32(14, 0, true)
  view.setUint32(18, 0, true)
  view.setUint32(22, 0, true)
  view.setUint16(26, nameBytes.byteLength, true)
  view.setUint16(28, 0, true)
  buffer.set(nameBytes, 30)
  return buffer
}

function buildDataDescriptor(crc32: number, size: bigint, zip64: boolean): Uint8Array {
  const buffer = new Uint8Array(zip64 ? 24 : 16)
  const view = new DataView(buffer.buffer)
  view.setUint32(0, 0x08074b50, true)
  view.setUint32(4, crc32, true)
  if (zip64) {
    view.setBigUint64(8, size, true)
    view.setBigUint64(16, size, true)
  } else {
    view.setUint32(8, Number(size), true)
    view.setUint32(12, Number(size), true)
  }
  return buffer
}

function emitCentralDirectory(
  controller: ReadableStreamDefaultController<Uint8Array>,
  entries: readonly WrittenEntry[],
  centralDirOffset: bigint,
): void {
  let centralDirSize = ZERO_BIGINT

  for (const entry of entries) {
    const needsSize64 = entry.usedZip64DataDescriptor || entry.size >= UINT32_MAX
    const needsOffset64 = entry.localHeaderOffset >= UINT32_MAX
    const zip64FieldsSize = (needsSize64 ? 16 : 0) + (needsOffset64 ? 8 : 0)
    const extraLength = zip64FieldsSize > 0 ? 4 + zip64FieldsSize : 0

    const header = new Uint8Array(46 + entry.nameBytes.byteLength + extraLength)
    const view = new DataView(header.buffer)
    view.setUint32(0, 0x02014b50, true)
    view.setUint16(4, extraLength > 0 ? 0x032d : 0x0314, true)
    view.setUint16(6, extraLength > 0 ? 45 : 20, true)
    view.setUint16(8, ZIP_FLAGS, true)
    view.setUint16(10, 0, true)
    view.setUint16(12, entry.dosTime, true)
    view.setUint16(14, entry.dosDate, true)
    view.setUint32(16, entry.crc32, true)
    view.setUint32(20, needsSize64 ? 0xffffffff : Number(entry.size), true)
    view.setUint32(24, needsSize64 ? 0xffffffff : Number(entry.size), true)
    view.setUint16(28, entry.nameBytes.byteLength, true)
    view.setUint16(30, extraLength, true)
    view.setUint16(32, 0, true)
    view.setUint16(34, 0, true)
    view.setUint16(36, 0, true)
    view.setUint32(38, 0x81a40000, true)
    view.setUint32(42, needsOffset64 ? 0xffffffff : Number(entry.localHeaderOffset), true)
    header.set(entry.nameBytes, 46)

    if (extraLength > 0) {
      let pos = 46 + entry.nameBytes.byteLength
      view.setUint16(pos, 0x0001, true)
      view.setUint16(pos + 2, zip64FieldsSize, true)
      pos += 4
      if (needsSize64) {
        view.setBigUint64(pos, entry.size, true)
        view.setBigUint64(pos + 8, entry.size, true)
        pos += 16
      }
      if (needsOffset64) {
        view.setBigUint64(pos, entry.localHeaderOffset, true)
      }
    }

    controller.enqueue(header)
    centralDirSize += BigInt(header.byteLength)
  }

  const count = BigInt(entries.length)
  const needsZip64Eocd =
    entries.length >= UINT16_MAX || centralDirSize >= UINT32_MAX || centralDirOffset >= UINT32_MAX

  if (needsZip64Eocd) {
    const zip64EocdOffset = centralDirOffset + centralDirSize
    const zip64Eocd = new Uint8Array(56)
    const zView = new DataView(zip64Eocd.buffer)
    zView.setUint32(0, 0x06064b50, true)
    zView.setBigUint64(4, ZIP64_EOCD_RECORD_SIZE, true)
    zView.setUint16(12, 0x032d, true)
    zView.setUint16(14, 45, true)
    zView.setUint32(16, 0, true)
    zView.setUint32(20, 0, true)
    zView.setBigUint64(24, count, true)
    zView.setBigUint64(32, count, true)
    zView.setBigUint64(40, centralDirSize, true)
    zView.setBigUint64(48, centralDirOffset, true)
    controller.enqueue(zip64Eocd)

    const locator = new Uint8Array(20)
    const lView = new DataView(locator.buffer)
    lView.setUint32(0, 0x07064b50, true)
    lView.setUint32(4, 0, true)
    lView.setBigUint64(8, zip64EocdOffset, true)
    lView.setUint32(16, 1, true)
    controller.enqueue(locator)
  }

  const eocd = new Uint8Array(22)
  const eView = new DataView(eocd.buffer)
  eView.setUint32(0, 0x06054b50, true)
  eView.setUint16(4, 0, true)
  eView.setUint16(6, 0, true)
  eView.setUint16(8, entries.length >= UINT16_MAX ? UINT16_MAX : entries.length, true)
  eView.setUint16(10, entries.length >= UINT16_MAX ? UINT16_MAX : entries.length, true)
  eView.setUint32(12, centralDirSize >= UINT32_MAX ? 0xffffffff : Number(centralDirSize), true)
  eView.setUint32(16, centralDirOffset >= UINT32_MAX ? 0xffffffff : Number(centralDirOffset), true)
  eView.setUint16(20, 0, true)
  controller.enqueue(eocd)
}
