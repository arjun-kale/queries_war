import initSqlJs, { type Database } from "sql.js";

const QUERY_TIMEOUT_MS = 3_000;

type SqlValue = string | number | Uint8Array | null;

export type QueryResult = {
  success: boolean;
  rows?: Record<string, SqlValue>[];
  error?: string;
  resultHash?: string;
};

export type QueryFixture = {
  seedDataSql: string;
  expectedResultHash: string;
};

export type FixtureResult = QueryResult & {
  fixtureIndex: number;
};

let sqlJsPromise: ReturnType<typeof initSqlJs> | undefined;

function loadSqlJs() {
  if (!sqlJsPromise) {
    const wasmUrl = new URL("sql.js/dist/sql-wasm.wasm", import.meta.url).toString();
    sqlJsPromise = initSqlJs({ locateFile: () => wasmUrl });
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

async function hashResult(rows: Record<string, SqlValue>[]) {
  const normalized = JSON.stringify(normalizedRows(rows));
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(normalized),
  );

  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

function readRows(database: Database, userQuery: string) {
  const result = database.exec(userQuery)[0];
  if (!result) return [];

  return result.values.map((values) =>
    Object.fromEntries(
      result.columns.map((column, index) => [column, values[index] ?? null]),
    ),
  ) as Record<string, SqlValue>[];
}

function friendlyError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return `We couldn’t run that query. Check your SQL and try again${message ? `: ${message}` : "."}`;
}

/** Runs a submitted SQLite query against a fresh, browser-local database. */
export async function runQuery(
  seedSql: string,
  userQuery: string,
): Promise<QueryResult> {
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
      database.exec(seedSql);

      const startedAt = performance.now();
      const rows = readRows(database, userQuery);
      if (performance.now() - startedAt > QUERY_TIMEOUT_MS) {
        throw new Error("Query timed out after 3 seconds.");
      }

      return { rows, resultHash: await hashResult(rows) };
    })();

    const result = await Promise.race([execution, timeout]);
    return { success: true, rows: result.rows, resultHash: result.resultHash };
  } catch (error) {
    return { success: false, error: friendlyError(error) };
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
    database?.close();
  }
}

/** Runs a query against every contest fixture and passes only if all pass. */
export async function runQueryAgainstFixtures(
  fixtures: QueryFixture[],
  userQuery: string,
): Promise<{ success: boolean; passed: boolean; results: FixtureResult[]; error?: string }> {
  const results: FixtureResult[] = [];

  for (const [fixtureIndex, fixture] of fixtures.entries()) {
    const result = await runQuery(fixture.seedDataSql, userQuery);
    const fixtureResult = { ...result, fixtureIndex };
    results.push(fixtureResult);

    if (!result.success) {
      return { success: false, passed: false, results, error: result.error };
    }
  }

  return {
    success: true,
    passed: results.every(
      (result, index) => result.resultHash === fixtures[index].expectedResultHash,
    ),
    results,
  };
}

export type TableSchema = {
  tableName: string;
  columns: string[];
  sampleRows: Record<string, SqlValue>[];
};

/** Introspects tables and sample rows from seed SQL for previewing schema in the UI */
export async function introspectSchema(seedSql: string): Promise<TableSchema[]> {
  let database: Database | undefined;
  try {
    const SQL = await loadSqlJs();
    database = new SQL.Database();
    database.exec(seedSql);

    const tablesQuery = database.exec(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';",
    )[0];
    if (!tablesQuery || !tablesQuery.values) return [];

    const tables: TableSchema[] = [];
    for (const val of tablesQuery.values) {
      const tableName = String(val[0]);
      const sampleRes = database.exec(`SELECT * FROM "${tableName}" LIMIT 5;`)[0];
      if (sampleRes) {
        const columns = sampleRes.columns;
        const sampleRows = sampleRes.values.map((values) =>
          Object.fromEntries(
            columns.map((col, idx) => [col, values[idx] ?? null]),
          ),
        ) as Record<string, SqlValue>[];
        tables.push({ tableName, columns, sampleRows });
      } else {
        const pragma = database.exec(`PRAGMA table_info("${tableName}");`)[0];
        const columns = pragma ? pragma.values.map((v) => String(v[1])) : [];
        tables.push({ tableName, columns, sampleRows: [] });
      }
    }
    return tables;
  } catch {
    return [];
  } finally {
    database?.close();
  }
}
