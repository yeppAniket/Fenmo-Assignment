import type { Expense } from "../api.ts";

function formatPaise(paise: number): string {
  const rupees = (paise / 100).toFixed(2);
  return `₹${rupees}`;
}

export function ExpenseTable({ items }: { items: Expense[] }) {
  if (items.length === 0) {
    return <p className="empty-message">No expenses found.</p>;
  }

  return (
    <table className="expense-table">
      <thead>
        <tr>
          <th>Date</th>
          <th>Category</th>
          <th>Description</th>
          <th className="amount-col">Amount</th>
        </tr>
      </thead>
      <tbody>
        {items.map((e) => (
          <tr key={e.id}>
            <td>{e.date}</td>
            <td>{e.category}</td>
            <td>{e.description || "—"}</td>
            <td className="amount-col">{formatPaise(e.amount_paise)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
