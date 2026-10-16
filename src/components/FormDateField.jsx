/**
 * FormDateField — modern date field (coss DatePicker).
 * value/onChange use YYYY-MM-DD strings (same as <input type="date">).
 * Pass `label` for standalone field; omit when already inside .form-group.
 */
import { DatePicker } from './ui/date-picker';
import { cn } from '@/lib/utils';

export default function FormDateField({
  label,
  value,
  onChange,
  placeholder = 'Pilih tanggal',
  disabled,
  required,
  className,
  hint,
}) {
  const control = (
    <>
      <DatePicker
        value={value || ''}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        buttonClassName="form-date-trigger"
      />
      {hint ? <span className="form-hint">{hint}</span> : null}
    </>
  );

  if (!label) {
    return <div className={cn('form-date-field', className)}>{control}</div>;
  }

  return (
    <div className={cn('form-group', className)}>
      <label className="form-label">
        {label}
        {required ? <span className="td-muted-sm"> *</span> : null}
      </label>
      {control}
    </div>
  );
}
