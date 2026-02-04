import type { CategorySummary as CategorySummaryItem } from "../api.ts";

function formatRupees(paise: number) {
  return "₹" + (paise / 100).toFixed(2);
}

export function CategorySummary({
  categories,
  grandTotal,
}: {
  categories: CategorySummaryItem[];
  grandTotal: number;
}) {
  if (categories.length === 0) return null;

  return (
    <div className="category-summary">
      <h3>Spending by Category</h3>
      <div className="category-bars">
        {categories.map((cat) => {
          const pct = grandTotal > 0 ? (cat.total_paise / grandTotal) * 100 : 0;
          return (
            <div key={cat.category} className="category-bar-row">
              <span className="category-bar-label">{cat.category}</span>
              <div className="category-bar-track">
                <div
                  className="category-bar-fill"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="category-bar-amount">
                {formatRupees(cat.total_paise)}
              </span>
              <span className="category-bar-count">
                {cat.count} expense{cat.count !== 1 ? "s" : ""}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
