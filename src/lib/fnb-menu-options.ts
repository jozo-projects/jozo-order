export type FnbOptionChoice = {
  id: string;
  label: string;
  priceAdjustment: number;
};

export type FnbOptionGroup = {
  id: string;
  name: string;
  minSelect?: number;
  maxSelect?: number;
  choices: FnbOptionChoice[];
};

export type FnbRawOptionChoice = {
  id?: string;
  key?: string;
  optionKey?: string;
  code?: string;
  label?: string;
  name?: string;
  title?: string;
  priceDelta?: number | string;
  priceAdjustment?: number | string;
  extraPrice?: number | string;
  price?: number | string;
  additionalPrice?: number | string;
};

export type FnbRawOptionGroup = {
  id?: string;
  key?: string;
  groupKey?: string;
  templateKey?: string;
  name?: string;
  label?: string;
  title?: string;
  minSelect?: number | string;
  minChoice?: number | string;
  minChoices?: number | string;
  min?: number | string;
  required?: number | string | boolean;
  maxSelect?: number | string;
  maxChoice?: number | string;
  maxChoices?: number | string;
  max?: number | string;
  limit?: number | string;
  choices?: FnbRawOptionChoice[];
  options?: FnbRawOptionChoice[];
};

export type CustomizationGroupTemplateDoc = {
  templateKey?: string;
  label?: string;
  group?: FnbRawOptionGroup;
  isActive?: boolean;
  result?: CustomizationGroupTemplateDoc[];
};

function readNonEmptyString(...vals: unknown[]): string {
  for (const v of vals) {
    if (typeof v === "string") {
      const t = v.trim();
      if (t.length > 0) return t;
    }
  }
  return "";
}

function readNumber(...vals: unknown[]): number {
  for (const v of vals) {
    const n = typeof v === "number" ? v : Number(v);
    if (Number.isFinite(n)) return n;
  }
  return 0;
}

function normalizeChoice(raw: FnbRawOptionChoice): FnbOptionChoice | null {
  const id = readNonEmptyString(raw.id, raw.key, raw.optionKey, raw.code);
  const label = readNonEmptyString(raw.label, raw.name, raw.title);
  if (!id || !label) return null;
  return {
    id,
    label,
    priceAdjustment: readNumber(
      raw.priceDelta,
      raw.priceAdjustment,
      raw.extraPrice,
      raw.price,
      raw.additionalPrice,
    ),
  };
}

function normalizeOptionGroup(raw: FnbRawOptionGroup): FnbOptionGroup | null {
  const id = readNonEmptyString(raw.id, raw.key, raw.groupKey, raw.templateKey);
  const name = readNonEmptyString(raw.name, raw.label, raw.title);
  const minSelectValue =
    raw.required === true
      ? 1
      : readNumber(raw.minSelect, raw.minChoice, raw.minChoices, raw.min, raw.required);
  const minSelect = minSelectValue > 0 ? Math.floor(minSelectValue) : undefined;
  const maxSelectValue = readNumber(
    raw.maxSelect,
    raw.maxChoice,
    raw.maxChoices,
    raw.max,
    raw.limit,
  );
  const maxSelect = maxSelectValue > 0 ? Math.floor(maxSelectValue) : undefined;
  const choicesRaw = Array.isArray(raw.choices)
    ? raw.choices
    : Array.isArray(raw.options)
      ? raw.options
      : [];
  const choices = choicesRaw
    .map(normalizeChoice)
    .filter((x): x is FnbOptionChoice => x != null);

  if (!id || !name || choices.length === 0) return null;
  return { id, name, minSelect, maxSelect, choices };
}

export function normalizeItemOptions(
  raw: FnbRawOptionGroup[] | undefined,
): FnbOptionGroup[] {
  if (!raw?.length) return [];
  return raw
    .map((group) => normalizeOptionGroup(group))
    .filter((x): x is FnbOptionGroup => x != null);
}

function isTruthyActive(v: unknown): boolean {
  return v === true || v === 1 || v === "1" || v === "true";
}

export function extractTemplateGroups(
  input: CustomizationGroupTemplateDoc[],
): FnbOptionGroup[] {
  if (!input.length) return [];
  const out: FnbOptionGroup[] = [];
  for (const tpl of input) {
    const activeRaw = tpl.isActive;
    if (activeRaw !== undefined && !isTruthyActive(activeRaw)) continue;

    const direct = tpl.group ? normalizeOptionGroup(tpl.group) : null;
    if (direct) {
      out.push(direct);
      continue;
    }

    const rootAsGroup = normalizeOptionGroup(tpl as FnbRawOptionGroup);
    if (rootAsGroup) out.push(rootAsGroup);

    if (tpl.result?.length) {
      out.push(...extractTemplateGroups(tpl.result));
    }
  }
  return out;
}

export function mergeOptionGroups(
  globalOptions: FnbOptionGroup[],
  itemOptions: FnbOptionGroup[],
): FnbOptionGroup[] {
  const byId = new Map<string, FnbOptionGroup>();
  for (const g of globalOptions) byId.set(g.id, g);
  // Item-specific groups override same key from global templates.
  for (const g of itemOptions) byId.set(g.id, g);
  return [...byId.values()];
}
