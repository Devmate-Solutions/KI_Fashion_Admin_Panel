"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, X } from "lucide-react";
import { Button } from "./button";

export function MultiSelect({
  options = [],
  value = [],
  onChange,
  placeholder = "Select options",
  disabled = false,
  className = "",
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const buttonRef = useRef(null);
  const dropdownContentRef = useRef(null);
  const [dropdownPosition, setDropdownPosition] = useState({ 
    top: 0, 
    left: 0, 
    width: 0, 
    placement: 'bottom' // 'bottom' or 'top'
  });

  const updateDropdownPosition = () => {
    if (buttonRef.current) {
      const buttonRect = buttonRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;
      
      // Estimate dropdown height (max 240px for max-h-60, but could be less)
      const estimatedDropdownHeight = Math.min(options.length * 40 + 16, 240);
      const spaceBelow = viewportHeight - buttonRect.bottom;
      const spaceAbove = buttonRect.top;
      
      // Determine placement: prefer bottom, but use top if not enough space
      const placement = spaceBelow >= estimatedDropdownHeight || spaceBelow >= spaceAbove 
        ? 'bottom' 
        : 'top';
      
      // Calculate top position
      let top;
      if (placement === 'bottom') {
        top = buttonRect.bottom + 4; // 4px gap
      } else {
        // Position above the button
        top = buttonRect.top - estimatedDropdownHeight - 4; // 4px gap
      }
      
      // Calculate left position (align with button, but keep within viewport)
      let left = buttonRect.left;
      const dropdownWidth = Math.max(buttonRect.width, 200);
      
      // If dropdown would overflow right edge, shift it left
      if (left + dropdownWidth > viewportWidth - 10) {
        left = viewportWidth - dropdownWidth - 10;
      }
      
      // If dropdown would overflow left edge, shift it right
      if (left < 10) {
        left = 10;
      }
      
      setDropdownPosition({
        top,
        left,
        width: dropdownWidth,
        placement,
      });
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(event.target) &&
        dropdownContentRef.current &&
        !dropdownContentRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      // Initial position update
      updateDropdownPosition();
      
      // Set up event listeners
      document.addEventListener("mousedown", handleClickOutside);
      
      // Use requestAnimationFrame for smooth updates during scroll
      let rafId;
      const handleScroll = () => {
        if (rafId) cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(updateDropdownPosition);
      };
      
      window.addEventListener("resize", updateDropdownPosition);
      window.addEventListener("scroll", handleScroll, true);
      document.addEventListener("scroll", handleScroll, true);
      
      // Also update on any scrollable container
      const scrollableParents = [];
      let parent = buttonRef.current?.parentElement;
      while (parent && parent !== document.body) {
        const overflow = window.getComputedStyle(parent).overflow;
        if (overflow === 'auto' || overflow === 'scroll' || overflow === 'hidden') {
          scrollableParents.push(parent);
          parent.addEventListener("scroll", handleScroll, true);
        }
        parent = parent.parentElement;
      }

      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
        window.removeEventListener("resize", updateDropdownPosition);
        window.removeEventListener("scroll", handleScroll, true);
        document.removeEventListener("scroll", handleScroll, true);
        scrollableParents.forEach(el => el.removeEventListener("scroll", handleScroll, true));
        if (rafId) cancelAnimationFrame(rafId);
      };
    }
  }, [isOpen, options.length]);

  const handleToggle = (optionValue) => {
    if (disabled) return;
    
    const newValue = value.includes(optionValue)
      ? value.filter((v) => v !== optionValue)
      : [...value, optionValue];
    
    onChange(newValue);
  };

  const handleRemove = (optionValue, e) => {
    e.stopPropagation();
    const newValue = value.filter((v) => v !== optionValue);
    onChange(newValue);
  };

  const selectedLabels = value
    .map((val) => options.find((opt) => opt.value === val)?.label || val)
    .join(", ");

  const renderDropdown = () => {
    if (!isOpen) return null;

    // Calculate max height based on viewport and placement
    const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 800;
    const maxHeight = dropdownPosition.placement === 'top'
      ? Math.min(viewportHeight - 20, 240)
      : Math.min(viewportHeight - dropdownPosition.top - 20, 240);

    const dropdownContent = (
      <div
        ref={dropdownContentRef}
        className="fixed z-[9999] bg-white border-2 border-blue-300 rounded-md shadow-2xl min-w-[200px]"
        style={{
          top: `${dropdownPosition.top}px`,
          left: `${dropdownPosition.left}px`,
          width: `${dropdownPosition.width}px`,
          maxHeight: `${maxHeight}px`,
        }}
      >
        {/* Visual connector arrow */}
        <div
          className={`absolute left-4 w-0 h-0 ${
            dropdownPosition.placement === 'top'
              ? 'bottom-[-8px] border-t-8 border-t-blue-300 border-l-8 border-l-transparent border-r-8 border-r-transparent'
              : 'top-[-8px] border-b-8 border-b-blue-300 border-l-8 border-l-transparent border-r-8 border-r-transparent'
          }`}
        />
        <div 
          className="overflow-y-auto overflow-x-hidden"
          style={{
            maxHeight: `${maxHeight}px`,
          }}
        >
          <div className="p-2">
            {options.length === 0 ? (
              <div className="px-2 py-1.5 text-sm text-muted-foreground">No options available</div>
            ) : (
              options.map((option) => {
                const isSelected = value.includes(option.value);
                return (
                  <div
                    key={option.value}
                    onClick={() => handleToggle(option.value)}
                    className={`flex items-center px-3 py-2.5 text-sm rounded-md cursor-pointer transition-all duration-150 ${
                      isSelected 
                        ? "bg-blue-100 hover:bg-blue-200 border border-blue-300" 
                        : "hover:bg-slate-100 border border-transparent"
                    }`}
                  >
                    <div
                      className={`flex items-center justify-center w-5 h-5 mr-3 border-2 rounded flex-shrink-0 ${
                        isSelected
                          ? "bg-blue-600 border-blue-600"
                          : "border-slate-400"
                      }`}
                    >
                      {isSelected && <Check className="h-3.5 w-3.5 text-white font-bold" />}
                    </div>
                    <span className={`flex-1 font-medium ${isSelected ? "text-blue-900" : "text-slate-900"}`}>
                      {option.label}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    );

    // Use portal to render outside table container
    if (typeof window !== "undefined") {
      return createPortal(dropdownContent, document.body);
    }
    return dropdownContent;
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <Button
        ref={buttonRef}
        type="button"
        variant="outline"
        onClick={() => {
          if (!disabled) {
            const newIsOpen = !isOpen;
            setIsOpen(newIsOpen);
            if (newIsOpen) {
              // Use requestAnimationFrame to ensure DOM is updated
              requestAnimationFrame(() => {
                updateDropdownPosition();
              });
            }
          }
        }}
        disabled={disabled}
        className={`w-full justify-between h-10 text-left font-normal min-w-[150px] ${
          isOpen ? "border-blue-500 border-2 ring-2 ring-blue-200" : ""
        }`}
      >
        <span className={value.length === 0 ? "text-muted-foreground" : "text-slate-900 font-medium"}>
          {value.length === 0
            ? placeholder
            : value.length === 1
            ? selectedLabels
            : `${value.length} selected`}
        </span>
        <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? "transform rotate-180" : ""} ${value.length === 0 ? "opacity-50" : "opacity-70"}`} />
      </Button>

      {renderDropdown()}

      {value.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {value.map((val) => {
            const label = options.find((opt) => opt.value === val)?.label || val;
            return (
              <span
                key={val}
                className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-md"
              >
                {label}
                <button
                  type="button"
                  onClick={(e) => handleRemove(val, e)}
                  className="hover:text-blue-900"
                  disabled={disabled}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}

