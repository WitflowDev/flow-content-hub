export const LOGO_BLACK = '/assets/flow-logo-black.png'
export const LOGO_WHITE = '/assets/flow-logo-white.png'

export function Logo({ theme = 'dark', className = '' }: { theme?: 'dark' | 'light'; className?: string }) {
  const src = theme === 'light' ? LOGO_WHITE : LOGO_BLACK
  return <img className={className ? `flow-logo ${className}` : 'flow-logo'} src={src} alt="Flow Productions" />
}
