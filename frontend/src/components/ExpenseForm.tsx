import { useState, useRef } from "react";
import { createExpense } from "../api.ts";
import type { CreateExpensePayload } from "../api.ts";
import { savePending, clearPending } from "../pendingStorage.ts";
import { Input, Button, Banner } from "../ui/index.ts";

type Props = {
  user: string;
  onCreated: () => void;
};

function todayString(): string {
  return new Date().toISOString().slice(0, 10);
}

export function ExpenseForm({ user, onCreated }: Props) {
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
      user,
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
    <form className="expense-form" onSubmit={handleSubmit} noValidate>
      <div className="form-title">Add New Expense</div>
      <div className="form-row">
        <Input
          id="expense-amount"
          label="Amount"
          type="text"
          inputMode="decimal"
          placeholder="0.00"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          disabled={submitting}
          required
        />

        <Input
          id="expense-category"
          label="Category"
          type="text"
          placeholder="e.g. Food"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          disabled={submitting}
          required
        />

        <Input
          id="expense-date"
          label="Date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          disabled={submitting}
          required
        />
      </div>

      <div className="form-row">
        <Input
          id="expense-description"
          label="Description"
          className="description-label"
          type="text"
          placeholder="Optional"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={submitting}
          maxLength={200}
        />

        <Button type="submit" loading={submitting}>
          {submitting ? "Saving..." : "Add Expense"}
        </Button>
      </div>

      {error && (
        <Banner
          variant="error"
          action={
            pendingRef.current && !submitting ? (
              <Button variant="danger" onClick={handleRetry}>Retry</Button>
            ) : undefined
          }
        >
          {error}
        </Banner>
      )}
    </form>
  );
}
