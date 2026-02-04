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
              <td>{e.date}</td>
              <td>{e.category}</td>
              <td>{e.description || "—"}</td>
              <td className="amount-col">{formatPaise(e.amount_paise)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
