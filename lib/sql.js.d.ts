declare module "sql.js" {
  type SqlValue = string | number | Uint8Array | null;

  export interface QueryResult {
    columns: string[];
    values: SqlValue[][];
  }

  export interface Database {
    exec(sql: string): QueryResult[];
    close(): void;
  }

  export interface SqlJsStatic {
    Database: new () => Database;
  }

  interface InitSqlJsOptions {
    locateFile?: (file: string) => string;
  }

  const initSqlJs: (options?: InitSqlJsOptions) => Promise<SqlJsStatic>;
  export default initSqlJs;
}
