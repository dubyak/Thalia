'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, BookOpen, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTranslation } from '@/lib/i18n/useTranslation'

export function BottomNav() {
  const pathname = usePathname()
  const { t } = useTranslation()

  const tabs = [
    { href: '/home', label: t('nav.home'), icon: Home },
    { href: '/learn', label: t('nav.learn'), icon: BookOpen },
    { href: '/profile', label: t('nav.profile'), icon: User },
  ]

  return (
    <nav
      className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full bg-white border-t border-[#e5e5e5] flex items-center pb-safe"
      style={{ maxWidth: 'var(--app-max-width)', zIndex: 40 }}
    >
      {tabs.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(href + '/')
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex-1 flex flex-col items-center justify-center py-2 gap-0.5 touch-active',
              active ? 'text-[#1a989e]' : 'text-[#939490]'
            )}
          >
            <Icon
              size={22}
              strokeWidth={active ? 2.5 : 2}
              className={active ? 'text-[#1a989e]' : 'text-[#939490]'}
            />
            <span
              className={cn(
                'text-[10px] font-medium',
                active ? 'text-[#1a989e] font-semibold' : 'text-[#939490]'
              )}
            >
              {label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
