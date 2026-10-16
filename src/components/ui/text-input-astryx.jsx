// TextInput Astryx - Advanced text input with label, description, and validation
import { TextInput as AstryxTextInput } from '@astryxdesign/core/TextInput';

export function TextInputAstryx({ 
  label, 
  value, 
  onChange, 
  placeholder, 
  type = 'text',
  description,
  isRequired,
  isOptional,
  status,
  size = 'md',
  hasClear,
  startIcon,
  className 
}) {
  return (
    <AstryxTextInput
      label={label}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      type={type}
      description={description}
      isRequired={isRequired}
      isOptional={isOptional}
      status={status}
      size={size}
      hasClear={hasClear}
      startIcon={startIcon}
      className={className}
    />
  );
}
