/**
 * useT — shortcut hook for translations
 * Usage: const { t, isEn } = useT();
 */
import { useTranslation } from './i18n';
export function useT() {
  const { t, locale, toggleLocale } = useTranslation();
  return { t, locale, isEn: locale === 'en', isId: locale === 'id', toggleLocale };
}

/**
 * T — inline translation component
 * Usage: <T id="Cuti & Izin" en="Leave & Permission" />
 */
export function T({ id, en }) {
  const { isEn } = useT();
  return isEn ? (en || id) : id;
}

export default useT;
