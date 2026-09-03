import en from './en.json';
import as_lang from './as.json';

const langs: Record<string, Record<string, string>> = { en, as: as_lang };

export function t(key: string, lang: string = 'en'): string {
  return langs[lang]?.[key] || langs['en']?.[key] || key;
}

export function getLang(): string {
  return localStorage.getItem('ews_lang') || 'en';
}

export function setLang(lang: string): void {
  localStorage.setItem('ews_lang', lang);
}
