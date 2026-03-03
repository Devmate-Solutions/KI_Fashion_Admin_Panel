import { cn } from "@/lib/utils";

const themes = {
  blue: "from-blue-500 to-indigo-600 shadow-blue-200 text-white hover:shadow-blue-300",
  purple: "from-purple-500 to-violet-600 shadow-purple-200 text-white hover:shadow-purple-300",
  emerald: "from-emerald-500 to-teal-600 shadow-emerald-200 text-white hover:shadow-emerald-300",
  slate: "from-slate-700 to-slate-900 shadow-slate-200 text-white hover:shadow-slate-300",
};

export default function QuickAction({
  label,
  icon: Icon,
  onClick,
  color = "blue",
  description,
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-start gap-3 p-5 rounded-lg bg-gradient-to-br transition-all duration-300 active:scale-[0.98] text-left group overflow-hidden relative w-full",
        themes[color] || themes.blue
      )}
    >
      <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
        <Icon className="h-24 w-24" />
      </div>
      <div className="p-2 rounded-lg bg-white/20 backdrop-blur-md">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <span className="font-bold text-base block">{label}</span>
        {description && (
          <span className="text-[11px] text-white/70 block mt-0.5 leading-tight">
            {description}
          </span>
        )}
      </div>
    </button>
  );
}
