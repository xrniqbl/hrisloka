// EmptyState Component - Astryx Design
import { EmptyState as AstryxEmptyState } from '@astryxdesign/core/EmptyState';

export function EmptyState({ 
  title, 
  description, 
  icon, 
  action,
  className 
}) {
  return (
    <AstryxEmptyState
      title={title}
      description={description}
      icon={icon}
      action={action}
      className={className}
    />
  );
}
