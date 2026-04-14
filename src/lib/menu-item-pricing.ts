import type { CartSelection, MenuItem, MenuItemOption } from "@/types";

/**
 * Gia hien thi cho menu board game:
 * - Drink: mien phi (0d)
 * - Snack va nhom khac: giu gia niem yet.
 */
export function basePriceForBoardGame(item: MenuItem | undefined): number {
  if (!item) return 0;
  return item.categoryId === "drink" ? 0 : item.price;
}

/** Tong phu phi theo lua chon (so sanh groupKey/optionKey voi option.id / choice.id). */
export function optionsExtraForSelections(
  options: MenuItemOption[] | undefined,
  selections: CartSelection[] | undefined,
): number {
  if (!options?.length || !selections?.length) return 0;
  let total = 0;
  for (const s of selections) {
    const opt = options.find((o) => o.id === s.groupKey);
    const choice = opt?.choices.find((c) => c.id === s.optionKey);
    if (choice) total += choice.priceAdjustment;
  }
  return total;
}

export function optionsExtraForLine(
  item: MenuItem | undefined,
  line: { selections?: CartSelection[] },
): number {
  return optionsExtraForSelections(item?.options, line.selections);
}

/** selections gui len cart / submit tu state chon tren UI. */
export function buildSelectionsFromPicked(
  item: MenuItem,
  picked: Record<string, string[]>,
): CartSelection[] | undefined {
  if (!item.options?.length) return undefined;
  const selections: CartSelection[] = [];
  for (const opt of item.options) {
    const selected = picked[opt.id] ?? [];
    for (const choiceId of selected) {
      selections.push({
        groupKey: opt.id,
        optionKey: choiceId,
      });
    }
  }
  return selections.length ? selections : undefined;
}

export function defaultPickedChoices(_item: MenuItem): Record<string, string[]> {
  // UI/UX: mac dinh khong chon option nao.
  return {};
}
