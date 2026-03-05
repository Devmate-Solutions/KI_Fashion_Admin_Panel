"use client";

// Column order: [chevron] [image] [supplier] [product] [sku] [season] [size] [color] [stock] [cost] [value] [date]
// Spacer covers first 5 columns so badges align under their respective headers.

export default function InventoryExpandedRow({ row }) {
  const season = row.product?.season;
  const seasons = Array.isArray(season) ? season : season ? [season] : [];

  let sizes = [];
  const productSize = row.product?.size;
  if (Array.isArray(productSize) && productSize.length > 0) {
    sizes = productSize;
  } else if (productSize) {
    sizes = [productSize];
  } else if (
    row.raw?.variantComposition &&
    Array.isArray(row.raw.variantComposition) &&
    row.raw.variantComposition.length > 0
  ) {
    const sizeSet = new Set();
    row.raw.variantComposition.forEach((v) => { if (v.size) sizeSet.add(v.size); });
    sizes = Array.from(sizeSet);
  }

  let colors = [];
  const productColor = row.product?.color;
  if (Array.isArray(productColor) && productColor.length > 0) {
    colors = productColor;
  } else if (productColor) {
    colors = [productColor];
  } else if (
    row.raw?.variantComposition &&
    Array.isArray(row.raw.variantComposition) &&
    row.raw.variantComposition.length > 0
  ) {
    const colorSet = new Set();
    row.raw.variantComposition.forEach((v) => { if (v.color) colorSet.add(v.color); });
    colors = Array.from(colorSet);
  }

  const cellClass = "px-3 sm:px-4 py-2 bg-muted/5 align-top";

  return (
    <>
      {/* Spacer: chevron + image + supplier + product + sku */}
      <td colSpan={5} className="bg-muted/5 border-l-4 border-primary" />

      {/* Season — aligns with Season column */}
      <td className={cellClass}>
        {seasons.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {seasons.map((s, idx) => (
              <span key={idx} className="inline-block px-1.5 py-0.5 bg-purple-100 text-purple-800 rounded text-[10px] font-medium">
                {s}
              </span>
            ))}
          </div>
        ) : <span className="text-muted-foreground text-xs">—</span>}
      </td>

      {/* Size — aligns with Size column */}
      <td className={cellClass}>
        {sizes.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {sizes.map((s, idx) => (
              <span key={idx} className="inline-block px-1.5 py-0.5 bg-green-100 text-green-800 rounded text-[10px] font-medium">
                {s}
              </span>
            ))}
          </div>
        ) : <span className="text-muted-foreground text-xs">—</span>}
      </td>

      {/* Color — aligns with Color column */}
      <td className={cellClass}>
        {colors.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {colors.map((c, idx) => (
              <span key={idx} className="inline-block px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded text-[10px] font-medium">
                {c}
              </span>
            ))}
          </div>
        ) : <span className="text-muted-foreground text-xs">—</span>}
      </td>

      {/* Trailing spacer: stock + cost + value + date */}
      <td colSpan={4} className="bg-muted/5" />
    </>
  );
}
