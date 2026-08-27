import { Check, CircleAlert } from "lucide-react";
import type { QueryResult } from "@/lib/sqlRunner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function ResultTable({ result }: { result: QueryResult }) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="py-4 border-b bg-muted/20">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          {result.success ? (
            <>
              <Check className="size-4 text-primary" />
              <span>Query result</span>
            </>
          ) : (
            <>
              <CircleAlert className="size-4 text-destructive" />
              <span>Query error</span>
            </>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="overflow-auto p-4">
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
                    <th key={key} className="px-3 py-2 font-semibold text-muted-foreground">
                      {key}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.rows.map((row, rowIndex) => (
                  <tr key={rowIndex} className="border-b last:border-0 even:bg-muted/20 hover:bg-muted/40">
                    {Object.values(row).map((value, cellIndex) => (
                      <td key={cellIndex} className="whitespace-nowrap px-3 py-2 font-mono">
                        {value === null ? (
                          <span className="italic text-muted-foreground">NULL</span>
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
      </CardContent>
    </Card>
  );
}
