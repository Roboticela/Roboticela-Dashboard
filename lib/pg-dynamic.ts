import { Client } from "pg";

export type QueryResult = {
  rows: Record<string, unknown>[];
  rowCount: number;
  fields?: { name: string; dataTypeID: number }[];
};

/**
 * Run a query against an arbitrary PostgreSQL connection URL.
 * Use for the database manager only (user-provided connections).
 */
export async function runQuery(
  connectionUrl: string,
  query: string,
  values?: unknown[]
): Promise<QueryResult> {
  const client = new Client({ connectionString: connectionUrl });
  try {
    await client.connect();
    const result = values?.length
      ? await client.query(query, values)
      : await client.query(query);
    const fields = result.fields?.map((f) => ({
      name: f.name,
      dataTypeID: f.dataTypeID,
    }));
    return {
      rows: (result.rows as Record<string, unknown>[]) ?? [],
      rowCount: result.rowCount ?? 0,
      fields,
    };
  } finally {
    await client.end();
  }
}

/** Escape identifier for use in raw SQL (e.g. table/column names). */
export function quoteId(name: string): string {
  return `"${String(name).replace(/"/g, '""')}"`;
}

export type TableInfo = { tableName: string; columns: { name: string; type: string }[] };

/**
 * List tables and their columns for a given PostgreSQL connection (public schema).
 */
export async function getSchema(connectionUrl: string): Promise<TableInfo[]> {
  const client = new Client({ connectionString: connectionUrl });
  try {
    await client.connect();
    const tablesRes = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    const tables: TableInfo[] = [];
    for (const row of tablesRes.rows as { table_name: string }[]) {
      const colsRes = await client.query(
        `SELECT column_name, data_type
         FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = $1
         ORDER BY ordinal_position`,
        [row.table_name]
      );
      tables.push({
        tableName: row.table_name,
        columns: (colsRes.rows as { column_name: string; data_type: string }[]).map((c) => ({
          name: c.column_name,
          type: c.data_type,
        })),
      });
    }
    return tables;
  } finally {
    await client.end();
  }
}

/**
 * Get column names and data types for a table (public schema).
 */
export async function getTableColumns(
  connectionUrl: string,
  tableName: string
): Promise<{ name: string; type: string }[]> {
  const client = new Client({ connectionString: connectionUrl });
  try {
    await client.connect();
    const res = await client.query(
      `SELECT column_name, data_type
       FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = $1
       ORDER BY ordinal_position`,
      [tableName]
    );
    return (res.rows as { column_name: string; data_type: string }[]).map((c) => ({
      name: c.column_name,
      type: c.data_type,
    }));
  } finally {
    await client.end();
  }
}

/**
 * Get primary key column names for a table (public schema), in order.
 */
export async function getPrimaryKey(connectionUrl: string, tableName: string): Promise<string[]> {
  const client = new Client({ connectionString: connectionUrl });
  try {
    await client.connect();
    const res = await client.query(
      `SELECT a.attname
       FROM pg_index i
       JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey) AND a.attisdropped = false
       JOIN pg_class c ON c.oid = i.indrelid
       JOIN pg_namespace n ON n.oid = c.relnamespace
       WHERE n.nspname = 'public' AND c.relname = $1 AND i.indisprimary
       ORDER BY array_position(i.indkey, a.attnum)`,
      [tableName]
    );
    return (res.rows as { attname: string }[]).map((r) => r.attname);
  } finally {
    await client.end();
  }
}

/**
 * Mask a connection URL for display (hide password).
 */
export function maskConnectionUrl(url: string): string {
  try {
    const u = new URL(url);
    if (u.password) u.password = "****";
    return u.toString();
  } catch {
    return "***";
  }
}
