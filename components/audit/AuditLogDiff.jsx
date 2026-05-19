"use client";

import { Badge } from "@/components/ui/badge";

const IMPORTANT_FIELDS = {
  user: [
    'name', 'email', 'role', 'phone', 'address', 'isActive'
  ],
  supplier: [
    'name', 'company', 'email', 'phone', 'address', 'taxNumber', 'paymentTerms', 'creditLimit', 'currentBalance', 'isActive'
  ],
  product: [
    'name', 'sku', 'productCode', 'description', 'category', 'brand', 'season', 'unit', 'pricing', 'isActive'
  ],
  sale: [
    'saleNumber', 'invoiceNumber', 'receiptNumber', 'buyer', 'manualCustomer', 'items', 'subtotal', 'totalDiscount', 'shippingCost', 'vatRate', 'totalVAT', 'grandTotal', 'cashPayment', 'bankPayment', 'paymentStatus'
  ],
  salereturn: [
    'returnNumber', 'originalSale', 'buyer', 'items', 'totalRefundAmount', 'paymentMethod', 'status'
  ],
  supplierreturn: [
    'returnNumber', 'supplier', 'dispatchOrder', 'items', 'totalCreditAmount', 'status'
  ],
  customerpayment: [
    'paymentNumber', 'totalAmount', 'cashAmount', 'bankAmount', 'paymentMethod', 'paymentDate', 'description', 'advanceAmount', 'balanceBefore', 'balanceAfter', 'status'
  ],
  universalpayment: [
    'paymentNumber', 'totalAmount', 'cashAmount', 'bankAmount', 'paymentMethod', 'paymentDate', 'description', 'advanceAmount', 'balanceBefore', 'balanceAfter', 'status'
  ],
  universalreceipt: [
    'paymentNumber', 'totalAmount', 'cashAmount', 'bankAmount', 'paymentMethod', 'paymentDate', 'description', 'advanceAmount', 'balanceBefore', 'balanceAfter', 'status'
  ],
  ledgerentry: [
    'type', 'transactionType', 'debit', 'credit', 'date', 'description'
  ],
  supplierpaymentreceipt: [
    'receiptNumber', 'amount', 'paymentMethod', 'date', 'description', 'distributions'
  ],
  inventory: [
    'product', 'currentStock', 'availableStock', 'reservedStock', 'minStockLevel', 'maxStockLevel', 'reorderLevel', 'averageCostPrice'
  ],
  expense: [
    'expenseNumber', 'costType', 'amount', 'cashAmount', 'bankAmount', 'description', 'status', 'paymentMethod'
  ],
  editrequest: [
    'requestNumber', 'entityType', 'entityId', 'entityModel', 'requestType', 'requestedChanges', 'reason', 'status', 'reviewNote'
  ],
  dispatchorder: [
    'orderNumber', 'supplier', 'exchangeRate', 'percentage', 'items', 'totalQuantity', 'totalBoxes', 'estimatedCost', 'status', 'dispatchDate'
  ],
  purchase: [
    'orderNumber', 'supplier', 'exchangeRate', 'percentage', 'items', 'totalQuantity', 'totalBoxes', 'estimatedCost', 'status', 'dispatchDate'
  ]
};

/**
 * Utility to find differences between two objects
 * Returns an object compatible with DiffView: { field: { from, to } }
 */
function computeDiff(oldObj, newObj, resource) {
  const diff = {};
  
  const normResource = resource ? resource.replace(/-/g, '').toLowerCase() : null;
  const whitelist = normResource ? IMPORTANT_FIELDS[normResource] : null;

  if (!oldObj || typeof oldObj !== 'object') {
    // If it's a creation, show everything as 'to'
    if (newObj && typeof newObj === 'object') {
      Object.keys(newObj).forEach(key => {
        if (key === '_id' || key === '__v' || key === 'updatedAt' || key === 'createdAt' || key === 'createdBy' || key === 'updatedBy') return;
        if (whitelist && !whitelist.includes(key)) return;
        diff[key] = { from: null, to: newObj[key] };
      });
    }
    return diff;
  }

  const allKeys = new Set([...Object.keys(oldObj), ...Object.keys(newObj || {})]);
  
  allKeys.forEach(key => {
    if (key === '_id' || key === '__v' || key === 'updatedAt' || key === 'createdAt' || key === 'createdBy' || key === 'updatedBy') return;
    if (whitelist && !whitelist.includes(key)) return;
    
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

function formatValue(value, field) {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'number') {
    return value.toLocaleString();
  }
  if (typeof value === 'string') {
    // Check if it's a date
    if (value.length > 10 && !isNaN(Date.parse(value)) && (value.includes('T') || value.includes('-'))) {
        return new Date(value).toLocaleString('en-GB', { 
            day: '2-digit', 
            month: 'short', 
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        }).replace(',', '');
    }
    return value;
  }
  if (Array.isArray(value)) {
    if (field === 'season' || field === 'seasons') {
      return value.map(s => s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' ')).join(', ');
    }
    if (value.every(item => typeof item === 'string' || typeof item === 'number')) {
      return value.map(String).map(s => s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' ')).join(', ');
    }
    return `[${value.length} items]`;
  }
  if (typeof value === 'object') {
    if (value.costPrice !== undefined || value.sellingPrice !== undefined || value.minSellingPrice !== undefined) {
      const pParts = [];
      if (value.costPrice !== undefined) pParts.push(`Cost: £${value.costPrice.toLocaleString()}`);
      if (value.sellingPrice !== undefined) pParts.push(`Sell: £${value.sellingPrice.toLocaleString()}`);
      if (value.minSellingPrice !== undefined) pParts.push(`Min Sell: £${value.minSellingPrice.toLocaleString()}`);
      return pParts.join(', ');
    }
    if (value.companyName) return value.companyName;
    if (value.name) return value.name;
    if (value.company) return value.company;
    if (value.label) return value.label;
    if (value.title) return value.title;
    return '{...}';
  }
  return String(value);
}

