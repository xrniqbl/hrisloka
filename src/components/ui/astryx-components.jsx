// EmptyState Astryx - Beautiful empty state component
import { EmptyState as AstryxEmptyState } from '@astryxdesign/core/EmptyState';

export function EmptyStateAstryx({ 
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

// NumberInput Astryx - Number input with controls
import { NumberInput as AstryxNumberInput } from '@astryxdesign/core/NumberInput';

export function NumberInputAstryx({ 
  label, 
  value, 
  onChange, 
  placeholder, 
  min, 
  max, 
  step,
  size = 'md',
  isRequired,
  isDisabled,
  className 
}) {
  return (
    <AstryxNumberInput
      label={label}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      min={min}
      max={max}
      step={step}
      size={size}
      isRequired={isRequired}
      isDisabled={isDisabled}
      className={className}
    />
  );
}

// FileInput Astryx - File upload component
import { FileInput as AstryxFileInput } from '@astryxdesign/core/FileInput';

export function FileInputAstryx({ 
  label, 
  onChange, 
  accept, 
  multiple,
  isDisabled,
  className 
}) {
  return (
    <AstryxFileInput
      label={label}
      onChange={onChange}
      accept={accept}
      multiple={multiple}
      isDisabled={isDisabled}
      className={className}
    />
  );
}

// ProgressBar Astryx - Progress indicator
import { ProgressBar as AstryxProgressBar } from '@astryxdesign/core/ProgressBar';

export function ProgressBarAstryx({ 
  value, 
  max = 100, 
  variant = 'accent',
  className 
}) {
  return (
    <AstryxProgressBar
      value={value}
      max={max}
      variant={variant}
      className={className}
    />
  );
}

// StatusDot Astryx - Status indicator
import { StatusDot as AstryxStatusDot } from '@astryxdesign/core/StatusDot';

export function StatusDotAstryx({ 
  variant = 'neutral', 
  size = 'md',
  className 
}) {
  return (
    <AstryxStatusDot
      variant={variant}
      size={size}
      className={className}
    />
  );
}

// Toast Astryx - Toast notifications
import { Toast as AstryxToast } from '@astryxdesign/core/Toast';

export function ToastAstryx({ 
  variant = 'info', 
  title, 
  description, 
  onClose,
  className 
}) {
  return (
    <AstryxToast
      variant={variant}
      title={title}
      description={description}
      onClose={onClose}
      className={className}
    />
  );
}

// Banner Astryx - Banner notifications
import { Banner as AstryxBanner } from '@astryxdesign/core/Banner';

export function BannerAstryx({ 
  variant = 'info', 
  title, 
  description, 
  onClose,
  action,
  className 
}) {
  return (
    <AstryxBanner
      variant={variant}
      title={title}
      description={description}
      onClose={onClose}
      action={action}
      className={className}
    />
  );
}

// Breadcrumbs Astryx
import { Breadcrumbs as AstryxBreadcrumbs } from '@astryxdesign/core/Breadcrumbs';

export function BreadcrumbsAstryx({ items, className }) {
  return (
    <AstryxBreadcrumbs items={items} className={className} />
  );
}

// Pagination Astryx
import { Pagination as AstryxPagination } from '@astryxdesign/core/Pagination';

export function PaginationAstryx({ 
  currentPage, 
  totalPages, 
  onPageChange,
  className 
}) {
  return (
    <AstryxPagination
      currentPage={currentPage}
      totalPages={totalPages}
      onPageChange={onPageChange}
      className={className}
    />
  );
}

// DropdownMenu Astryx
import { DropdownMenu as AstryxDropdownMenu, DropdownMenuItem as AstryxDropdownMenuItem } from '@astryxdesign/core/DropdownMenu';

export function DropdownMenuAstryx({ trigger, children, className }) {
  return (
    <AstryxDropdownMenu trigger={trigger} className={className}>
      {children}
    </AstryxDropdownMenu>
  );
}

export function DropdownMenuItemAstryx({ onClick, children, className }) {
  return (
    <AstryxDropdownMenuItem onClick={onClick} className={className}>
      {children}
    </AstryxDropdownMenuItem>
  );
}

// Skeleton Astryx
import { Skeleton as AstryxSkeleton } from '@astryxdesign/core/Skeleton';

export function SkeletonAstryx({ width, height, radius = 'md', className }) {
  return (
    <AstryxSkeleton width={width} height={height} radius={radius} className={className} />
  );
}

// Avatar Astryx
import { Avatar as AstryxAvatar } from '@astryxdesign/core/Avatar';

export function AvatarAstryx({ src, name, size = 'md', className }) {
  return (
    <AstryxAvatar src={src} name={name} size={size} className={className} />
  );
}

// Badge Astryx
import { Badge as AstryxBadge } from '@astryxdesign/core/Badge';

export function BadgeAstryx({ variant = 'neutral', children, className }) {
  return (
    <AstryxBadge variant={variant} className={className}>
      {children}
    </AstryxBadge>
  );
}
