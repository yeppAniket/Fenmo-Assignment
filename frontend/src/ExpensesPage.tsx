import { useCallback, useEffect, useState } from "react";
import { fetchExpenses, fetchSummary } from "./api.ts";
import type { Expense, CategorySummary as CategorySummaryItem } from "./api.ts";
import { Banner, Button } from "./ui/index.ts";
import { CategorySummary } from "./components/CategorySummary.tsx";
import { ExpenseForm } from "./components/ExpenseForm.tsx";
import { ExpenseTable } from "./components/ExpenseTable.tsx";
import { FilterSortControls } from "./components/FilterSortControls.tsx";
import { PendingBanner } from "./components/PendingBanner.tsx";
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

  // Category summary data
  const [summaryItems, setSummaryItems] = useState<CategorySummaryItem[]>([]);
  const [summaryGrandTotal, setSummaryGrandTotal] = useState(0);

  const loadSummary = useCallback(() => {
    fetchSummary()
      .then((data) => {
        setSummaryItems(data.categories);
        setSummaryGrandTotal(data.grand_total_paise);
        setCategories(data.categories.map((c) => c.category).sort());
      })
      .catch(() => {});
  }, []);

  // Fetch summary on mount
  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

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
    loadSummary();
    loadExpenses();
  }, [loadExpenses, loadSummary]);

  // Fallback: compute total from items if backend didn't provide it
  const displayTotal =
    totalPaise ??
    items.reduce((sum, e) => sum + e.amount_paise, 0);

  return (
    <div className="expenses-page">
      <h1>Expense Tracker</h1>

      {/* Screen-reader announcements for loading/error state changes */}
      <div aria-live="polite" className="sr-only">
        {loading ? "Loading expenses" : ""}
        {error ? `Error: ${error}` : ""}
      </div>

      <PendingBanner onResolved={handleCreated} />

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
        <Banner
          variant="error"
          action={<Button variant="danger" onClick={() => loadExpenses()}>Retry</Button>}
        >
          {error}
        </Banner>
      )}

      {!loading && !error && (
        <>
          <TotalDisplay totalPaise={displayTotal} count={count} />
          <CategorySummary categories={summaryItems} grandTotal={summaryGrandTotal} />
          <ExpenseTable items={items} />
        </>
      )}
    </div>
  );
}
