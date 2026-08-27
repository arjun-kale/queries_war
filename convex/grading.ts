"use node";

import initSqlJs, { type Database } from "sql.js";
import crypto from "crypto";
import { SQL_WASM_BASE64 } from "./sqlWasmBinary";

const QUERY_TIMEOUT_MS = 3_000;
type SqlValue = string | number | Uint8Array | null;

let sqlJsPromise: ReturnType<typeof initSqlJs> | undefined;

function loadSqlJs() {
  if (!sqlJsPromise) {
    // Convex bundles Node actions into their own directory, so sql.js's
    // default `__dirname`-relative lookup for sql-wasm.wasm 404s at
    // runtime (ENOENT: /var/task/sql-wasm.wasm). Passing the binary
    // directly skips that filesystem/network lookup entirely.
    const wasmBinary = Buffer.from(SQL_WASM_BASE64, "base64");
    sqlJsPromise = initSqlJs({ wasmBinary });
  }
  return sqlJsPromise;
}

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);

  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, stableValue(entry)]),
    );
  }

  return value;
}

function normalizedRows(rows: Record<string, SqlValue>[]) {
  return rows.map((row) => stableValue(row));
}

export function hashResult(rows: Record<string, SqlValue>[]) {
  const normalized = JSON.stringify(normalizedRows(rows));
  return crypto.createHash("sha256").update(normalized).digest("hex");
}

function readRows(database: Database, userQuery: string) {
  const result = database.exec(userQuery)[0];
  if (!result) return [];

  return result.values.map((values: SqlValue[]) =>
    Object.fromEntries(
      result.columns.map((column: string, index: number) => [column, values[index] ?? null]),
    ),
  ) as Record<string, SqlValue>[];
}

export async function executeAndGrade(
  seedDataSql: string,
  userQuery: string,
  expectedHash: string,
): Promise<{ isCorrect: boolean; error?: string; computedHash?: string }> {
  let database: Database | undefined;
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  try {
    const timeout = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(
        () => reject(new Error("Query timed out after 3 seconds.")),
        QUERY_TIMEOUT_MS,
      );
    });

    const execution = (async () => {
      const SQL = await loadSqlJs();
      database = new SQL.Database();
      database.exec(seedDataSql);

      const startedAt = Date.now();
      const rows = readRows(database, userQuery);
      if (Date.now() - startedAt > QUERY_TIMEOUT_MS) {
        throw new Error("Query timed out after 3 seconds.");
      }

      const computedHash = hashResult(rows);
      return { isCorrect: computedHash === expectedHash, computedHash };
    })();

    const result = await Promise.race([execution, timeout]);
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { isCorrect: false, error: message };
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
    database?.close();
  }
}
