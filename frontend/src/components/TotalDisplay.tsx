export function TotalDisplay({ totalPaise, count }: { totalPaise: number; count: number }) {
  const rupees = (totalPaise / 100).toFixed(2);

  return (
    <div className="total-display">
      <div className="total-left">
        <span className="total-label">Total Spent</span>
        <span className="total-amount">{"\u20B9"}{rupees}</span>
      </div>
      <span className="total-count">{count} expense{count !== 1 ? "s" : ""}</span>
    </div>
  );
}
