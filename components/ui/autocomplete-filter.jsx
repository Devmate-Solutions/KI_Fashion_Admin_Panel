import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { cn } from '@/lib/utils';

function normalize(str) {
  return (str || '').toLowerCase().replace(/[\s\-_.]+/g, '');
}

function levenshtein(a, b, limit) {
  if (Math.abs(a.length - b.length) > limit) return limit + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  let curr = new Array(b.length + 1);
  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    let rowMin = curr[0];
    for (let j = 1; j <= b.length; j++) {
      curr[j] =
        a[i - 1] === b[j - 1]
          ? prev[j - 1]
          : 1 + Math.min(prev[j], curr[j - 1], prev[j - 1]);
      if (curr[j] < rowMin) rowMin = curr[j];
    }
    if (rowMin > limit) return limit + 1;
    [prev, curr] = [curr, prev];
  }
  return prev[b.length];
}

const RANK_EXACT   = 0;
const RANK_PREFIX  = 1;
const RANK_CONTAINS = 2;
const RANK_FUZZY   = 3;

export default function AutocompleteFilter({
  value,
  onChange,
  options,
  placeholder,
  className,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const wrapperRef = useRef(null);

  // Sync internal input value with the selected value
  useEffect(() => {
    if (options && options.length > 0 && typeof options[0] === 'object') {
      const selected = options.find(o => o.value === value);
      setInputValue(selected ? selected.label : value || '');
    } else {
      setInputValue(value || '');
    }
  }, [value, options]);

  const filteredOptions = useMemo(() => {
    const normInput = normalize(inputValue);
    if (!normInput) return [];

    const threshold = Math.floor(normInput.length / 4) + 1;

    const scored = options
      .map((opt) => {
        const isObj = typeof opt === 'object' && opt !== null;
        const searchableText = isObj ? `${opt.label || ''} ${opt.subLabel || ''}` : opt;
        const normOpt = normalize(searchableText);

        if (normOpt === normInput) return { opt, rank: RANK_EXACT };
        if (normOpt.startsWith(normInput)) return { opt, rank: RANK_PREFIX };
        if (normOpt.includes(normInput)) return { opt, rank: RANK_CONTAINS };

        const dist = levenshtein(normInput, normOpt.slice(0, normInput.length), threshold);
        if (dist <= threshold) return { opt, rank: RANK_FUZZY };

        return null;
      })
      .filter(Boolean);

    scored.sort((a, b) => a.rank - b.rank);
    return scored.map((s) => s.opt);
  }, [inputValue, options]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = useCallback((e) => {
    const val = e.target.value;
    setInputValue(val);
    if (val === '') onChange('');
    setIsOpen(true);
  }, [onChange]);

  const handleFocus = useCallback(() => {
    if (inputValue && filteredOptions.length > 0) setIsOpen(true);
  }, [inputValue, filteredOptions.length]);

  const handleClear = useCallback(() => {
    setInputValue('');
    onChange('');
    setIsOpen(false);
  }, [onChange]);

  const handleSelect = useCallback((opt) => {
    const isObj = typeof opt === 'object' && opt !== null;
    setInputValue(isObj ? opt.label : opt);
    onChange(isObj ? opt.value : opt); // Emit the value/ID instead of the label
    setIsOpen(false);
  }, [onChange]);

  return (
    <div ref={wrapperRef} className={cn("relative w-full", isOpen ? "z-[100]" : "")}>
      <input
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        onFocus={handleFocus}
        placeholder={placeholder}
        className={cn(
          'w-full h-7 px-1.5 pr-6 text-[11px] border border-border rounded bg-background focus:ring-1 focus:ring-ring outline-none',
          className,
        )}
      />
      {inputValue && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 rounded-sm hover:bg-muted"
        >
          <svg width="10" height="10" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M11.7816 4.03157C12.0062 3.80702 12.0062 3.44295 11.7816 3.2184C11.5571 2.99385 11.193 2.99385 10.9685 3.2184L7.50005 6.68682L4.03164 3.2184C3.80708 2.99385 3.44301 2.99385 3.21846 3.2184C2.99391 3.44295 2.99391 3.80702 3.21846 4.03157L6.68688 7.49999L3.21846 10.9684C2.99391 11.193 2.99391 11.557 3.21846 11.7816C3.44301 12.0061 3.80708 12.0061 4.03164 11.7816L7.50005 8.31316L10.9685 11.7816C11.193 12.0061 11.5571 12.0061 11.7816 11.7816C12.0062 11.557 12.0062 11.193 11.7816 10.9684L8.31322 7.49999L11.7816 4.03157Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"/>
          </svg>
        </button>
      )}
      {isOpen && filteredOptions.length > 0 && (
        <div className="absolute z-[50] top-full left-0 min-w-full w-max mt-1 max-h-48 overflow-y-auto bg-popover text-popover-foreground border border-border rounded-md shadow-md">
          {filteredOptions.map((opt, idx) => {
            const isObj = typeof opt === 'object' && opt !== null;
            return (
              <div
                key={idx}
                className="px-3 py-2 cursor-pointer hover:bg-muted text-left border-b border-border/50 last:border-0"
                onClick={() => handleSelect(opt)}
              >
                {isObj ? (
                  <div className="flex flex-col">
                    <span className="font-medium text-sm text-foreground">{opt.label}</span>
                    {opt.subLabel && <span className="text-xs text-muted-foreground mt-0.5">{opt.subLabel}</span>}
                  </div>
                ) : (
                  <span className="font-medium text-sm text-foreground">{opt}</span>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  );
}