import { Card, CardContent } from "@/components/ui/card";
import { ArrowUpRight, ArrowDownRight, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

const themes = {
  primary: {
    icon: "text-blue-600 bg-blue-50/50",
    glow: "group-hover:shadow-blue-500/10",
  },
  success: {
    icon: "text-emerald-600 bg-emerald-50/50",
    glow: "group-hover:shadow-emerald-500/10",
  },
  warning: {
    icon: "text-amber-600 bg-amber-50/50",
    glow: "group-hover:shadow-amber-500/10",
  },
  danger: {
    icon: "text-rose-600 bg-rose-50/50",
    glow: "group-hover:shadow-rose-500/10",
  },
  purple: {
    icon: "text-purple-600 bg-purple-50/50",
    glow: "group-hover:shadow-purple-500/10",
  },
};

export default function StatCard({
  label,
  value,
  icon: Icon,
  trend,
  trendValue,
  loading,
  color = "primary",
  onClick,
  description,
}) {
  if (loading) {
    return (
      <Card className="border-none shadow-sm bg-white/80 backdrop-blur-sm">
        <CardContent className="p-6">
          <div className="flex items-center justify-between pb-2">
            <div className="h-4 bg-slate-100 rounded w-20 animate-pulse" />
            <div className="h-10 w-10 bg-slate-50 rounded-lg animate-pulse" />
          </div>
          <div className="mt-2 h-10 bg-slate-100 rounded w-32 animate-pulse" />
          <div className="mt-4 h-4 bg-slate-100 rounded w-24 animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  const theme = themes[color] || themes.primary;

  return (
    <Card
      className={cn(
        "border border-slate-100/80 bg-white transition-all duration-300 cursor-pointer group overflow-hidden relative active:scale-[0.98]",
        theme.glow
      )}
      onClick={onClick}
    >
      <div
        className={cn(
          "absolute -right-4 -top-4 w-24 h-24 rounded-full opacity-[0.03] transition-transform duration-500 group-hover:scale-150",
          theme.icon
        )}
      />

      <CardContent className="p-6 relative z-10">
        <div className="flex items-center justify-between space-y-0 pb-2">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              {label}
            </p>
            {description && (
              <p className="text-[10px] text-slate-400 mt-0.5">{description}</p>
            )}
          </div>
          <div
            className={cn(
              "p-2.5 rounded-lg transition-all duration-300 group-hover:rotate-12 group-hover:scale-110",
              theme.icon
            )}
          >
            <Icon className="h-5 w-5 transition-transform duration-300" />
          </div>
        </div>

        <div className="flex items-baseline justify-between mt-3">
          <h3 className="text-3xl font-black tracking-tight text-slate-900 leading-none">
            {value}
          </h3>
        </div>

        {trendValue ? (
          <div className="flex items-center mt-5">
            <div
              className={cn(
                "flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold",
                trend === "up"
                  ? "text-emerald-700 bg-emerald-50"
                  : "text-rose-700 bg-rose-50"
              )}
            >
              {trend === "up" ? (
                <ArrowUpRight className="h-3 w-3 mr-0.5" />
              ) : (
                <ArrowDownRight className="h-3 w-3 mr-0.5" />
              )}
              {trendValue}
            </div>
            <span className="text-[10px] text-slate-400 ml-2 font-medium">
              this week
            </span>
          </div>
        ) : (
          <div className="flex items-center mt-5 text-[10px] text-slate-400 font-medium group-hover:text-slate-600 transition-colors">
            View details{" "}
            <ArrowRight className="h-3 w-3 ml-1 group-hover:translate-x-1 transition-transform" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
