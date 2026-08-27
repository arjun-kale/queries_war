import { Check, CircleAlert, Info } from "lucide-react";
import type { QueryResult } from "@/lib/sqlRunner";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export interface FixtureSummary {
  fixtureIndex: number;
  success: boolean;
  error?: string;
  rowCount?: number;
}

export function ResultTable({
  result,
  fixtureSummaries,
}: {
  result: QueryResult;
  fixtureSummaries?: FixtureSummary[];
}) {
  const allFixturesOk =
    fixtureSummaries && fixtureSummaries.every((f) => f.success);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="py-3.5 border-b bg-muted/20 flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          {result.success ? (
            <>
              <Check className="size-4 text-primary" />
              <span>Query preview result</span>
            </>
          ) : (
            <>
              <CircleAlert className="size-4 text-destructive" />
              <span>Query error</span>
            </>
          )}
        </CardTitle>

        {fixtureSummaries && fixtureSummaries.length > 1 && (
          <Badge
            variant={allFixturesOk ? "secondary" : "destructive"}
            className="text-xs font-mono"
          >
            {fixtureSummaries.filter((f) => f.success).length} /{" "}
            {fixtureSummaries.length} test fixtures ran OK
          </Badge>
        )}
      </CardHeader>

      <CardContent className="space-y-3 p-4">
        {result.error ? (
          <p className="rounded-md bg-destructive/10 p-3 text-xs font-mono text-destructive">
            {result.error}
          </p>
        ) : result.rows && result.rows.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-xs">
              <thead>
                <tr className="border-b bg-muted/40">
                  {Object.keys(result.rows[0]).map((key) => (
                    <th
                      key={key}
                      className="px-3 py-2 font-semibold text-muted-foreground"
                    >
                      {key}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.rows.map((row, rowIndex) => (
                  <tr
                    key={rowIndex}
                    className="border-b last:border-0 even:bg-muted/20 hover:bg-muted/40"
                  >
                    {Object.values(row).map((value, cellIndex) => (
                      <td
                        key={cellIndex}
                        className="whitespace-nowrap px-3 py-2 font-mono"
                      >
                        {value === null ? (
                          <span className="italic text-muted-foreground">
                            NULL
                          </span>
                        ) : (
                          String(value)
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground py-2">
            Query executed successfully but returned 0 rows.
          </p>
        )}

        <div className="flex items-start gap-2 rounded-md bg-muted/40 p-2.5 text-xs text-muted-foreground">
          <Info className="size-4 shrink-0 mt-0.5 text-primary" />
          <span>
            Preview runs client-side against the sample schema to verify your SQL syntax and output columns. Final points are awarded by the authoritative server evaluation upon submission.
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
