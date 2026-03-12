"use client";

import { Badge } from "@/components/ui/badge";

const FIELD_LABELS = {
  saleDate: 'Sale Date',
  saleType: 'Sale Type',
  buyer: 'Buyer',
  totalDiscount: 'Discount (£)',
  cashPayment: 'Cash Payment (£)',
  bankPayment: 'Bank Payment (£)',
  notes: 'Notes',
  totalAmount: 'Total Amount (£)',
  buyDate: 'Buy Date',
  supplier: 'Supplier',
  dispatchDate: 'Dispatch Date',
  requestType: 'Request Type',
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
    if (Number.isFinite(value) && value !== Math.floor(value)) return `£${value.toFixed(2)}`;
    return value.toLocaleString();
  }
  if (typeof value === 'string') {
    const date = new Date(value);
    if (!isNaN(date.getTime()) && value.includes('T')) {
      return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    }
    return value;
  }
  if (Array.isArray(value)) return value.map(v => formatValue(v)).join(', ');
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function ItemsDiff({ fromItems = [], toItems = [] }) {
  const maxLen = Math.max(fromItems.length, toItems.length);
  const rows = [];

  for (let i = 0; i < maxLen; i++) {
    const from = fromItems[i];
    const to = toItems[i];
    const pName = to?.productName || from?.productName || '';
    const pCode = to?.productCode || from?.productCode || '';
    const name = pName && pCode ? `${pName} (${pCode})` : pName || pCode || `Item ${i + 1}`;

    if (!from && to) {
      rows.push({ type: 'added', name, qty: to.quantity, price: to.unitPrice });
    } else if (from && !to) {
      rows.push({ type: 'removed', name, qty: from.quantity, price: from.unitPrice });
    } else if (from && to) {
      const changes = [];
      if (String(from.quantity) !== String(to.quantity))
        changes.push({ label: 'Qty', from: from.quantity, to: to.quantity });
      if (String(from.unitPrice) !== String(to.unitPrice))
        changes.push({ label: 'Price', from: `£${from.unitPrice}`, to: `£${to.unitPrice}` });
      if (changes.length > 0) rows.push({ type: 'changed', name, changes });
    }
  }

  if (rows.length === 0)
    return <p className="text-sm text-muted-foreground italic">No product line changes detected</p>;

  return (
    <div className="space-y-2.5">
      {rows.map((row, i) => (
        <div key={i} className="flex items-start gap-2.5 text-sm">
          {row.type === 'added' && (
            <>
              <span className="shrink-0 mt-0.5 text-xs font-semibold text-green-700 bg-green-50 border border-green-200 rounded px-1.5 py-0.5">+ Added</span>
              <div>
                <span className="font-medium text-green-800">{row.name}</span>
                <span className="text-muted-foreground ml-2 text-xs">Qty: {row.qty} · Price: £{row.price ?? 0}</span>
              </div>
            </>
          )}
          {row.type === 'removed' && (
            <>
              <span className="shrink-0 mt-0.5 text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded px-1.5 py-0.5">− Removed</span>
              <div>
                <span className="font-medium text-red-800 line-through">{row.name}</span>
                <span className="text-muted-foreground ml-2 text-xs">was Qty: {row.qty} · Price: £{row.price ?? 0}</span>
              </div>
            </>
          )}
          {row.type === 'changed' && (
            <>
              <span className="shrink-0 mt-0.5 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">~ Changed</span>
              <div>
                <span className="font-medium">{row.name}</span>
                <div className="flex flex-wrap gap-3 mt-0.5">
                  {row.changes.map((c, j) => (
                    <span key={j} className="text-xs">
                      <span className="text-muted-foreground">{c.label}: </span>
                      <span className="text-red-600 line-through">{c.from}</span>
                      <span className="text-muted-foreground mx-1">→</span>
                      <span className="text-green-700 font-semibold">{c.to}</span>
                    </span>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      ))}
    </div>
  );
}

/**
 * DiffView - Displays a comparison of old vs new values
 *
 * @param {Object} requestedChanges - { fieldPath: { from: oldValue, to: newValue } }
 * @param {boolean} compact - Show compact layout
 */
export default function DiffView({ requestedChanges, compact = false }) {
  if (!requestedChanges || Object.keys(requestedChanges).length === 0) {
    return <p className="text-sm text-muted-foreground">No changes</p>;
  }

  // Separate items (array) changes from simple scalar changes
  const { items: itemsChange, ...scalarChanges } = requestedChanges;
  const scalarEntries = Object.entries(scalarChanges).filter(
    ([, v]) => v && typeof v === 'object' && 'from' in v && 'to' in v
  );
  const hasItems = itemsChange && (Array.isArray(itemsChange.from) || Array.isArray(itemsChange.to));
  const hasScalar = scalarEntries.length > 0;
  const hasFinancialImpact =
    hasItems ||
    scalarEntries.some(([f]) => ['totalDiscount', 'cashPayment', 'bankPayment', 'totalAmount'].includes(f));

  if (compact) {
    return (
      <div className="space-y-1">
        {scalarEntries.map(([field, { from, to }]) => (
          <div key={field} className="text-xs">
            <span className="font-medium text-muted-foreground">{getFriendlyLabel(field)}:</span>{' '}
            <span className="text-red-600 line-through">{formatValue(from)}</span>{' → '}
            <span className="text-green-600 font-medium">{formatValue(to)}</span>
          </div>
        ))}
        {hasItems && (
          <ItemsDiff fromItems={itemsChange.from || []} toItems={itemsChange.to || []} />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {hasScalar && (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 border-b">
                <th className="text-left p-3 font-medium">Field</th>
                <th className="text-left p-3 font-medium">Current Value</th>
                <th className="text-left p-3 font-medium">Requested Value</th>
              </tr>
            </thead>
            <tbody>
              {scalarEntries.map(([field, { from, to }]) => (
                <tr key={field} className="border-b last:border-0">
                  <td className="p-3 font-medium text-muted-foreground">{getFriendlyLabel(field)}</td>
                  <td className="p-3">
                    <span className="bg-red-50 text-red-700 px-2 py-0.5 rounded text-xs font-mono">{formatValue(from)}</span>
                  </td>
                  <td className="p-3">
                    <span className="bg-green-50 text-green-700 px-2 py-0.5 rounded text-xs font-mono">{formatValue(to)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {hasItems && (
        <div className="border rounded-lg overflow-hidden">
          <div className="bg-muted/50 border-b px-3 py-2.5">
            <span className="text-sm font-medium">Product Lines</span>
          </div>
          <div className="p-3">
            <ItemsDiff fromItems={itemsChange.from || []} toItems={itemsChange.to || []} />
          </div>
        </div>
      )}

      {hasFinancialImpact && (
        <div className="rounded-lg border bg-amber-50 p-3 flex items-center gap-2">
          <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300">Financial Impact</Badge>
          <span className="text-xs text-amber-700">This change affects financial calculations. Review carefully.</span>
        </div>
      )}
    </div>
  );
}
