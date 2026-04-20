"use client";

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function formatMoney(value) {
  const n = toNumber(value);
  return `£ ${n.toFixed(2)}`;
}

function getDisplayQuantity(item) {
  if (!item) return 0;

  if (item.isPacketSale) {
    const packetQuantity = toNumber(item.packetQuantity);
    if (packetQuantity > 0) return packetQuantity;

    const totalItemsPerPacket = toNumber(item.totalItemsPerPacket);
    const quantity = toNumber(item.quantity);
    if (totalItemsPerPacket > 0 && quantity > 0) {
      const derived = quantity / totalItemsPerPacket;
      if (Number.isFinite(derived) && derived > 0) {
        return Number.isInteger(derived) ? derived : Number(derived.toFixed(2));
      }
    }
  }

  return toNumber(item.quantity);
}

function normalizeSaleForReceipt(rawSale) {
  const sale = rawSale?.data || rawSale;
  if (!sale) return null;

  const customerName =
    sale?.buyer?.name ||
    sale?.buyer?.company ||
    sale?.manualCustomer?.name ||
    "Walk-in Customer";

  const items = Array.isArray(sale.items)
    ? sale.items.map((item) => {
        const quantity = getDisplayQuantity(item);
        const unitPrice = toNumber(item.unitPrice);
        const baseQuantity = toNumber(item.quantity) || quantity;
        const fallbackLineTotal = unitPrice * baseQuantity;

        return {
          name: item?.product?.name || item?.productName || "Item",
          quantity,
          unitPrice,
          lineTotal: toNumber(item.totalPrice ?? item.lineTotal ?? fallbackLineTotal),
        };
      })
    : [];

  const subtotal = toNumber(sale.subtotal);
  const discount = toNumber(sale.totalDiscount);
  const tax = toNumber(sale.totalTax);
  const shipping = toNumber(sale.shippingCost ?? sale.buyerShippingCharge);
  const grandTotal = toNumber(sale.grandTotal);
  const cashPayment = toNumber(sale.cashPayment);
  const bankPayment = toNumber(sale.bankPayment);
  const totalPaid = toNumber(sale.totalPaid || cashPayment + bankPayment);
  const remainingBalance = toNumber(sale.remainingBalance || grandTotal - totalPaid);

  return {
    saleNumber: sale.saleNumber || sale.invoiceNumber || sale._id || sale.id || "N/A",
    saleDate: sale.saleDate || sale.createdAt || new Date().toISOString(),
    customerName,
    items,
    subtotal,
    discount,
    tax,
    shipping,
    grandTotal,
    cashPayment,
    bankPayment,
    totalPaid,
    remainingBalance,
  };
}

