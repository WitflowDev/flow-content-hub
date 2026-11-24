'use client'

import { useEffect, useState } from 'react'
import QRCode from 'qrcode'

export function ShareQr({ url }: { url: string }) {
  const [src, setSrc] = useState('')

  useEffect(() => {
    let active = true
    void QRCode.toDataURL(url, {
      margin: 1,
      width: 296,
      errorCorrectionLevel: 'M',
      color: { dark: '#121217', light: '#ffffff' },
    }).then(
      (value) => {
        if (active) setSrc(value)
      },
      () => {
        if (active) setSrc('')
      },
    )
    return () => {
      active = false
    }
  }, [url])

  if (!src) return null

  return (
    <div className="share-qr">
      <img src={src} alt="QR code for the view-only link" width={148} height={148} />
      <a className="btn ghost" href={src} download="share-qr.png">
        Download QR code
      </a>
    </div>
  )
}
