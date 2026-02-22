import { CheckCircle, XCircle, AlertTriangle } from "lucide-react";

interface AuditCheckProps {
  label: string;
  value: boolean | number | string | null | undefined;
  type?: "boolean" | "score" | "time";
  suffix?: string;
  goodThreshold?: number;
  warnThreshold?: number;
}

export function AuditCheck({
  label,
  value,
  type = "boolean",
  suffix = "",
  goodThreshold = 70,
  warnThreshold = 40,
}: AuditCheckProps) {
  let status: "good" | "warn" | "bad";
  let displayValue: string;

  if (type === "boolean") {
    status = value ? "good" : "bad";
    displayValue = value ? "Si" : "No";
  } else if (type === "score") {
    const num = Number(value) || 0;
    if (num >= goodThreshold) status = "good";
    else if (num >= warnThreshold) status = "warn";
    else status = "bad";
    displayValue = `${num}${suffix}`;
  } else {
    // time - lower is better
    const num = Number(value) || 0;
    if (num <= (goodThreshold || 3)) status = "good";
    else if (num <= (warnThreshold || 5)) status = "warn";
    else status = "bad";
    displayValue = `${num.toFixed(1)}${suffix}`;
  }

  const colors = {
    good: { bg: "bg-emerald-500/10", text: "text-emerald-400", Icon: CheckCircle },
    warn: { bg: "bg-amber-500/10", text: "text-amber-400", Icon: AlertTriangle },
    bad: { bg: "bg-red-500/10", text: "text-red-400", Icon: XCircle },
  };

  const { bg, text, Icon } = colors[status];

  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md ${bg}`}>
        <Icon className={`h-3.5 w-3.5 ${text}`} />
        <span className={`text-xs font-medium ${text}`}>{displayValue}</span>
      </div>
    </div>
  );
}
