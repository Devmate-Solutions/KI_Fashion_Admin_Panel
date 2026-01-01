"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { AlertCircle, CheckCircle2 } from "lucide-react";

/**
 * CompositionEditor - Matrix/Grid based composition editor
 * Simple table with colors as rows and sizes as columns
 * 
 * @param {Object} props
 * @param {Array} props.composition - Flat array of {size, color, quantity}
 * @param {Function} props.onChange - Callback when composition changes
 * @param {number} props.expectedTotal - Expected total quantity
 * @param {boolean} props.readOnly - If true, disable editing
 * @param {Array} props.availableSizes - Available sizes for columns
 * @param {Array} props.availableColors - Available colors for rows
 */
export default function CompositionEditor({
  composition: initialComposition = [],
  onChange,
  expectedTotal = 0,
  readOnly = false,
  availableSizes = [],
  availableColors = [],
}) {
  const [matrix, setMatrix] = useState({});

  // Initialize matrix from sizes and colors
  const initializeMatrix = (sizes, colors, composition = []) => {
    const newMatrix = {};

    colors.forEach(color => {
      newMatrix[color] = {};
      sizes.forEach(size => {
        newMatrix[color][size] = 0;
      });
    });

    // Populate from composition if provided
    composition.forEach(item => {
      if (item.color && item.size && newMatrix[item.color]?.[item.size] !== undefined) {
        newMatrix[item.color][item.size] = item.quantity || 0;
      }
    });

    return newMatrix;
  };

  // Initialize matrix when component mounts or sizes/colors change
  useEffect(() => {
    if (availableSizes.length > 0 && availableColors.length > 0) {
      const newMatrix = initializeMatrix(availableSizes, availableColors, initialComposition);
      setMatrix(newMatrix);
    }
  }, [availableSizes.length, availableColors.length]);

  // Load initial composition when it changes (for template application)
  useEffect(() => {
    if (initialComposition.length > 0 && availableSizes.length > 0 && availableColors.length > 0) {
      const newMatrix = initializeMatrix(availableSizes, availableColors, initialComposition);
      setMatrix(newMatrix);
    }
  }, [initialComposition]);

  // Convert matrix to flat composition array
  const matrixToComposition = (matrixData) => {
    const composition = [];

    Object.entries(matrixData).forEach(([color, sizes]) => {
      Object.entries(sizes).forEach(([size, quantity]) => {
        const qty = parseInt(quantity) || 0;
        if (qty > 0) {  // Only include non-zero quantities
          composition.push({ color, size, quantity: qty });
        }
      });
    });

    return composition;
  };

  // Update a single cell
  const updateCell = (color, size, value) => {
    const qty = value === '' ? 0 : (parseInt(value) || 0);

    const newMatrix = {
      ...matrix,
      [color]: {
        ...matrix[color],
        [size]: qty
      }
    };

    setMatrix(newMatrix);

    // Notify parent
    if (onChange) {
      const composition = matrixToComposition(newMatrix);
      onChange(composition);
    }
  };

  // Calculate row total (all sizes for a color)
  const getRowTotal = (color) => {
    if (!matrix[color]) return 0;
    return Object.values(matrix[color]).reduce((sum, qty) => sum + (parseInt(qty) || 0), 0);
  };

  // Calculate column total (all colors for a size)
  const getColumnTotal = (size) => {
    let total = 0;
    Object.values(matrix).forEach(colorSizes => {
      total += parseInt(colorSizes[size]) || 0;
    });
    return total;
  };

  // Calculate grand total
  const getGrandTotal = () => {
    let total = 0;
    Object.values(matrix).forEach(colorSizes => {
      Object.values(colorSizes).forEach(qty => {
        total += parseInt(qty) || 0;
      });
    });
    return total;
  };

  const grandTotal = getGrandTotal();
  const isValid = expectedTotal > 0 && grandTotal === expectedTotal;
  const hasExpectedTotal = expectedTotal > 0;

  // Handle no sizes or colors
  if (availableSizes.length === 0 || availableColors.length === 0) {
    return (
      <div className="p-4 rounded-lg border border-orange-200 bg-orange-50">
        <div className="flex items-center gap-2 text-orange-700">
          <AlertCircle className="h-5 w-5" />
          <p className="text-sm font-medium">
            Please add sizes and colors to the product before configuring packet composition.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Matrix Table */}
      <div className="overflow-x-auto border border-slate-200 rounded-lg">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-100">
              <th className="px-3 py-2 text-left font-semibold text-slate-700 border-b border-r border-slate-200">
                Color / Size
              </th>
              {availableSizes.map(size => (
                <th key={size} className="px-3 py-2 text-center font-semibold text-slate-700 border-b border-slate-200">
                  {size}
                </th>
              ))}
              <th className="px-3 py-2 text-center font-semibold text-slate-700 border-b border-l border-slate-200 bg-slate-200">
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {availableColors.map((color, colorIndex) => (
              <tr key={color} className={colorIndex % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                <td className="px-3 py-2 font-medium text-slate-700 border-r border-slate-200">
                  {color}
                </td>
                {availableSizes.map(size => {
                  const value = matrix[color]?.[size] || 0;
                  return (
                    <td key={size} className="px-2 py-2 border-slate-200">
                      <Input
                        type="text"
                        inputMode="numeric"
                        value={value === 0 ? '' : value}
                        onChange={(e) => {
                          const value = e.target.value;
                          // Allow only numbers
                          const sanitized = value.replace(/[^0-9]/g, '');
                          updateCell(color, size, sanitized);
                        }}
                        disabled={readOnly}
                        placeholder="0"
                        className={`text-center text-sm h-9 ${value > 0 ? 'bg-blue-50 border-blue-300 font-semibold' : ''}`}
                      />
                    </td>
                  );
                })}
                <td className="px-3 py-2 text-center font-bold text-slate-700 border-l border-slate-200 bg-slate-100">
                  {getRowTotal(color)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-slate-200">
              <td className="px-3 py-2 font-semibold text-slate-700 border-t border-r border-slate-300">
                Total
              </td>
              {availableSizes.map(size => (
                <td key={size} className="px-3 py-2 text-center font-bold text-slate-700 border-t border-slate-300">
                  {getColumnTotal(size)}
                </td>
              ))}
              <td className="px-3 py-2 text-center text-lg font-bold text-slate-900 border-t border-l border-slate-300 bg-slate-300">
                {grandTotal}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Total Indicator */}
      <div className={`p-3 rounded-lg border-2 ${hasExpectedTotal
          ? isValid
            ? "border-green-200 bg-green-50"
            : "border-orange-200 bg-orange-50"
          : "border-slate-200 bg-slate-50"
        }`}>
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Total Items:</span>
          <div className="flex items-center gap-2">
            <span className={`text-lg font-bold ${hasExpectedTotal
                ? isValid
                  ? "text-green-600"
                  : "text-orange-600"
                : "text-slate-600"
              }`}>
              {grandTotal} {hasExpectedTotal && `/ ${expectedTotal}`} items
            </span>
            {hasExpectedTotal && (
              isValid ? (
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              ) : (
                <AlertCircle className="h-5 w-5 text-orange-600" />
              )
            )}
          </div>
        </div>
        {hasExpectedTotal && !isValid && (
          <p className="text-xs text-slate-600 mt-1">
            {grandTotal < expectedTotal
              ? `Add ${expectedTotal - grandTotal} more items`
              : `Remove ${grandTotal - expectedTotal} items`}
          </p>
        )}
      </div>

      {/* Helper Text */}
      <div className="text-xs text-slate-500 italic">
        💡 Tip: Enter quantities for each size/color combination. Leave empty or 0 for combinations you don't need.
      </div>
    </div>
  );
}
