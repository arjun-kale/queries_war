"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ChevronRight, Database, Table as TableIcon } from "lucide-react";
import { introspectSchema, type TableSchema } from "@/lib/sqlRunner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function SchemaDrawer({ seedSql }: { seedSql: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [tables, setTables] = useState<TableSchema[]>([]);
  const [selectedTable, setSelectedTable] = useState<string>();

  useEffect(() => {
    let isCancelled = false;

    introspectSchema(seedSql).then((res) => {
      if (!isCancelled) {
        setTables(res);
        if (res.length > 0) {
          setSelectedTable((prev) => (res.some((t) => t.tableName === prev) ? prev : res[0].tableName));
        } else {
          setSelectedTable(undefined);
        }
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [seedSql]);

  const activeTable = tables.find((t) => t.tableName === selectedTable) ?? tables[0];

  if (tables.length === 0) return null;

  return (
    <Card className="overflow-hidden border-border/80 bg-card/60 backdrop-blur-sm">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-3.5 h-auto font-medium text-xs hover:bg-muted/50 rounded-none"
      >
        <div className="flex items-center gap-2">
          <Database className="size-4 text-primary" />
          <span>Interactive Schema & Sample Data</span>
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-mono font-normal">
            {tables.length} {tables.length === 1 ? "table" : "tables"}
          </Badge>
        </div>
        <div className="flex items-center gap-1 text-muted-foreground text-xs font-normal">
          <span>{isOpen ? "Hide sample rows" : "View tables & sample rows"}</span>
          {isOpen ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
        </div>
      </Button>

      {isOpen && (
        <CardContent className="p-4 pt-2 border-t space-y-3 bg-muted/10">
          {/* Table selector tabs */}
          <div className="flex flex-wrap items-center gap-1.5">
            {tables.map((t) => (
              <Button
                key={t.tableName}
                size="sm"
                variant={t.tableName === activeTable?.tableName ? "default" : "outline"}
                onClick={() => setSelectedTable(t.tableName)}
                className={cn(
                  "h-7 text-xs font-mono px-2.5 rounded-md",
                  t.tableName === activeTable?.tableName && "shadow-none",
                )}
              >
                <TableIcon className="size-3 mr-1.5" />
                {t.tableName}
              </Button>
            ))}
          </div>

          {activeTable && (
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                <span className="font-semibold text-foreground font-mono">
                  {activeTable.tableName}
                </span>
                <span>columns:</span>
                {activeTable.columns.map((col) => (
                  <Badge
                    key={col}
                    variant="outline"
                    className="font-mono text-[11px] px-1.5 py-0 bg-background"
                  >
                    {col}
                  </Badge>
                ))}
              </div>

              {activeTable.sampleRows.length > 0 ? (
                <div className="overflow-x-auto rounded-lg border bg-background">
                  <table className="min-w-full text-left text-[11px]">
                    <thead>
                      <tr className="border-b bg-muted/40 font-mono text-muted-foreground">
                        {activeTable.columns.map((col) => (
                          <th key={col} className="px-2.5 py-1.5 font-medium">
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60 font-mono">
                      {activeTable.sampleRows.map((row, idx) => (
                        <tr key={idx} className="hover:bg-muted/30">
                          {activeTable.columns.map((col) => (
                            <td
                              key={col}
                              className="whitespace-nowrap px-2.5 py-1.5 text-foreground/90"
                            >
                              {row[col] === null ? (
                                <span className="italic text-muted-foreground">NULL</span>
                              ) : (
                                String(row[col])
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic py-1">
                  Table is empty or has no initial rows.
                </p>
              )}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
