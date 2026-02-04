import { useEffect, useState } from "react";
import { fetchExpenses } from "./api.ts";
import type { Expense } from "./api.ts";
import { ExpenseTable } from "./components/ExpenseTable.tsx";
import { TotalDisplay } from "./components/TotalDisplay.tsx";

export function ExpensesPage() {
  const [items, setItems] = useState<Expense[]>([]);
  const [totalPaise, setTotalPaise] = useState(0);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    setLoading(true);
    setError(null);

    fetchExpenses({ signal: controller.signal })
      .then((data) => {
        setItems(data.items);
        setTotalPaise(data.total_paise);
        setCount(data.count);
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(err instanceof Error ? err.message : "Failed to load expenses");
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, []);

  return (
    <div className="expenses-page">
      <h1>Expense Tracker</h1>

      {loading && <p className="status-message">Loading expenses...</p>}

      {error && (
        <div className="error-banner">
          <p>{error}</p>
          <button onClick={() => window.location.reload()}>Retry</button>
        </div>
      )}

      {!loading && !error && (
        <>
          <TotalDisplay totalPaise={totalPaise} count={count} />
          <ExpenseTable items={items} />
        </>
      )}
    </div>
  );
}
