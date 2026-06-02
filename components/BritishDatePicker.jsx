// import React, { forwardRef } from 'react';
// import DatePicker from 'react-datepicker';
// import 'react-datepicker/dist/react-datepicker.css';
// import { useAuthStore } from '../store/store';

// // Custom input component that integrates with react-hook-form
// const CustomInput = forwardRef(({ value, onClick, onChange, placeholder, className = '', error, ...props }, ref) => {
//   // If className is provided, use it; otherwise use default styling
//   const defaultClasses = "h-11 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm font-medium text-foreground outline-none transition-all duration-200 focus:ring-2 focus:ring-ring focus:border-transparent hover:border-ring/50 disabled:cursor-not-allowed disabled:opacity-50";
//   const errorClasses = error ? "border-destructive focus:ring-destructive/20" : "";
//   const finalClasses = className || `${defaultClasses} ${errorClasses}`;
  
//   return (
//     <input
//       ref={ref}
//       type="text"
//       value={value}
//       onClick={onClick}
//       onChange={onChange}
//       placeholder={placeholder}
//       className={finalClasses}
//       readOnly
//       {...props}
//     />
//   );
// });

// CustomInput.displayName = 'CustomInput';

// function parseDateValue(value) {
//   if (!value) return null;
//   if (value instanceof Date) return value;

//   if (typeof value === 'string') {
//     const isoDateOnlyMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
//     if (isoDateOnlyMatch) {
//       const [, year, month, day] = isoDateOnlyMatch;
//       return new Date(Number(year), Number(month) - 1, Number(day));
//     }

//     const parsed = new Date(value);
//     return Number.isNaN(parsed.getTime()) ? null : parsed;
//   }

//   return null;
// }

// const BritishDatePicker = forwardRef(({
//   value,
//   onChange,
//   className = '',
//   error = false,
//   maxDate = null,
//   minDate = null,
//   placeholder = 'DD/MM/YYYY',
//   disabled = false,
//   restrictByRole = false,
//   ...props
// }, ref) => {
//   const { user } = useAuthStore();
//   const selectedDate = parseDateValue(value);

//   // Define date restrictions based on user role
//   const isAdminOrSuperAdmin = user?.role === 'super-admin' || user?.role === 'admin';
  
//   // If restrictByRole is true and user is NOT an admin/super-admin, restrict to today only
//   const finalMaxDate = (restrictByRole && !isAdminOrSuperAdmin) ? new Date() : maxDate;
//   const finalMinDate = (restrictByRole && !isAdminOrSuperAdmin) ? new Date() : minDate;
  
//   return (
//     <DatePicker
//       ref={ref}
//       selected={selectedDate}
//       onChange={onChange}
//       dateFormat="dd/MM/yyyy"
//       maxDate={finalMaxDate}
//       minDate={finalMinDate}
//       placeholderText={placeholder}
//       disabled={disabled || (restrictByRole && !isAdminOrSuperAdmin)}
//       showYearDropdown
//       showMonthDropdown
//       dropdownMode="select"
//       customInput={
//         <CustomInput
//           className={className}
//           error={error}
//         />
//       }
//       {...props}
//     />
//   );
// });

// BritishDatePicker.displayName = 'BritishDatePicker';

// export default BritishDatePicker;

import React, { forwardRef } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { useAuthStore } from '../store/store'; // Adjust path if needed

// Custom input component with an absolute "Clear" button
const CustomInput = forwardRef(({ value, onClick, onChange, placeholder, className = '', error, disabled, onClear, ...props }, ref) => {
  // pr-8 ensures the text doesn't type underneath the "X" button
  const defaultClasses = "h-11 w-full rounded-lg border border-input bg-background pl-3 pr-8 py-2 text-sm font-medium text-foreground outline-none transition-all duration-200 focus:ring-2 focus:ring-ring focus:border-transparent hover:border-ring/50 disabled:cursor-not-allowed disabled:opacity-50";
  const errorClasses = error ? "border-destructive focus:ring-destructive/20" : "";
  
  const baseClasses = className || defaultClasses;
  const finalClasses = `${baseClasses} ${errorClasses} pr-8`.trim();
  
  return (
    <div className="relative w-full">
      <input
        ref={ref}
        type="text"
        value={value}
        onClick={onClick}
        onChange={onChange}
        placeholder={placeholder}
        className={finalClasses}
        readOnly
        disabled={disabled}
        {...props}
      />
      {/* Clear Button */}
      {value && !disabled && onClear && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation(); // Prevents calendar from opening when clearing
            onClear();
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground rounded-sm hover:bg-muted/50 p-1 focus:outline-none transition-colors"
          title="Clear date"
        >
          <svg width="12" height="12" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M11.7816 4.03157C12.0062 3.80702 12.0062 3.44295 11.7816 3.2184C11.5571 2.99385 11.193 2.99385 10.9685 3.2184L7.50005 6.68682L4.03164 3.2184C3.80708 2.99385 3.44301 2.99385 3.21846 3.2184C2.99391 3.44295 2.99391 3.80702 3.21846 4.03157L6.68688 7.49999L3.21846 10.9684C2.99391 11.193 2.99391 11.557 3.21846 11.7816C3.44301 12.0061 3.80708 12.0061 4.03164 11.7816L7.50005 8.31316L10.9685 11.7816C11.193 12.0061 11.5571 12.0061 11.7816 11.7816C12.0062 11.557 12.0062 11.193 11.7816 10.9684L8.31322 7.49999L11.7816 4.03157Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"/>
          </svg>
        </button>
      )}
    </div>
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
  maxDate = null,
  minDate = null,
  placeholder = 'DD/MM/YYYY',
  disabled = false,
  restrictByRole = false,
  ...props
}, ref) => {
  const { user } = useAuthStore();
  const selectedDate = parseDateValue(value);

  const isAdminOrSuperAdmin = user?.role === 'super-admin' || user?.role === 'admin';
  const finalMaxDate = (restrictByRole && !isAdminOrSuperAdmin) ? new Date() : maxDate;
  const finalMinDate = (restrictByRole && !isAdminOrSuperAdmin) ? new Date() : minDate;
  
  return (
    <DatePicker
      ref={ref}
      selected={selectedDate}
      onChange={onChange}
      dateFormat="dd/MM/yyyy"
      maxDate={finalMaxDate}
      minDate={finalMinDate}
      placeholderText={placeholder}
      disabled={disabled || (restrictByRole && !isAdminOrSuperAdmin)}
      showYearDropdown
      showMonthDropdown
      dropdownMode="select"
      wrapperClassName="w-full"
      portalId="root-portal" // TELEPORTS OUT OF TABLE
      popperClassName="!z-[9999]" // GUARANTEES IT STAYS ON TOP
      customInput={
        <CustomInput
          className={className}
          error={error}
          onClear={() => onChange(null)}
        />
      }
      {...props}
    />
  );
});

BritishDatePicker.displayName = 'BritishDatePicker';

export default BritishDatePicker;