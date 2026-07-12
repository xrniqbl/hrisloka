import { Heading } from '@astryxdesign/core/Heading';
import { Text } from '@astryxdesign/core/Text';
import { HStack } from '@astryxdesign/core/HStack';
import { Stack } from '@astryxdesign/core/Stack';
import { useTranslation } from '../../lib/i18n';

function getGreeting(locale) {
  const hour = new Date().getHours();
  if (locale === 'en') {
    if (hour < 11) return 'Good morning';
    if (hour < 15) return 'Good afternoon';
    if (hour < 18) return 'Good evening';
    return 'Good night';
  }
  if (hour < 11) return 'Selamat pagi';
  if (hour < 15) return 'Selamat siang';
  if (hour < 18) return 'Selamat sore';
  return 'Selamat malam';
}

/**
 * Dashboard page header — Astryx Heading/Text (no emoji).
 * Clean typography aligned with design system.
 */
export default function DashHeader({ userName, date, children }) {
  const { locale } = useTranslation();
  const greeting = getGreeting(locale);
  const displayName = userName || (locale === 'en' ? 'there' : 'Admin');

  // Prefer locale-aware date if parent passed raw-ish string; reformat if we get Date or ISO
  let dateLabel = date;
  if (!dateLabel) {
    dateLabel = new Date().toLocaleDateString(locale === 'en' ? 'en-US' : 'id-ID', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  return (
    <header className="dash-header" aria-label={locale === 'en' ? 'Dashboard greeting' : 'Sapaan dashboard'}>
      <HStack hAlign="between" vAlign="start" gap={3} className="dash-header-row">
        <Stack gap={0.5} className="dash-header-left">
          <Heading level={1} className="dash-header-title">
            {greeting}, {displayName}
          </Heading>
          <Text type="supporting" color="secondary" display="block" className="dash-date">
            {dateLabel}
          </Text>
        </Stack>
        {children ? (
          <HStack gap={2} vAlign="center" className="dash-header-right">
            {children}
          </HStack>
        ) : null}
      </HStack>
    </header>
  );
}
