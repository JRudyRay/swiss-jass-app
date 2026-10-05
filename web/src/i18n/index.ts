import en, { type Messages } from './en';
import ch from './ch';
import de from './de';
import fr from './fr';
import it from './it';
import rm from './rm';

export type { Messages };
export type Lang = 'en' | 'ch' | 'de' | 'fr' | 'it' | 'rm';

// Order and labels for the language picker, each in its own language.
export const LANGS: { code: Lang; label: string; short: string }[] = [
  { code: 'ch', label: 'Schwiizerdütsch', short: 'CH' },
  { code: 'de', label: 'Deutsch', short: 'DE' },
  { code: 'fr', label: 'Français', short: 'FR' },
  { code: 'it', label: 'Italiano', short: 'IT' },
  { code: 'rm', label: 'Rumantsch', short: 'RM' },
  { code: 'en', label: 'English', short: 'EN' },
];

const ALL: Record<Lang, Messages> = { en, ch, de, fr, it, rm };

export function messages(lang: Lang): Messages {
  return ALL[lang] || en;
}

export function isLang(v: unknown): v is Lang {
  return typeof v === 'string' && v in ALL;
}

// First visit: pick from the browser. Swiss German has no reliable browser
// code (gsw is rare), so de-CH and gsw map to Swiss German, other German to de.
export function detectLang(): Lang {
  const prefs = typeof navigator !== 'undefined' ? (navigator.languages?.length ? navigator.languages : [navigator.language]) : [];
  for (const raw of prefs) {
    const tag = (raw || '').toLowerCase();
    if (tag.startsWith('gsw') || tag === 'de-ch') return 'ch';
    const base = tag.split('-')[0];
    if (base === 'de' || base === 'fr' || base === 'it' || base === 'rm' || base === 'en') return base;
  }
  return 'en';
}
