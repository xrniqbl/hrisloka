// DateInput Component - Astryx Design
import { DateInput as AstryxDateInput } from '@astryxdesign/core/DateInput';

export function DateInput({ 
  label,
  value, 
  onChange, 
  placeholder = 'Pilih tanggal',
  isRequired = false,
  isOptional = false,
  isDisabled = false,
  description,
  status,
  hasClear = true,
  min,
  max,
  className 
}) {
  return (
    <AstryxDateInput
      label={label}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      isRequired={isRequired}
      isOptional={isOptional}
      isDisabled={isDisabled}
      description={description}
      status={status}
      hasClear={hasClear}
      min={min}
      max={max}
      className={className}
    />
  );
}

export default DateInput;