function renderItemsList(items, isOld) {
  if (!items || !Array.isArray(items) || items.length === 0) {
    return <span className="text-slate-400 font-mono">—</span>;
  }

  return (
    <div className="space-y-1 max-h-96 overflow-y-auto pr-1 text-xs">
      {items.map((item, idx) => {
        const productName = item.productName || item.product?.name || item.product?.productCode || item.productCode || `Product #${idx + 1}`;
        const code = item.productCode || item.product?.productCode || item.product?.sku;
        const qty = item.quantity || item.packetQuantity || 0;
        const price = item.costPrice || item.unitPrice || 0;
        const total = item.landedTotal || item.totalPrice || (qty * price) || 0;

        let details = [];
        if (code) details.push(`Code: ${code}`);
        if (qty > 0) details.push(`Qty: ${qty}`);
        if (price > 0) details.push(`£${price.toLocaleString(undefined, { minimumFractionDigits: 2 })}`);
        if (total > 0 && total !== price * qty) details.push(`Total: £${total.toLocaleString(undefined, { minimumFractionDigits: 2 })}`);

        // Packets composition / simple composition
        let compositionStr = '';
        if (item.packets && item.packets.length > 0) {
          compositionStr = item.packets.map((pkt, pIdx) => {
            const compStr = pkt.composition
              ? pkt.composition.map(c => `${c.color}/${c.size} × ${c.quantity}`).join(', ')
              : '';
            return `Pkt #${pkt.packetNumber || (pIdx + 1)} (${pkt.totalItems} items${compStr ? `: ${compStr}` : ''}${pkt.isLoose ? ' Loose' : ''})`;
          }).join('; ');
        } else if (item.packetComposition && item.packetComposition.length > 0) {
          const compStr = item.packetComposition.map(c => `${c.color}/${c.size} × ${c.quantity}`).join(', ');
          compositionStr = `Composition: ${compStr}${item.packetQuantity > 0 ? ` (${item.packetQuantity} Pkts)` : ''}`;
        }

        return (
          <div 
            key={idx} 
            className={`font-mono py-1 border-b border-dashed border-slate-100 last:border-b-0 leading-normal ${
              isOld ? 'text-red-700 line-through' : 'text-green-700 font-semibold'
            }`}
          >
            • {productName} {details.length > 0 ? `[${details.join(', ')}]` : ''}
            {compositionStr && (
              <div className="text-[10px] text-slate-500 font-sans pl-3 mt-0.5">
                ↳ {compositionStr}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function AuditLogDiff({ oldData, newData, resource }) {
  const diff = computeDiff(oldData, newData, resource);
  
  const normResource = resource ? resource.replace(/-/g, '').toLowerCase() : null;
  const whitelist = normResource ? IMPORTANT_FIELDS[normResource] : null;

  let entries = Object.entries(diff);

  if (whitelist) {
    entries.sort((a, b) => {
      const indexA = whitelist.indexOf(a[0]);
      const indexB = whitelist.indexOf(b[0]);
      const posA = indexA === -1 ? 999 : indexA;
      const posB = indexB === -1 ? 999 : indexB;
      return posA - posB;
    });
  }

  if (entries.length === 0) {
    return <p className="text-sm text-muted-foreground italic">No meaningful data changes recorded in this snapshot.</p>;
  }

  return (
    <div className="border border-slate-100 overflow-hidden bg-white transition-all">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-100">
            <th className="text-left p-3 font-semibold text-slate-600">Field</th>
            <th className="text-left p-3 font-semibold text-slate-600">Previous</th>
            <th className="text-left p-3 font-semibold text-slate-600">Changed To</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {entries.map(([field, { from, to }]) => {
            if (field === 'items') {
              return (
                <tr key={field} className="hover:bg-slate-50/50 transition-colors align-top">
                  <td className="p-3 font-medium text-slate-500 whitespace-nowrap">{getFriendlyLabel(field)}</td>
                  <td className="p-3">
                    {renderItemsList(from, true)}
                  </td>
                  <td className="p-3">
                    {renderItemsList(to, false)}
                  </td>
                </tr>
              );
            }

            return (
              <tr key={field} className="hover:bg-slate-50/50 transition-colors">
                <td className="p-3 font-medium text-slate-500 whitespace-nowrap">{getFriendlyLabel(field)}</td>
                <td className="p-3">
                  <span className="text-red-700 bg-red-50 px-2 py-0.5 rounded text-xs line-through font-mono">
                      {formatValue(from, field)}
                  </span>
                </td>
                <td className="p-3">
                  <span className="text-green-700 bg-green-50 px-2 py-0.5 rounded text-xs font-semibold font-mono">
                      {formatValue(to, field)}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
