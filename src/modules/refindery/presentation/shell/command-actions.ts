export type PaletteAction = {
  id: string;
  group: 'Navigate' | 'Actions' | 'Jobs';
  label: string;
  /** Extra match text (route path, full job id) beyond the visible label. */
  keywords?: string;
  run: () => void;
};

/** Case-insensitive substring match over label + keywords; empty input keeps
 * every action. Pure so palette matching is unit-testable without a router. */
export function filterActions(
  actions: readonly PaletteAction[],
  input: string
): PaletteAction[] {
  const needle = input.trim().toLowerCase();
  if (!needle) return [...actions];
  return actions.filter((action) =>
    `${action.label} ${action.keywords ?? ''}`.toLowerCase().includes(needle)
  );
}
