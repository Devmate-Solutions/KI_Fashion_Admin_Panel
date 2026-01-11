import React, { forwardRef } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

// Custom input component that integrates with react-hook-form
const CustomInput = forwardRef(({ value, onClick, onChange, placeholder, className, error, ...props }, ref) => (
  <input
    ref={ref}
    type="text"
    value={value}
    onClick={onClick}
    onChange={onChange}
    placeholder={placeholder}
    className={className}
    readOnly
    {...props}
  />
));

CustomInput.displayName = 'CustomInput';

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
  // Convert string to Date object if needed
  const selectedDate = value ? (typeof value === 'string' ? new Date(value) : value) : null;

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