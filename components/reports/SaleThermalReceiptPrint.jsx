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
  return `GBP ${n.toFixed(2)}`;
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
      <title>Sale Receipt</title>
      <style>
        @page {
          size: 76mm auto;
          margin: 2mm;
        }
        * {
          box-sizing: border-box;
        }
        html,
        body {
          margin: 0;
          padding: 0;
          width: 72mm;
          background: #fff;
          color: #000;
          font-family: Consolas, "Courier New", Courier, monospace;
          font-size: 10px;
          line-height: 1.3;
        }
        .receipt {
          width: 72mm;
          padding: 1mm;
        }
        .center {
          text-align: center;
        }
        .title {
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.3px;
        }
        .meta,
        .customer,
        .footer {
          margin-top: 2mm;
          word-break: break-word;
        }
        .divider {
          margin: 2mm 0;
          border-top: 1px dashed #000;
        }
        .barcode {
          margin-top: 2mm;
          text-align: center;
          min-height: 44px;
        }
        .barcode svg {
          max-width: 100%;
          height: 38px;
        }
        .barcode-fallback {
          margin-top: 2mm;
          text-align: center;
          font-size: 10px;
          letter-spacing: 1px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
        }
        th,
        td {
          padding: 1mm 0.5mm;
          vertical-align: top;
        }
        thead th {
          border-top: 1px dashed #000;
          border-bottom: 1px dashed #000;
          font-weight: 700;
        }
        .item-name {
          width: 42%;
          word-break: break-word;
        }
        .item-num {
          width: 19%;
          text-align: right;
          white-space: nowrap;
        }
        .totals {
          margin-top: 2mm;
        }
        .line {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          margin: 0.5mm 0;
          gap: 8px;
        }
        .grand {
          font-weight: 700;
          font-size: 11px;
        }
      </style>
      <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"></script>
    </head>
    <body>
      <main class="receipt">
        <div class="center title">KI FASHION</div>
        <div class="center">Sales Receipt</div>
        <div class="meta center">Date: ${escapeHtml(printedAt)}</div>
        <div class="meta center">Sale No: ${saleNumberText}</div>

        <div class="barcode">
          <svg id="sale-barcode"></svg>
        </div>
        <div id="barcode-fallback" class="barcode-fallback" style="display:none;">${saleNumberText}</div>

        <div class="divider"></div>
        <div class="customer">Customer: ${escapeHtml(receipt.customerName)}</div>

        <table>
          <thead>
            <tr>
              <th class="item-name">Item</th>
              <th class="item-num">Qty</th>
              <th class="item-num">Unit</th>
              <th class="item-num">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemRows || '<tr><td colspan="4" class="center">No items</td></tr>'}
          </tbody>
        </table>

        <div class="divider"></div>

        <div class="totals">
          <div class="line"><span>Subtotal</span><span>${escapeHtml(formatMoney(receipt.subtotal))}</span></div>
          ${optionalLines}
          <div class="line grand"><span>Grand Total</span><span>${escapeHtml(formatMoney(receipt.grandTotal))}</span></div>
          <div class="line"><span>Cash</span><span>${escapeHtml(formatMoney(receipt.cashPayment))}</span></div>
          <div class="line"><span>Bank</span><span>${escapeHtml(formatMoney(receipt.bankPayment))}</span></div>
          <div class="line"><span>Paid</span><span>${escapeHtml(formatMoney(receipt.totalPaid))}</span></div>
          <div class="line"><span>Balance</span><span>${escapeHtml(formatMoney(receipt.remainingBalance))}</span></div>
        </div>

        <div class="divider"></div>
        <div class="footer center">Thank you</div>
      </main>

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
                fontSize: 10,
                height: 38,
                width: 1.25,
                margin: 0,
                textMargin: 2,
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
              }, 200);
            }, 180);
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

  const printWindow = window.open("", "_blank", "width=420,height=760");
  if (!printWindow) return false;

  printWindow.document.open();
  printWindow.document.write(buildReceiptHtml(receipt));
  printWindow.document.close();

  return true;
}

export { normalizeSaleForReceipt };
