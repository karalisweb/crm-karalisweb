/**
 * Lettura di un file SQLite in **sola lettura**.
 *
 * `node:sqlite` fa parte di Node: nessuna dipendenza nuova, nessun modulo
 * nativo da compilare. Il file viene aperto con `readOnly: true`, quindi
 * l'applicazione di origine non può essere alterata nemmeno per errore.
 */
interface StatementSqlite { all(...p: unknown[]): unknown[] }
interface DatabaseSqlite {
  prepare(sql: string): StatementSqlite;
  close(): void;
}
type ModuloSqlite = {
  DatabaseSync: new (path: string, opts?: { readOnly?: boolean }) => DatabaseSqlite;
};

export async function leggiSqlite<T>(
  percorso: string,
  fn: (query: (sql: string, ...p: unknown[]) => unknown[]) => T,
): Promise<T> {
  // Import dinamico con specificatore calcolato: `node:sqlite` non ha ancora
  // dichiarazioni di tipo in @types/node, e non vogliamo aggiungere una
  // dipendenza solo per leggere due file.
  const nome = "node:sqlite";
  const { DatabaseSync } = (await import(/* webpackIgnore: true */ nome)) as ModuloSqlite;
  const db = new DatabaseSync(percorso, { readOnly: true });
  try {
    return fn((sql, ...p) => db.prepare(sql).all(...(p as never[])) as unknown[]);
  } finally {
    db.close();
  }
}
