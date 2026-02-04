import type { Expense } from "../api.ts";

function formatPaise(paise: number): string {
  const rupees = (paise / 100).toFixed(2);
  return `\u20B9${rupees}`;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function ExpenseTable({ items }: { items: Expense[] }) {
  if (items.length === 0) {
    return (
      <div className="empty-message">
        <span className="empty-icon">{"\uD83D\uDCB8"}</span>
        <p>No expenses found. Add your first expense above!</p>
      </div>
    );
  }

  return (
    <div className="expense-table-wrapper">
      <table className="expense-table">
        <caption className="sr-only">List of expenses</caption>
        <thead>
          <tr>
            <th scope="col">Date</th>
            <th scope="col">Category</th>
            <th scope="col">Description</th>
            <th scope="col" className="amount-col">Amount</th>
          </tr>
        </thead>
        <tbody>
          {items.map((e) => (
            <tr key={e.id}>
              <td className="expense-date">{formatDate(e.date)}</td>
              <td><span className="expense-category-badge">{e.category}</span></td>
              <td className={e.description ? "" : "expense-description"}>
                {e.description || "\u2014"}
              </td>
              <td className="amount-col">{formatPaise(e.amount_paise)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
