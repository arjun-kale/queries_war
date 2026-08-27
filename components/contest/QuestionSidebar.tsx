import { Check, X } from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type QuestionStatus = "unattempted" | "correct" | "wrong";

export interface QuestionSummary {
  _id: Id<"questions">;
  order: number;
  difficulty?: "easy" | "medium" | "hard";
  points?: number;
}

export function QuestionSidebar({
  questions,
  currentIndex,
  statuses,
  onSelectQuestion,
}: {
  questions: QuestionSummary[];
  currentIndex: number;
  statuses: Record<string, QuestionStatus>;
  onSelectQuestion: (index: number) => void;
}) {
  return (
    <Card className="h-fit">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">Questions</CardTitle>
          <span className="text-xs font-mono text-muted-foreground">
            {questions.length} total
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-5 gap-2 md:grid-cols-3">
          {questions.map((item, index) => {
            const status = statuses[item._id] ?? "unattempted";
            const isSelected = index === currentIndex;
            const diffColor =
              item.difficulty === "easy"
                ? "bg-emerald-500"
                : item.difficulty === "medium"
                  ? "bg-amber-500"
                  : "bg-rose-500";

            return (
              <button
                key={item._id}
                onClick={() => onSelectQuestion(index)}
                className={`relative flex size-11 flex-col items-center justify-center rounded-lg border text-sm font-medium transition-all ${
                  isSelected
                    ? "border-primary bg-primary text-primary-foreground shadow-sm"
                    : status === "correct"
                      ? "border-primary/30 bg-primary/10 text-primary hover:bg-primary/20"
                      : status === "wrong"
                        ? "border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive/20"
                        : "bg-background hover:bg-muted"
                }`}
                aria-label={`Question ${index + 1}, ${item.difficulty ?? "normal"}, ${status}`}
              >
                <span>{index + 1}</span>

                {/* Difficulty indicator dot */}
                {item.difficulty && (
                  <span
                    className={cn(
                      "size-1 rounded-full absolute bottom-1 transition-opacity",
                      diffColor,
                      isSelected && "bg-primary-foreground/80",
                    )}
                  />
                )}

                {status === "correct" && (
                  <Check className="absolute -right-1 -top-1 size-3.5 rounded-full bg-background text-primary border border-primary/30" />
                )}
                {status === "wrong" && (
                  <X className="absolute -right-1 -top-1 size-3.5 rounded-full bg-background text-destructive border border-destructive/30" />
                )}
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-between border-t pt-2.5 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="size-2 rounded-full bg-emerald-500" /> Easy
          </span>
          <span className="flex items-center gap-1">
            <span className="size-2 rounded-full bg-amber-500" /> Med
          </span>
          <span className="flex items-center gap-1">
            <span className="size-2 rounded-full bg-rose-500" /> Hard
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
