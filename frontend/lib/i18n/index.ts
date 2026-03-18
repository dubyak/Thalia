import en from './en.json'
import esMX from './es-MX.json'

const messages: Record<string, Record<string, unknown>> = {
  'en': en,
  'es-MX': esMX,
}

type NestedRecord = Record<string, unknown>

/**
 * Get a translated string by dot-path key, e.g. "survey.greeting".
 * Supports simple {placeholder} interpolation.
 */
function resolve(locale: string, key: string, params?: Record<string, string | number>): string {
  const dict = messages[locale] ?? messages['en']
  const parts = key.split('.')
  let value: unknown = dict
  for (const part of parts) {
    if (value && typeof value === 'object') {
      value = (value as NestedRecord)[part]
    } else {
      value = undefined
      break
    }
  }

  if (typeof value !== 'string') {
    // Fallback to English
    let fallback: unknown = messages['en']
    for (const part of parts) {
      if (fallback && typeof fallback === 'object') {
        fallback = (fallback as NestedRecord)[part]
      } else {
        return `[${key}]`
      }
    }
    if (typeof fallback !== 'string') return `[${key}]`
    value = fallback
  }

  let result = value as string
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      result = result.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v))
    }
  }
  return result
}

export type TFunction = (key: string, params?: Record<string, string | number>) => string

export function createT(locale: string): TFunction {
  return (key: string, params?: Record<string, string | number>) => resolve(locale, key, params)
}
