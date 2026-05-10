"use client";

import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

const FIELD_LABELS = {
  // Common
  date: 'Date',
  description: 'Description',
  notes: 'Notes',
  amount: 'Amount (£)',
  paymentMethod: 'Payment Method',
  
  // Sale
  saleDate: 'Sale Date',
  saleNumber: 'Sale Number',
  buyer: 'Buyer ID',
  manualCustomer: 'Customer Name',
  totalDiscount: 'Discount (£)',
  shippingCost: 'Shipping (£)',
  cashPayment: 'Cash Payment (£)',
  bankPayment: 'Bank Payment (£)',
  saleType: 'Sale Type',
  
  // Expense
  expenseDate: 'Expense Date',
  costType: 'Category ID',
  vendor: 'Vendor',
  invoiceNumber: 'Invoice #',
  receiptNumber: 'Receipt #',
  taxAmount: 'Tax (£)',
  
  // Payment
  customerId: 'Customer ID',
  paymentDirection: 'Direction',
  debitReason: 'Reason',
  
  // Dispatch Order
  dispatchDate: 'Dispatch Date',
  exchangeRate: 'Exchange Rate',
  percentage: 'Markup (%)',
  discount: 'Total Discount (£)',
};

function getFriendlyLabel(field) {
  if (FIELD_LABELS[field]) return FIELD_LABELS[field];
  return field
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, s => s.toUpperCase())
    .replace(/_/g, ' ')
    .trim();
}

function formatValue(field, value) {
  if (value === null || value === undefined || value === '') return '—';
  
  if (field.toLowerCase().includes('date') || field === 'date') {
    try {
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        return format(date, "dd MMM yyyy, HH:mm");
      }
    } catch (e) {
      return value;
    }
  }

  if (typeof value === 'number') {
    if (field.toLowerCase().includes('amount') || field.toLowerCase().includes('payment') || field.toLowerCase().includes('cost') || field === 'totalDiscount' || field === 'discount' || field === 'shippingCost') {
       return `£${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return value.toLocaleString();
  }

  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  
  if (Array.isArray(value)) return `${value.length} items`;
  
  if (typeof value === 'object') return JSON.stringify(value);

  return String(value);
}

function ItemsList({ items = [], entityType }) {
  if (!items || items.length === 0) return <p className="text-sm text-muted-foreground italic">No items</p>;

  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="flex items-start gap-2.5 text-sm border-b pb-2 last:border-0">
          <Badge variant="outline" className="shrink-0 mt-0.5 font-mono text-[10px]">
            #{i + 1}
          </Badge>
          <div className="flex-1">
            <p className="font-medium">
              {item.productName || item.productCode || item.product || 'Unknown Product'}
              {item.productCode && <span className="text-muted-foreground ml-1">({item.productCode})</span>}
            </p>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-0.5 text-xs text-muted-foreground">
              <span>Qty: <span className="font-medium text-foreground">{item.quantity}</span></span>
              {item.unitPrice !== undefined && (
                <span>Price: <span className="font-medium text-foreground">£{item.unitPrice.toFixed(2)}</span></span>
              )}
              {item.costPrice !== undefined && (
                <span>Cost: <span className="font-medium text-foreground">£{item.costPrice.toFixed(2)}</span></span>
              )}
              {item.variant && (
                <span>Variant: <span className="font-medium text-foreground">{item.variant.size} / {item.variant.color}</span></span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * PayloadView - Displays the full data of a creation request
 */
export default function PayloadView({ payload, entityType }) {
  if (!payload || Object.keys(payload).length === 0) {
    return <p className="text-sm text-muted-foreground">No data available</p>;
  }

  // Separate items from simple fields
  const { items, ...fields } = payload;
  const fieldEntries = Object.entries(fields).filter(([k, v]) => {
      // Filter out internal fields or complex objects that aren't items
      if (k === '_id' || k === '__v' || k === 'createdBy' || k === 'createdAt' || k === 'updatedAt') return false;
      return typeof v !== 'object' || v === null;
  });

  return (
    <div className="space-y-4">
      {/* Scalar Fields */}
      <div className="border rounded-lg overflow-hidden bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/30 border-b">
              <th className="text-left p-3 font-medium text-muted-foreground w-1/3">Field</th>
              <th className="text-left p-3 font-medium">Value</th>
            </tr>
          </thead>
          <tbody>
            {fieldEntries.map(([field, value]) => (
              <tr key={field} className="border-b last:border-0 hover:bg-muted/5 transition-colors">
                <td className="p-3 font-medium text-muted-foreground">{getFriendlyLabel(field)}</td>
                <td className="p-3 font-mono text-xs">{formatValue(field, value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Items Section */}
      {items && Array.isArray(items) && items.length > 0 && (
        <div className="border rounded-lg overflow-hidden bg-white">
          <div className="bg-muted/30 border-b px-3 py-2.5">
            <span className="text-sm font-medium">Items ({items.length})</span>
          </div>
          <div className="p-3">
            <ItemsList items={items} entityType={entityType} />
          </div>
        </div>
      )}

      {/* Financial Warning for certain types */}
      {['sale', 'payment', 'supplier-payment', 'expense'].includes(entityType) && (
        <div className="rounded-lg border bg-blue-50/50 p-3 flex items-center gap-2">
          <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300">New Entry</Badge>
          <span className="text-xs text-blue-700 font-medium">This is a new backdated record that will be created upon approval.</span>
        </div>
      )}
    </div>
  );
}
