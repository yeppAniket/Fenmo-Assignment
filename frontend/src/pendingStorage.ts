import type { CreateExpensePayload } from "./api.ts";

const STORAGE_KEY = "pendingExpense";

export type PendingExpense = {
  idempotencyKey: string;
  payload: CreateExpensePayload;
  createdAt: string;
};

export function savePending(idempotencyKey: string, payload: CreateExpensePayload): void {
  const entry: PendingExpense = {
    idempotencyKey,
    payload,
    createdAt: new Date().toISOString(),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entry));
}

export function clearPending(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function loadPending(): PendingExpense | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PendingExpense;
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}
