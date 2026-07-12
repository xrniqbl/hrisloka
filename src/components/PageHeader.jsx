/**
 * PageHeader — Astryx Heading + Text for clean HR page titles.
 * Usage: <PageHeader titleKey="attendance.title" subtitleKey="attendance.subtitle" />
 * Or: <PageHeader title="..."> <button>Add</button> </PageHeader>
 */
import { Heading } from '@astryxdesign/core/Heading';
import { Text } from '@astryxdesign/core/Text';
import { HStack } from '@astryxdesign/core/HStack';
import { Stack } from '@astryxdesign/core/Stack';
import { useTranslation } from '../lib/i18n';

export default function PageHeader({
  titleKey,
  subtitleKey,
  title,
  subtitle,
  children,
  style,
  className = '',
}) {
  const { t } = useTranslation();

  const resolvedTitle = titleKey ? t(titleKey) : title || '';
  const resolvedSubtitle = subtitleKey ? t(subtitleKey) : subtitle || '';

  return (
    <header className={`page-header ${className}`.trim()} style={style}>
      <HStack hAlign="between" vAlign="start" gap={3} className="page-header-row">
        <Stack gap={0.5} className="page-header-copy">
          {resolvedTitle ? (
            <Heading level={1} className="page-header-title">
              {resolvedTitle}
            </Heading>
          ) : null}
          {resolvedSubtitle ? (
            <Text
              type="supporting"
              color="secondary"
              display="block"
              className="page-header-subtitle"
            >
              {resolvedSubtitle}
            </Text>
          ) : null}
        </Stack>
        {children ? (
          <div className="page-header-actions">{children}</div>
        ) : null}
      </HStack>
    </header>
  );
}
