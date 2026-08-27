import { Clock3 } from "lucide-react";

export function ContestTimer({ remaining }: { remaining?: number }) {
  const formattedTime =
    remaining === undefined
      ? "--:--"
      : `${String(Math.floor(remaining / 60_000)).padStart(2, "0")}:${String(
          Math.floor((remaining % 60_000) / 1_000),
        ).padStart(2, "0")}`;

  const isUrgent = remaining !== undefined && remaining < 300_000;

  return (
    <div
      className={`flex items-center gap-2 rounded-full border px-4 py-2 font-mono font-semibold transition-colors ${
        isUrgent
          ? "border-destructive/40 bg-destructive/10 text-destructive animate-pulse"
          : "border-border bg-background text-primary"
      }`}
    >
      <Clock3 className="size-4" />
      <span>{formattedTime}</span>
    </div>
  );
}
