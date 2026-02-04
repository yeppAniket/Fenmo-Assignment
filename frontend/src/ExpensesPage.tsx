import { useCallback, useEffect, useState } from "react";
import { fetchExpenses } from "./api.ts";
import type { Expense } from "./api.ts";
import { ExpenseForm } from "./components/ExpenseForm.tsx";
import { ExpenseTable } from "./components/ExpenseTable.tsx";
import { FilterSortControls } from "./components/FilterSortControls.tsx";
import { TotalDisplay } from "./components/TotalDisplay.tsx";

export function ExpensesPage() {
  const [items, setItems] = useState<Expense[]>([]);
  const [totalPaise, setTotalPaise] = useState(0);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [category, setCategory] = useState("");
  const [sort, setSort] = useState("date_desc");

  // Track all known categories (fetched without filter)
  const [categories, setCategories] = useState<string[]>([]);

  // Fetch full list once to populate category dropdown
  useEffect(() => {
    fetchExpenses()
      .then((data) => {
        const cats = [...new Set(data.items.map((e) => e.category))].sort();
        setCategories(cats);
      })
      .catch(() => {
        // Silently fail — dropdown just won't have options
      });
  }, []);

  const loadExpenses = useCallback(
    (signal?: AbortSignal) => {
      setLoading(true);
      setError(null);

      fetchExpenses({
        category: category || undefined,
        sort,
        signal,
      })
        .then((data) => {
          setItems(data.items);
          setTotalPaise(data.total_paise);
          setCount(data.count);
        })
        .catch((err: unknown) => {
          if (err instanceof DOMException && err.name === "AbortError") return;
          setError(
            err instanceof Error ? err.message : "Failed to load expenses",
          );
        })
        .finally(() => setLoading(false));
    },
    [category, sort],
  );

  useEffect(() => {
    const controller = new AbortController();
    loadExpenses(controller.signal);
    return () => controller.abort();
  }, [loadExpenses]);

  const handleCreated = useCallback(() => {
    // Refresh categories too
    fetchExpenses()
      .then((data) => {
        const cats = [...new Set(data.items.map((e) => e.category))].sort();
        setCategories(cats);
      })
      .catch(() => {});
    loadExpenses();
  }, [loadExpenses]);

  // Fallback: compute total from items if backend didn't provide it
  const displayTotal =
    totalPaise ??
    items.reduce((sum, e) => sum + e.amount_paise, 0);

  return (
    <div className="expenses-page">
      <h1>Expense Tracker</h1>

      <ExpenseForm onCreated={handleCreated} />

      <FilterSortControls
        category={category}
        onCategoryChange={setCategory}
        sort={sort}
        onSortChange={setSort}
        categories={categories}
      />

      {loading && <p className="status-message">Loading expenses...</p>}

      {error && (
        <div className="error-banner">
          <p>{error}</p>
          <button onClick={() => loadExpenses()}>Retry</button>
        </div>
      )}

      {!loading && !error && (
        <>
          <TotalDisplay totalPaise={displayTotal} count={count} />
          <ExpenseTable items={items} />
        </>
      )}
    </div>
  );
}
