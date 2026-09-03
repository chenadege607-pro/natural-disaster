import { cn } from "@/lib/utils";
import { riskLabel, riskSoft, riskSolid, type RiskLevel } from "@/lib/risk";

type Props = {
  level: RiskLevel;
  label?: string;
  variant?: "solid" | "soft";
  className?: string;
};

export function RiskBadge({ level, label, variant = "soft", className }: Props) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold uppercase tracking-wide",
        variant === "solid" ? cn(riskSolid[level], "border-transparent") : riskSoft[level],
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          "size-2 rounded-full",
          variant === "solid" ? "bg-current opacity-80" : riskSolid[level].split(" ")[0],
        )}
      />
      {label ? `${label}: ${riskLabel[level]}` : riskLabel[level]}
    </span>
  );
}

export function RiskLegend({ className }: { className?: string }) {
  return (
    <ul className={cn("flex flex-wrap items-center gap-x-4 gap-y-2", className)}>
      {(["low", "moderate", "high", "severe"] as RiskLevel[]).map((level) => (
        <li key={level} className="flex items-center gap-2 text-xs font-medium">
          <span aria-hidden className={cn("size-3 rounded-sm", riskSolid[level].split(" ")[0])} />
          {riskLabel[level]}
        </li>
      ))}
    </ul>
  );
}
