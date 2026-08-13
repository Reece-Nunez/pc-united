import { formatMoney } from '@/lib/format';

// Renders a USD amount with tabular figures so currency columns line up by
// digit. Use anywhere a money value appears in a list, table, or stat tile.
export default function Money({
  value,
  className = '',
}: {
  value: number | null | undefined;
  className?: string;
}) {
  return <span className={`tabular-nums ${className}`}>{formatMoney(value)}</span>;
}
