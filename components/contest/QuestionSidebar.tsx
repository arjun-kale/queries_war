import { Check, X } from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export type QuestionStatus = "unattempted" | "correct" | "wrong";

export interface QuestionSummary {
  _id: Id<"questions">;
  order: number;
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
        <CardTitle className="text-sm">
          Questions{" "}
          <span className="text-muted-foreground">{questions.length}/15</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-5 gap-2 md:grid-cols-3">
        {questions.map((item, index) => {
          const status = statuses[item._id] ?? "unattempted";
          const isSelected = index === currentIndex;

          return (
            <button
              key={item._id}
              onClick={() => onSelectQuestion(index)}
              className={`relative flex size-11 items-center justify-center rounded-lg border text-sm font-medium transition-all ${
                isSelected
                  ? "border-primary bg-primary text-primary-foreground shadow-sm"
                  : status === "correct"
                    ? "border-primary/30 bg-primary/10 text-primary hover:bg-primary/20"
                    : status === "wrong"
                      ? "border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive/20"
                      : "bg-background hover:bg-muted"
              }`}
              aria-label={`Question ${index + 1}, ${status}`}
            >
              {index + 1}
              {status === "correct" && (
                <Check className="absolute -right-1 -top-1 size-3.5 rounded-full bg-background text-primary border border-primary/30" />
              )}
              {status === "wrong" && (
                <X className="absolute -right-1 -top-1 size-3.5 rounded-full bg-background text-destructive border border-destructive/30" />
              )}
            </button>
          );
        })}
      </CardContent>
    </Card>
  );
}
