"use client";

/**
 * TruncatedBadgeList — renders up to `max` badges inline,
 * then a muted "+N" chip with a tooltip showing the rest.
 */
export default function TruncatedBadgeList({
  items = [],
  max = 3,
  colorClass = "bg-blue-100 text-blue-800",
}) {
  if (!items || items.length === 0) {
    return <span className="text-muted-foreground">—</span>;
  }

  const visible = items.slice(0, max);
  const remaining = items.length - max;

  return (
    <div className="flex items-center gap-1 flex-nowrap">
      {visible.map((item, idx) => (
        <span
          key={idx}
          className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium whitespace-nowrap ${colorClass}`}
        >
          {item}
        </span>
      ))}
      {remaining > 0 && (
        <span
          className="inline-block px-1.5 py-0.5 rounded text-[10px] font-medium whitespace-nowrap bg-muted text-muted-foreground cursor-default"
          title={items.slice(max).join(", ")}
        >
          +{remaining}
        </span>
      )}
    </div>
  );
}
