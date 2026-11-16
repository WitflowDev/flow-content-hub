import type { ReactNode } from 'react'

export function BusyButton({
  pending = false,
  pendingLabel,
  children,
  className = 'btn primary',
  type = 'button',
  disabled = false,
  onClick,
}: {
  pending?: boolean
  pendingLabel: string
  children: ReactNode
  className?: string
  type?: 'button' | 'submit'
  disabled?: boolean
  onClick?: () => void
}) {
  return (
    <button type={type} className={className} disabled={disabled || pending} aria-busy={pending} onClick={onClick}>
      {pending ? <span className="btn-spinner" aria-hidden="true" /> : null}
      {pending ? pendingLabel : children}
    </button>
  )
}
