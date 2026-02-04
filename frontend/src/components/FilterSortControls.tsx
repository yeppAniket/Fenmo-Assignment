type Props = {
  category: string;
  onCategoryChange: (value: string) => void;
  sort: string;
  onSortChange: (value: string) => void;
  categories: string[];
};

export function FilterSortControls({
  category,
  onCategoryChange,
  sort,
  onSortChange,
  categories,
}: Props) {
  return (
    <div className="filter-sort-controls">
      <label>
        <span>Category</span>
        <select
          value={category}
          onChange={(e) => onCategoryChange(e.target.value)}
        >
          <option value="">All Categories</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </label>

      <label>
        <span>Sort by</span>
        <select value={sort} onChange={(e) => onSortChange(e.target.value)}>
          <option value="date_desc">Date (Newest first)</option>
          <option value="date_asc">Date (Oldest first)</option>
        </select>
      </label>
    </div>
  );
}
