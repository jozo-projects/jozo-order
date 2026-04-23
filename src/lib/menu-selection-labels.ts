import type { CartSelection, MenuItem } from "@/types";

export function formatSelectionLabels(
  selections: CartSelection[] | undefined,
  menuItem: MenuItem | undefined,
): string {
  if (!selections?.length) return "";
  const optionGroups = menuItem?.options ?? [];

  return selections
    .map((selection) => {
      const group = optionGroups.find((g) => g.id === selection.groupKey);
      const choice = group?.choices.find((c) => c.id === selection.optionKey);
      return choice?.label ?? selection.optionKey;
    })
    .filter((text) => text.length > 0)
    .join(" · ");
}
