import { useMemo } from 'react'
import { useLocale } from '@/contexts/LocaleContext'
import { createT, type TFunction } from './index'

/**
 * Returns { t, locale } based on the app-wide locale setting.
 */
export function useTranslation(): { t: TFunction; locale: string } {
  const { locale } = useLocale()
  const t = useMemo(() => createT(locale), [locale])
  return { t, locale }
}
