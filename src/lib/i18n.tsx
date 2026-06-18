"use client"

import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
  useState,
} from "react"
import ptBR, { type Translations } from "./translations/pt-BR"
import enUS from "./translations/en-US"
import esES from "./translations/es-ES"

export type Locale = "pt-BR" | "en-US" | "es-ES"
export const defaultLocale: Locale = "pt-BR"
export const availableLocales: Locale[] = ["pt-BR", "en-US", "es-ES"]
export const localeLabels: Record<Locale, string> = {
  "pt-BR": "Português",
  "en-US": "English",
  "es-ES": "Español",
}
export const rtlLocales: Locale[] = []

export function isRTL(locale: Locale): boolean {
  return rtlLocales.includes(locale)
}

const translationMap: Record<Locale, Translations> = {
  "pt-BR": ptBR,
  "en-US": enUS,
  "es-ES": esES,
}

function resolve(obj: Record<string, unknown>, path: string): string | undefined {
  const keys = path.split(".")
  let current: unknown = obj
  for (const key of keys) {
    if (current === null || current === undefined || typeof current !== "object") return undefined
    current = (current as Record<string, unknown>)[key]
  }
  return typeof current === "string" ? current : undefined
}

function interpolate(template: string, params?: Record<string, string>): string {
  if (!params) return template
  return template.replace(/\{(\w+)\}/g, (_, key) => params[key] ?? `{${key}}`)
}

const STORAGE_KEY = "quiz-ai-locale"

function detectLocale(): Locale {
  if (typeof window !== "undefined") {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved && availableLocales.includes(saved as Locale)) return saved as Locale
    } catch { /* noop */ }
    const browserLangs = navigator.languages ?? [navigator.language]
    for (const lang of browserLangs) {
      if (availableLocales.includes(lang as Locale)) return lang as Locale
      const prefix = lang.split("-")[0]
      const match = availableLocales.find((l) => l.startsWith(prefix))
      if (match) return match
    }
  }
  return defaultLocale
}

const emptySubscribe = () => () => {}
const getIsClient = () => true
const getIsServer = () => false

function useIsMounted(): boolean {
  return useSyncExternalStore(emptySubscribe, getIsClient, getIsServer)
}

type Paths<T, Prefix extends string = ""> = T extends string
  ? Prefix
  : T extends object
    ? { [K in keyof T & string]: Paths<T[K], Prefix extends "" ? K : `${Prefix}.${K}`> }[keyof T & string]
    : never

export type TranslationKey = Paths<Translations>

interface I18nContextValue {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: TranslationKey, params?: Record<string, string>) => string
}

const I18nContext = createContext<I18nContextValue | null>(null)

export function I18nProvider({ children }: { children: React.ReactNode }) {
  useIsMounted()

  const [locale, setLocaleState] = useState<Locale>(() => {
    if (typeof window !== "undefined") return detectLocale()
    return defaultLocale
  })

  const setLocale = useCallback((newLocale: Locale) => {
    if (!availableLocales.includes(newLocale)) return
    setLocaleState(newLocale)
    try { localStorage.setItem(STORAGE_KEY, newLocale) } catch { /* noop */ }
    if (typeof document !== "undefined") {
      document.documentElement.dir = isRTL(newLocale) ? "rtl" : "ltr"
      document.documentElement.lang = newLocale
    }
  }, [])

  const t = useCallback(
    (key: TranslationKey, params?: Record<string, string>): string => {
      const translations = translationMap[locale] ?? translationMap[defaultLocale]
      const template = resolve(translations as unknown as Record<string, unknown>, key)
      if (template === undefined) {
        const fallback = resolve(translationMap[defaultLocale] as unknown as Record<string, unknown>, key)
        if (fallback !== undefined) return interpolate(fallback, params)
        return key
      }
      return interpolate(template, params)
    },
    [locale],
  )

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useTranslation() {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error("useTranslation must be used within an <I18nProvider>")
  return ctx
}
