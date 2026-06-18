/**
 * PageHeader — Reusable translated page header
 * Usage: <PageHeader titleKey="attendance.title" subtitleKey="attendance.subtitle" />
 * Or with action buttons: <PageHeader titleKey="employees.title"> <button>Add</button> </PageHeader>
 */
import { useTranslation } from '../lib/i18n';

export default function PageHeader({ titleKey, subtitleKey, title, subtitle, children, style }) {
  const { t } = useTranslation();

  const resolvedTitle    = titleKey    ? t(titleKey)    : title    || '';
  const resolvedSubtitle = subtitleKey ? t(subtitleKey) : subtitle || '';

  return (
    <div className="page-header" style={style}>
      <div>
        <h1 style={{ margin: 0 }}>{resolvedTitle}</h1>
        {resolvedSubtitle && (
          <p style={{ margin: '4px 0 0', color: 'var(--muted)', fontSize: 13 }}>{resolvedSubtitle}</p>
        )}
      </div>
      {children && (
        <div className="page-header-actions">{children}</div>
      )}
    </div>
  );
}
