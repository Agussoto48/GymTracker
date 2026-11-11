import type { ReactNode } from 'react'
import './ui.css'

type ScreenHeaderProps = {
  title: string
  subtitle?: string
  /** Acción sobre la vista actual (barra de herramientas), p. ej. «Nueva». */
  action?: ReactNode
}

export function ScreenHeader({ title, subtitle, action }: ScreenHeaderProps) {
  return (
    <header className="screen-header">
      <div className="screen-header__titles">
        {subtitle && <p className="screen-header__subtitle">{subtitle}</p>}
        <h1 className="screen-header__title">{title}</h1>
      </div>
      {action && <div className="screen-header__action">{action}</div>}
    </header>
  )
}
