'use client'

import type { MouseEvent } from 'react'
import { Icon } from '@/components/icons'
import { useSelected, useSelectionActions } from '@/state/AppState'

export function SelectBox({ id, title, variant = 'card' }: { id: string; title?: string; variant?: 'card' | 'list' }) {
  const selected = useSelected()
  const { toggleSelected } = useSelectionActions()
  const isSelected = selected.has(id)
  const className =
    variant === 'list'
      ? isSelected
        ? 'select-box list-select on'
        : 'select-box list-select'
      : isSelected
        ? 'select-box on'
        : 'select-box'

  function onSelect(event: MouseEvent<HTMLButtonElement>) {
    event.stopPropagation()
    toggleSelected(id)
  }

  return (
    <button
      type="button"
      className={className}
      data-select={id}
      aria-label={title ? `Select ${title}` : 'Select'}
      aria-pressed={isSelected}
      onClick={onSelect}
    >
      {isSelected ? <Icon name="check" /> : null}
    </button>
  )
}
