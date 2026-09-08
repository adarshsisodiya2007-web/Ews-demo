import en from './en.json';
import hi from './hi.json';
import as_lang from './as.json';
import bn from './bn.json';
import mni from './mni.json';
import miz from './miz.json';
import kha from './kha.json';
import gar from './gar.json';

export interface LanguageOption {
  code: string;
  label: string;
  region: string;
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: 'en', label: 'English (Default)', region: 'National' },
  { code: 'hi', label: 'हिंदी (Hindi)', region: 'National' },
  { code: 'as', label: 'অসমীয়া (Assamese)', region: 'Assam' },
  { code: 'bn', label: 'বাংলা (Bengali)', region: 'Tripura / Assam' },
  { code: 'mni', label: 'মৈতৈলোন্ (Meitei)', region: 'Manipur' },
  { code: 'miz', label: 'Mizo ṭawng (Mizo)', region: 'Mizoram' },
  { code: 'kha', label: 'Ka Ktien Khasi (Khasi)', region: 'Meghalaya' },
  { code: 'gar', label: 'A·chik (Garo)', region: 'Meghalaya' }
];

const langs: Record<string, Record<string, string>> = {
  en,
  hi,
  as: as_lang,
  bn,
  mni,
  miz,
  kha,
  gar
};

export function t(key: string, lang: string = 'en'): string {
  return langs[lang]?.[key] || langs['en']?.[key] || key;
}

export function getLang(): string {
  return localStorage.getItem('ews_lang') || 'en';
}

export function setLang(lang: string): void {
  localStorage.setItem('ews_lang', lang);
}

export function getLanguageLabel(code: string): string {
  const found = SUPPORTED_LANGUAGES.find(l => l.code === code);
  return found ? found.label : 'English (Default)';
}
