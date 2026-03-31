"use client";

import { Badge } from "@/components/ui/badge";

/**
 * Utility to find differences between two objects
 * Returns an object compatible with DiffView: { field: { from, to } }
 */
function computeDiff(oldObj, newObj) {
  const diff = {};
  if (!oldObj || typeof oldObj !== 'object') {
    // If it's a creation, show everything as 'to'
    if (newObj && typeof newObj === 'object') {
      Object.keys(newObj).forEach(key => {
        if (key === '_id' || key === '__v' || key === 'updatedAt' || key === 'createdAt') return;
        diff[key] = { from: null, to: newObj[key] };
      });
    }
    return diff;
  }

  const allKeys = new Set([...Object.keys(oldObj), ...Object.keys(newObj || {})]);
  
  allKeys.forEach(key => {
    if (key === '_id' || key === '__v' || key === 'updatedAt' || key === 'createdAt' || key === 'createdBy' || key === 'updatedBy') return;
    
    const oldVal = oldObj[key];
    const newVal = newObj ? newObj[key] : null;

    if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
      diff[key] = { from: oldVal, to: newVal };
    }
  });

  return diff;
}

const FIELD_LABELS = {
  name: 'Name',
  status: 'Status',
  role: 'Role',
  email: 'Email',
  phone: 'Phone',
  isActive: 'Active Status',
  currentBalance: 'Current Balance (£)',
  amount: 'Amount (£)',
  description: 'Description',
  address: 'Address',
  company: 'Company',
};

function getFriendlyLabel(field) {
  if (FIELD_LABELS[field]) return FIELD_LABELS[field];
  return field
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, s => s.toUpperCase())
    .replace(/_/g, ' ')
    .trim();
}

function formatValue(value) {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'number') {
    return value.toLocaleString();
  }
  if (typeof value === 'string') {
    // Check if it's a date
    if (value.length > 10 && !isNaN(Date.parse(value)) && (value.includes('T') || value.includes('-'))) {
        return new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    }
    return value;
  }
  if (Array.isArray(value)) return `[${value.length} items]`;
  if (typeof value === 'object') return '{...}';
  return String(value);
}

export default function AuditLogDiff({ oldData, newData }) {
  const diff = computeDiff(oldData, newData);
  const entries = Object.entries(diff);

  if (entries.length === 0) {
    return <p className="text-sm text-muted-foreground italic">No meaningful data changes recorded in this snapshot.</p>;
  }

  return (
    <div className="border rounded-lg overflow-hidden bg-white shadow-sm transition-all">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-100">
            <th className="text-left p-3 font-semibold text-slate-600">Field</th>
            <th className="text-left p-3 font-semibold text-slate-600">Previous</th>
            <th className="text-left p-3 font-semibold text-slate-600">Changed To</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {entries.map(([field, { from, to }]) => (
            <tr key={field} className="hover:bg-slate-50/50 transition-colors">
              <td className="p-3 font-medium text-slate-500 whitespace-nowrap">{getFriendlyLabel(field)}</td>
              <td className="p-3">
                <span className="text-red-700 bg-red-50 px-2 py-0.5 rounded text-xs line-through font-mono">
                    {formatValue(from)}
                </span>
              </td>
              <td className="p-3">
                <span className="text-green-700 bg-green-50 px-2 py-0.5 rounded text-xs font-semibold font-mono">
                    {formatValue(to)}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
