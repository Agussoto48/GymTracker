import type { ButtonHTMLAttributes } from 'react'
import './ui.css'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  /** primary: main action (one per screen). plain: secondary or toolbar action. */
  variant?: 'primary' | 'plain'
}

export function Button({ variant = 'plain', className, type = 'button', ...props }: ButtonProps) {
  const classes = ['button', `button--${variant}`, className].filter(Boolean).join(' ')
  return <button type={type} className={classes} {...props} />
}
