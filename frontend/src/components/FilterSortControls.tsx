import { Select } from "../ui/index.ts";

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
  const categoryOptions = [
    { value: "", label: "All Categories" },
    ...categories.map((cat) => ({ value: cat, label: cat })),
  ];

  const sortOptions = [
    { value: "date_desc", label: "Date (Newest first)" },
    { value: "date_asc", label: "Date (Oldest first)" },
  ];

  return (
    <div className="filter-sort-controls">
      <Select
        label="Category"
        options={categoryOptions}
        value={category}
        onChange={(e) => onCategoryChange(e.target.value)}
      />
      <Select
        label="Sort by"
        options={sortOptions}
        value={sort}
        onChange={(e) => onSortChange(e.target.value)}
      />
    </div>
  );
}
