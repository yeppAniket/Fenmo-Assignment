import { useState, useEffect } from "react";
import { createExpense } from "../api.ts";
import { loadPending, clearPending } from "../pendingStorage.ts";
import type { PendingExpense } from "../pendingStorage.ts";

type Props = {
  onResolved: () => void;
};

export function PendingBanner({ onResolved }: Props) {
  const [pending, setPending] = useState<PendingExpense | null>(null);
  const [retrying, setRetrying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setPending(loadPending());
  }, []);

  if (!pending) return null;

  async function handleRetry() {
    if (retrying || !pending) return;
    setRetrying(true);
    setError(null);

    try {
      await createExpense(pending.payload, pending.idempotencyKey);
      clearPending();
      setPending(null);
      onResolved();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Retry failed");
    } finally {
      setRetrying(false);
    }
  }

  function handleDismiss() {
    clearPending();
    setPending(null);
  }

  return (
    <div className="pending-banner">
      <div className="pending-banner-text">
        <strong>Unfinished submission</strong>
        <span>
          {pending.payload.amount} &middot; {pending.payload.category} &middot;{" "}
          {pending.payload.date}
        </span>
      </div>
      <div className="pending-banner-actions">
        <button
          className="retry-btn"
          onClick={handleRetry}
          disabled={retrying}
        >
          {retrying ? "Retrying..." : "Retry"}
        </button>
        <button
          className="dismiss-btn"
          onClick={handleDismiss}
          disabled={retrying}
        >
          Dismiss
        </button>
      </div>
      {error && <p className="pending-banner-error">{error}</p>}
    </div>
  );
}
