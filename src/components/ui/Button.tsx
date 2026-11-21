import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Loader2 } from 'lucide-react'

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'success'
const styles: Record<Variant, string> = {
  primary: 'bg-accent-700 text-white hover:bg-accent-800 border-accent-700',
  secondary: 'bg-white text-slate-800 hover:bg-slate-50 border-slate-300',
  danger: 'bg-red-700 text-white hover:bg-red-800 border-red-700',
  success: 'bg-green-700 text-white hover:bg-green-800 border-green-700',
  ghost: 'bg-transparent text-slate-700 hover:bg-slate-100 border-transparent',
}
const base =
  'inline-flex items-center justify-center gap-2 rounded-md border px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-200 disabled:text-slate-500'

export function Button({
  variant = 'primary',
  loading,
  className = '',
  children,
  size,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; loading?: boolean; size?: 'sm' }) {
  return (
    <button type="button" className={`${base} ${styles[variant]} ${size === 'sm' ? 'px-2.5 py-1 text-xs' : ''} ${className}`} disabled={rest.disabled || loading} {...rest}>
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      {children}
    </button>
  )
}

export function LinkButton({ to, variant = 'primary', children, className = '' }: { to: string; variant?: Variant; children: ReactNode; className?: string }) {
  return (
    <Link to={to} className={`${base} ${styles[variant]} ${className}`}>
      {children}
    </Link>
  )
}