function buildReceiptHtml(receipt) {
  const printedAt = new Date(receipt.saleDate || Date.now()).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const itemRows = receipt.items
    .map((item) => {
      return `
        <tr>
          <td class="item-name">${escapeHtml(item.name)}</td>
          <td class="item-num">${escapeHtml(item.quantity)}</td>
          <td class="item-num">${escapeHtml(formatMoney(item.unitPrice))}</td>
          <td class="item-num">${escapeHtml(formatMoney(item.lineTotal))}</td>
        </tr>
      `;
    })
    .join("");

  const optionalLines = [
    receipt.discount > 0
      ? `<div class="line"><span>Discount</span><span>- ${escapeHtml(formatMoney(receipt.discount))}</span></div>`
      : "",
    receipt.tax > 0
      ? `<div class="line"><span>Tax</span><span>${escapeHtml(formatMoney(receipt.tax))}</span></div>`
      : "",
    receipt.shipping > 0
      ? `<div class="line"><span>Shipping</span><span>${escapeHtml(formatMoney(receipt.shipping))}</span></div>`
      : "",
  ]
    .filter(Boolean)
    .join("");

  const saleNumberText = escapeHtml(receipt.saleNumber);

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Invoice - ${saleNumberText}</title>
      <style>
        @page {
          size: A4;
          margin: 15mm;
        }
        * {
          box-sizing: border-box;
        }
        html,
        body {
          margin: 0;
          padding: 0;
          background: #fff;
          color: #000;
          font-family: "Segoe UI", Roboto, Arial, sans-serif;
          font-size: 11px;
          line-height: 1.5;
        }
        .invoice-container {
          width: 100%;
          max-width: 190mm;
          margin: 0 auto;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 8mm;
          border-bottom: 2px solid #000;
          padding-bottom: 5mm;
        }
        .company-info h1 {
          margin: 0;
          font-size: 24px;
          font-weight: 800;
          color: #000;
          letter-spacing: 1px;
        }
        .company-info p {
          margin: 1px 0;
          color: #666;
        }
        .invoice-title {
          text-align: right;
        }
        .invoice-title h2 {
          margin: 0;
          font-size: 22px;
          color: #444;
          text-transform: uppercase;
        }
        .details-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10mm;
          margin-bottom: 8mm;
        }
        .bill-to h3 {
          margin: 0 0 2mm 0;
          font-size: 12px;
          text-transform: uppercase;
          color: #666;
          border-bottom: 1px solid #eee;
        }
        .bill-to p {
          margin: 1mm 0;
          font-size: 13px;
          font-weight: 600;
        }
        .meta-info table {
          width: 100%;
          border-collapse: collapse;
        }
        .meta-info td {
          padding: 1mm 0;
          font-size: 11px;
        }
        .meta-info td:first-child {
          font-weight: 700;
          color: #666;
          width: 40%;
        }
        table.items-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 8mm;
        }
        table.items-table th {
          background: #f8f9fa;
          padding: 3mm 2mm;
          text-align: left;
          border-bottom: 2px solid #000;
          text-transform: uppercase;
          font-size: 10px;
        }
        table.items-table td {
          padding: 3mm 2mm;
          border-bottom: 1px solid #eee;
          vertical-align: top;
        }
        .text-right {
          text-align: right;
        }
        .summary-container {
          display: flex;
          justify-content: flex-end;
        }
        .summary-table {
          width: 45%;
          border-collapse: collapse;
        }
        .summary-table td {
          padding: 1.5mm 2mm;
          font-size: 12px;
        }
        .summary-table td:first-child {
          text-align: right;
          color: #666;
        }
        .summary-table td:last-child {
          text-align: right;
          font-weight: 600;
          width: 40%;
        }
        .grand-total-row td {
          border-top: 1px solid #000;
          font-size: 15px !important;
          font-weight: 800 !important;
          color: #000;
          padding-top: 3mm;
        }
        .footer {
          margin-top: 15mm;
          padding-top: 5mm;
          border-top: 1px solid #eee;
          text-align: center;
          color: #999;
          font-size: 10px;
        }
        .barcode-section {
          margin-top: 10mm;
          text-align: center;
        }
        #sale-barcode {
          max-width: 60mm;
        }
      </style>
      <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"></script>
    </head>
    <body>
      <div class="invoice-container">
        <header class="header">
          <div class="company-info">
            <h1>KI FASHION</h1>
            <p>Quality Garments & Fashion</p>
          </div>
          <div class="invoice-title">
            <h2>Invoice</h2>
            <p># ${saleNumberText}</p>
          </div>
        </header>

        <section class="details-grid">
          <div class="bill-to">
            <h3>Bill To</h3>
            <p>${escapeHtml(receipt.customerName)}</p>
          </div>
          <div class="meta-info">
            <table>
              <tr>
                <td>Invoice Number:</td>
                <td>${saleNumberText}</td>
              </tr>
              <tr>
                <td>Invoice Date:</td>
                <td>${escapeHtml(printedAt)}</td>
              </tr>
              <tr>
                <td>Currency:</td>
                <td>£</td>
              </tr>
            </table>
          </div>
        </section>

        <table class="items-table">
          <thead>
            <tr>
              <th style="width: 50%;">Item / Description</th>
              <th class="text-right" style="width: 10%;">Qty</th>
              <th class="text-right" style="width: 20%;">Price</th>
              <th class="text-right" style="width: 20%;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemRows || '<tr><td colspan="4" style="text-align:center; padding: 10mm;">No items found</td></tr>'}
          </tbody>
        </table>

        <div class="summary-container">
          <table class="summary-table">
            <tr>
              <td>Subtotal</td>
              <td>${escapeHtml(formatMoney(receipt.subtotal))}</td>
            </tr>
            ${optionalLines}
            <tr class="grand-total-row">
              <td>Grand Total</td>
              <td>${escapeHtml(formatMoney(receipt.grandTotal))}</td>
            </tr>
            <tr>
              <td>Total Paid</td>
              <td>${escapeHtml(formatMoney(receipt.totalPaid))}</td>
            </tr>
            <tr style="color: #d93025; font-weight: bold;">
              <td>Balance Due</td>
              <td>${escapeHtml(formatMoney(receipt.remainingBalance))}</td>
            </tr>
          </table>
        </div>

        <div class="barcode-section">
          <svg id="sale-barcode"></svg>
        </div>

        <footer class="footer">
          <p>Thank you for your business!</p>
          <p>This is a computer-generated invoice from KI Fashion BMS.</p>
        </footer>
      </div>

      <script>
        (function () {
          var value = ${JSON.stringify(receipt.saleNumber || "")};
          var barcodeReady = false;

          try {
            if (window.JsBarcode && value) {
              window.JsBarcode("#sale-barcode", value, {
                format: "CODE128",
                displayValue: true,
                font: "monospace",
                fontSize: 12,
                height: 40,
                width: 1.5,
                margin: 0,
              });
              barcodeReady = true;
            }
          } catch (error) {
            barcodeReady = false;
          }

          if (!barcodeReady) {
            var fallbackEl = document.getElementById("barcode-fallback");
            var barcodeEl = document.getElementById("sale-barcode");
            if (barcodeEl) barcodeEl.style.display = "none";
            if (fallbackEl) fallbackEl.style.display = "block";
          }

          var printNow = function () {
            setTimeout(function () {
              window.focus();
              window.print();
              setTimeout(function () {
                window.close();
              }, 500);
            }, 500);
          };

          if (document.fonts && document.fonts.ready) {
            document.fonts.ready.then(printNow).catch(printNow);
          } else {
            printNow();
          }
        })();
      </script>
    </body>
    </html>
  `;
}

export function printSaleThermalReceipt(rawSale) {
  const receipt = normalizeSaleForReceipt(rawSale);
  if (!receipt) return false;

  const printWindow = window.open("", "_blank", "width=900,height=1000");
  if (!printWindow) return false;

  printWindow.document.open();
  printWindow.document.write(buildReceiptHtml(receipt));
  printWindow.document.close();

  return true;
}

export { normalizeSaleForReceipt };
