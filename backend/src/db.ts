import Database from "better-sqlite3";
import path from "node:path";

const SCHEMA = `
CREATE TABLE IF NOT EXISTS expenses (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  amount_paise    INTEGER NOT NULL CHECK(amount_paise >= 0),
  category        TEXT    NOT NULL,
  description     TEXT    NOT NULL DEFAULT '',
  date            TEXT    NOT NULL,
  created_at      TEXT    NOT NULL,
  idempotency_key TEXT    NOT NULL UNIQUE
);

CREATE INDEX IF NOT EXISTS expenses_date_idx     ON expenses(date DESC);
CREATE INDEX IF NOT EXISTS expenses_category_idx ON expenses(category);
`;

export function createDb(dbPath?: string): Database.Database {
  const defaultPath = process.env.DB_PATH ?? path.join(process.cwd(), "expenses.db");
  const resolvedPath = dbPath ?? defaultPath;
  const db = new Database(resolvedPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(SCHEMA);
  return db;
}

export type ExpenseRow = {
  id: number;
  amount_paise: number;
  category: string;
  description: string;
  date: string;
  created_at: string;
  idempotency_key: string;
};
