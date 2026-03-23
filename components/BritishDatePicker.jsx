import React, { forwardRef } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

// Custom input component that integrates with react-hook-form
const CustomInput = forwardRef(({ value, onClick, onChange, placeholder, className = '', error, ...props }, ref) => {
  // If className is provided, use it; otherwise use default styling
  const defaultClasses = "h-11 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm font-medium text-foreground outline-none transition-all duration-200 focus:ring-2 focus:ring-ring focus:border-transparent hover:border-ring/50 disabled:cursor-not-allowed disabled:opacity-50";
  const errorClasses = error ? "border-destructive focus:ring-destructive/20" : "";
  const finalClasses = className || `${defaultClasses} ${errorClasses}`;
  
  return (
    <input
      ref={ref}
      type="text"
      value={value}
      onClick={onClick}
      onChange={onChange}
      placeholder={placeholder}
      className={finalClasses}
      readOnly
      {...props}
    />
  );
});

CustomInput.displayName = 'CustomInput';

function parseDateValue(value) {
  if (!value) return null;
  if (value instanceof Date) return value;

  if (typeof value === 'string') {
    const isoDateOnlyMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (isoDateOnlyMatch) {
      const [, year, month, day] = isoDateOnlyMatch;
      return new Date(Number(year), Number(month) - 1, Number(day));
    }

    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  return null;
}

const BritishDatePicker = forwardRef(({
  value,
  onChange,
  className = '',
  error = false,
  maxDate = new Date(),
  minDate = null,
  placeholder = 'DD/MM/YYYY',
  disabled = false,
  ...props
}, ref) => {
  const selectedDate = parseDateValue(value);

  return (
    <DatePicker
      ref={ref}
      selected={selectedDate}
      onChange={onChange}
      dateFormat="dd/MM/yyyy"
      maxDate={maxDate}
      minDate={minDate}
      placeholderText={placeholder}
      disabled={disabled}
      showYearDropdown
      showMonthDropdown
      dropdownMode="select"
      customInput={
        <CustomInput
          className={className}
          error={error}
        />
      }
      {...props}
    />
  );
});

BritishDatePicker.displayName = 'BritishDatePicker';

export default BritishDatePicker;