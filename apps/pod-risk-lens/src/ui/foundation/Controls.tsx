import type {ButtonHTMLAttributes, ChangeEvent, SelectHTMLAttributes} from 'react';
import './Controls.css';

export type ButtonVariant = 'primary' | 'secondary' | 'quiet';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

export function Button({variant = 'secondary', className = '', type = 'button', ...props}: ButtonProps) {
  return <button {...props} type={type} className={`risk-button risk-button--${variant}${className ? ` ${className}` : ''}`} />;
}

export interface SegmentedOption<Value extends string = string> {
  value: Value;
  label: string;
  disabled?: boolean;
}

export interface SegmentedControlProps<Value extends string = string> {
  label: string;
  value: Value;
  options: readonly SegmentedOption<Value>[];
  onChange: (value: Value) => void;
  disabled?: boolean;
  className?: string;
}

export function SegmentedControl<Value extends string>({
  label, value, options, onChange, disabled = false, className = '',
}: SegmentedControlProps<Value>) {
  return (
    <div className={`risk-segmented${className ? ` ${className}` : ''}`} role="group" aria-label={label}>
      {options.map(option => (
        <button
          key={option.value}
          type="button"
          className={`risk-segmented__option${value === option.value ? ' is-selected' : ''}`}
          aria-pressed={value === option.value}
          disabled={disabled || option.disabled}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export interface SearchFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function SearchField({
  id, label, value, onChange, placeholder, disabled = false, className = '',
}: SearchFieldProps) {
  return (
    <label className={`risk-search${className ? ` ${className}` : ''}`} htmlFor={id}>
      <span className="risk-search__label">{label}</span>
      <input
        id={id}
        type="search"
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        onChange={(event: ChangeEvent<HTMLInputElement>) => onChange(event.currentTarget.value)}
      />
    </label>
  );
}

export interface SelectOption<Value extends string = string> {
  value: Value;
  label: string;
  disabled?: boolean;
}

export interface SelectFieldProps<Value extends string = string> {
  id: string;
  label: string;
  value: Value;
  options: readonly SelectOption<Value>[];
  onChange: (value: Value) => void;
  disabled?: boolean;
  className?: string;
  name?: string;
  required?: boolean;
  autoComplete?: SelectHTMLAttributes<HTMLSelectElement>['autoComplete'];
}

export function SelectField<Value extends string>({
  id, label, value, options, onChange, disabled = false, className = '', name, required, autoComplete,
}: SelectFieldProps<Value>) {
  return (
    <label className={`risk-select${className ? ` ${className}` : ''}`} htmlFor={id}>
      <span className="risk-select__label" id={`${id}-label`}>{label}</span>
      <select
        id={id}
        aria-labelledby={`${id}-label`}
        name={name}
        value={value}
        disabled={disabled}
        required={required}
        autoComplete={autoComplete}
        onChange={event => onChange(event.currentTarget.value as Value)}
      >
        {options.map(option => <option key={option.value} value={option.value} disabled={option.disabled}>{option.label}</option>)}
      </select>
    </label>
  );
}
