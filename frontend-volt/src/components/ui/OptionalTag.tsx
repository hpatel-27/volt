// Marks a field label as not required. It inherits the surrounding `text-caption`
// styling (uppercase, letter-spaced) on purpose, and recedes from the field name
// via a lighter weight and muted color so the label still reads first. Owns its
// own left spacing — call sites should not add their own gap.
export function OptionalTag() {
  return (
    <span className="pl-2  font-normal normal-case text-volt-700">
      Optional
    </span>
  );
}
