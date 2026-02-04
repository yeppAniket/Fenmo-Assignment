export function TotalDisplay({ totalPaise, count }: { totalPaise: number; count: number }) {
  const rupees = (totalPaise / 100).toFixed(2);

  return (
    <div className="total-display">
      <span className="total-amount">Total: ₹{rupees}</span>
      <span className="total-count">{count} expense{count !== 1 ? "s" : ""}</span>
    </div>
  );
}
