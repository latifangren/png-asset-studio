import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import { en, type Dictionary } from './en';
import { id } from './id';

export type Locale = 'en' | 'id';

const LOCALE_STORAGE_KEY = 'png-asset-studio-locale';

const dictionaries: Record<Locale, Dictionary> = { en, id };

function detectLocale(): Locale {
  try {
    const saved = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (saved === 'en' || saved === 'id') return saved;
  } catch {
    // ignore storage errors, fall through to browser detection
  }
  if (typeof navigator !== 'undefined' && navigator.language.toLowerCase().startsWith('id')) {
    return 'id';
  }
  return 'en';
}

type NestedKeyOf<T> = {
  [K in keyof T & string]: T[K] extends object
    ? `${K}.${NestedKeyOf<T[K]>}`
    : K;
}[keyof T & string];

export type DictionaryKey = NestedKeyOf<Dictionary>;

function lookup(dict: Dictionary, key: DictionaryKey): string {
  let current: unknown = dict;
  for (const part of key.split('.')) {
    if (typeof current !== 'object' || current === null) return key;
    current = (current as Record<string, unknown>)[part];
  }
  return typeof current === 'string' ? current : key;
}

interface LocaleContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: DictionaryKey, vars?: Record<string, string | number>) => string;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(detectLocale);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, next);
    } catch {
      // ignore storage errors
    }
  }, []);

  const value = useMemo<LocaleContextValue>(
    () => ({
      locale,
      setLocale,
      t: (key, vars) => {
        const value = lookup(dictionaries[locale], key);
        if (!vars) return value;
        return value.replace(/\{(\w+)\}/g, (_m, name) =>
          vars[name] !== undefined ? String(vars[name]) : `{${name}}`,
        );
      },
    }),
    [locale, setLocale],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error('useLocale must be used inside <LocaleProvider>');
  return ctx;
}
