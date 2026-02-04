import { useState, useRef } from "react";
import { createExpense } from "../api.ts";
import type { CreateExpensePayload } from "../api.ts";
import { savePending, clearPending } from "../pendingStorage.ts";

type Props = {
  onCreated: () => void;
};

function todayString(): string {
  return new Date().toISOString().slice(0, 10);
}

export function ExpenseForm({ onCreated }: Props) {
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(todayString());

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Store the pending idempotency key + payload so retry reuses them
  const pendingRef = useRef<{
    key: string;
    payload: CreateExpensePayload;
  } | null>(null);

  function validate(): string | null {
    if (!amount.trim()) return "Amount is required";
    if (!/^\d+(\.\d{1,2})?$/.test(amount.trim())) return "Amount must be a positive number (e.g. 199.50)";
    if (!category.trim()) return "Category is required";
    if (!date) return "Date is required";
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    // Generate fresh idempotency key + payload for a new submission
    const payload: CreateExpensePayload = {
      amount: amount.trim(),
      category: category.trim(),
      description: description.trim() || undefined,
      date,
    };
    const key = crypto.randomUUID();

    pendingRef.current = { key, payload };
    savePending(key, payload);
    await doSubmit(key, payload);
  }

  async function handleRetry() {
    if (submitting || !pendingRef.current) return;
    await doSubmit(pendingRef.current.key, pendingRef.current.payload);
  }

  async function doSubmit(key: string, payload: CreateExpensePayload) {
    setSubmitting(true);
    setError(null);

    try {
      await createExpense(payload, key);
      // Success: clear form and pending state
      pendingRef.current = null;
      clearPending();
      setAmount("");
      setCategory("");
      setDescription("");
      setDate(todayString());
      onCreated();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save expense");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="expense-form" onSubmit={handleSubmit}>
      <div className="form-row">
        <label>
          <span>Amount</span>
          <input
            type="text"
            inputMode="decimal"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            disabled={submitting}
          />
        </label>

        <label>
          <span>Category</span>
          <input
            type="text"
            placeholder="e.g. Food"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            disabled={submitting}
          />
        </label>

        <label>
          <span>Date</span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            disabled={submitting}
          />
        </label>
      </div>

      <div className="form-row">
        <label className="description-label">
          <span>Description</span>
          <input
            type="text"
            placeholder="Optional"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={submitting}
            maxLength={200}
          />
        </label>

        <button type="submit" className="submit-btn" disabled={submitting}>
          {submitting ? "Saving..." : "Add Expense"}
        </button>
      </div>

      {error && (
        <div className="form-error">
          <span>{error}</span>
          {pendingRef.current && !submitting && (
            <button type="button" className="retry-btn" onClick={handleRetry}>
              Retry
            </button>
          )}
        </div>
      )}
    </form>
  );
}
