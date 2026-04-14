"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
} from "react";
import { Button } from "@/components/ui/Button";
import {
  basePriceForBoardGame,
  buildSelectionsFromPicked,
  defaultPickedChoices,
  optionsExtraForSelections,
} from "@/lib/menu-item-pricing";
import { formatPrice, cn } from "@/lib/utils";
import type { CartSelection, MenuItem, MenuItemOption } from "@/types";

const NOTE_MAX_LEN = 2000;
const NOTE_PREVIEW_LEN = 42;

export type MenuItemDetailAddExtra = {
  note?: string;
  selections?: CartSelection[];
  quantity?: number;
};

interface MenuItemDetailProps {
  item: MenuItem | null;
  onClose: () => void;
  onAdd: (item: MenuItem, extra?: MenuItemDetailAddExtra) => void;
}

interface MenuItemDetailModalProps {
  item: MenuItem;
  onClose: () => void;
  onAdd: (item: MenuItem, extra?: MenuItemDetailAddExtra) => void;
}

type SelectionRule = {
  minSelect?: number;
  maxSelect?: number;
  isSingleSelect: boolean;
};

function notePreviewText(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  if (t.length <= NOTE_PREVIEW_LEN) return t;
  return `${t.slice(0, NOTE_PREVIEW_LEN)}…`;
}

function normalizePositiveInt(value: number | undefined): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return undefined;
  }
  return Math.floor(value);
}

function resolveSelectionRule(option: MenuItemOption): SelectionRule {
  const minSelect = normalizePositiveInt(option.minSelect);
  const rawMaxSelect = normalizePositiveInt(option.maxSelect);
  const isSingleSelect = !(
    typeof rawMaxSelect === "number" && rawMaxSelect > 1
  );
  const maxSelect = isSingleSelect ? undefined : rawMaxSelect;
  return { minSelect, maxSelect, isSingleSelect };
}

function selectionHintText(rule: SelectionRule): string {
  const { minSelect, maxSelect, isSingleSelect } = rule;
  if (minSelect && maxSelect) return `(chon ${minSelect}-${maxSelect})`;
  if (minSelect) return `(chon it nhat ${minSelect})`;
  if (isSingleSelect) return "(chon 1 hoac bo qua)";
  if (maxSelect && maxSelect > 1) return `(chon toi da ${maxSelect})`;
  return "(chon nhieu hoac bo qua)";
}

function CheckIndicator({ selected }: { selected: boolean }) {
  return (
    <span
      className={cn(
        "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2",
        selected
          ? "border-primary bg-primary text-primary-foreground"
          : "border-muted-foreground/35 bg-background",
      )}
      aria-hidden
    >
      {selected ? (
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          className="text-primary-foreground"
        >
          <path
            d="M2.5 6L5 8.5L9.5 3.5"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ) : null}
    </span>
  );
}

function RadioIndicator({ selected }: { selected: boolean }) {
  return (
    <span
      className={cn(
        "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2",
        selected
          ? "border-primary bg-primary text-primary-foreground"
          : "border-muted-foreground/35 bg-background",
      )}
      aria-hidden
    >
      {selected ? <span className="h-2 w-2 rounded-full bg-current" /> : null}
    </span>
  );
}

interface OptionGroupCardProps {
  option: MenuItemOption;
  selectedChoiceIds: string[];
  onToggleChoice: (
    optionId: string,
    choiceId: string,
    rule: SelectionRule,
  ) => void;
}

function OptionGroupCard({
  option,
  selectedChoiceIds,
  onToggleChoice,
}: OptionGroupCardProps) {
  const rule = useMemo(() => resolveSelectionRule(option), [option]);

  return (
    <div className="overflow-hidden rounded-xl border border-border/80 bg-background shadow-sm">
      <div className="flex items-center gap-1 border-b border-border/60 bg-muted/20 px-3 py-2.5">
        <span className="text-[15px] font-semibold text-foreground">
          {option.name}
        </span>
        <span className="text-xs text-muted-foreground">
          {selectionHintText(rule)}
        </span>
      </div>
      <ul className="divide-y divide-border/70">
        {option.choices.map((choice) => {
          const isSelected = selectedChoiceIds.includes(choice.id);
          return (
            <li key={choice.id}>
              <button
                type="button"
                className={cn(
                  "flex w-full items-center gap-3 px-3 py-3 text-left transition-colors active:bg-muted/60",
                  isSelected && "bg-primary/6",
                )}
                onClick={() => onToggleChoice(option.id, choice.id, rule)}
              >
                {rule.isSingleSelect ? (
                  <RadioIndicator selected={isSelected} />
                ) : (
                  <CheckIndicator selected={isSelected} />
                )}
                <span className="min-w-0 flex-1 text-[15px] font-medium text-foreground">
                  {choice.label}
                </span>
                {choice.priceAdjustment > 0 ? (
                  <span className="shrink-0 text-sm font-medium text-primary tabular-nums">
                    +{formatPrice(choice.priceAdjustment)}
                  </span>
                ) : (
                  <span className="shrink-0 text-xs text-muted-foreground">
                    —
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

interface NoteSectionProps {
  open: boolean;
  value: string;
  preview: string | null;
  onToggle: () => void;
  onChange: (value: string) => void;
}

function NoteSection({
  open,
  value,
  preview,
  onToggle,
  onChange,
}: NoteSectionProps) {
  const handleTextareaChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
  };

  return (
    <div className="mt-1 px-3">
      <div className="overflow-hidden rounded-xl border border-border/80 bg-background shadow-sm">
        <button
          type="button"
          className="flex w-full items-center gap-3 px-3 py-3 text-left active:bg-muted/40"
          onClick={onToggle}
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-base">
            📝
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-semibold text-foreground">
              Ghi chu cho mon
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {preview ?? "Vi du: it da, lay mang di..."}
            </p>
          </div>
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className={cn(
              "shrink-0 text-muted-foreground transition-transform",
              open && "rotate-180",
            )}
            aria-hidden
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
        {open ? (
          <div className="border-t border-border/60 px-3 pb-3 pt-1">
            <textarea
              value={value}
              onChange={handleTextareaChange}
              rows={3}
              maxLength={NOTE_MAX_LEN}
              placeholder="Nhap ghi chu cho quan (toi da 2000 ky tu)..."
              className="w-full resize-none rounded-lg border border-border bg-muted/30 px-3 py-2.5 text-sm outline-none ring-primary/25 focus:ring-2"
            />
            <p className="mt-1 text-right text-[11px] text-muted-foreground tabular-nums">
              {value.length}/{NOTE_MAX_LEN}
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function MenuItemDetailModal({
  item,
  onClose,
  onAdd,
}: MenuItemDetailModalProps) {
  const defaultPicked = useMemo(() => defaultPickedChoices(item), [item]);
  const [picked, setPicked] = useState<Record<string, string[]>>(defaultPicked);
  const [note, setNote] = useState("");
  const [noteOpen, setNoteOpen] = useState(false);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const selections = useMemo(() => {
    if (!item.options?.length) return undefined;
    return buildSelectionsFromPicked(item, picked);
  }, [item, picked]);

  const optionsExtra = useMemo(() => {
    if (!item.options) return 0;
    return optionsExtraForSelections(item.options, selections);
  }, [item, selections]);

  const handleToggleChoice = useCallback(
    (optionId: string, choiceId: string, rule: SelectionRule) => {
      setPicked((prev) => {
        const current = prev[optionId] ?? [];
        const exists = current.includes(choiceId);
        let nextChoices: string[];

        if (exists) {
          if (
            typeof rule.minSelect === "number" &&
            current.length <= rule.minSelect
          ) {
            return prev;
          }
          nextChoices = current.filter((id) => id !== choiceId);
        } else if (rule.isSingleSelect) {
          nextChoices = [choiceId];
        } else if (
          typeof rule.maxSelect === "number" &&
          current.length >= rule.maxSelect
        ) {
          nextChoices = current;
        } else {
          nextChoices = [...current, choiceId];
        }

        return { ...prev, [optionId]: nextChoices };
      });
    },
    [],
  );

  const handleToggleNote = useCallback(() => {
    setNoteOpen((prev) => !prev);
  }, []);

  const handleNoteChange = useCallback((value: string) => {
    setNote(value);
  }, []);

  const handleDecrementQty = useCallback(() => {
    if (quantity <= 1) {
      onClose();
      return;
    }
    setQuantity((q) => q - 1);
  }, [quantity, onClose]);

  const handleIncrementQty = useCallback(() => {
    setQuantity((q) => q + 1);
  }, []);

  const handleConfirmAdd = useCallback(() => {
    const trimmed = note.trim();
    const sels = buildSelectionsFromPicked(item, picked);
    onAdd(item, {
      quantity,
      ...(trimmed ? { note: trimmed } : {}),
      ...(sels?.length ? { selections: sels } : {}),
    });
    onClose();
  }, [item, note, picked, quantity, onAdd, onClose]);

  const hasSelectionConstraintError = useMemo(() => {
    const options = item.options ?? [];
    return options.some((option) => {
      const count = (picked[option.id] ?? []).length;
      const rule = resolveSelectionRule(option);
      const minSelect = rule.minSelect ?? 0;
      const maxSelect = rule.maxSelect ?? Number.POSITIVE_INFINITY;
      return count < minSelect || count > maxSelect;
    });
  }, [item.options, picked]);

  const unitTotal = basePriceForBoardGame(item) + optionsExtra;
  const lineTotal = unitTotal * quantity;
  const preview = notePreviewText(note);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div
        className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden
      />

      <div
        className="relative mb-(--app-tab-bar,0px) flex max-h-[min(92dvh,640px)] w-full max-w-md flex-col rounded-t-[1.25rem] bg-background shadow-2xl animate-slide-up"
        role="dialog"
        aria-modal="true"
        aria-labelledby="menu-item-detail-title"
      >
        <div className="flex shrink-0 justify-center pt-2.5 pb-1">
          <div className="h-1 w-9 rounded-full bg-muted-foreground/25" />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <div className="border-b border-border px-4 pb-3">
            <div className="flex gap-3">
              {item.image ? (
                <div className="h-18 w-18 shrink-0 overflow-hidden rounded-xl bg-muted">
                  <img
                    src={item.image}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                </div>
              ) : (
                <div className="flex h-18 w-18 shrink-0 items-center justify-center rounded-xl bg-muted text-2xl">
                  🍽️
                </div>
              )}
              <div className="min-w-0 flex-1 pt-0.5">
                <h2
                  id="menu-item-detail-title"
                  className="text-base font-bold leading-snug text-foreground"
                >
                  {item.name}
                </h2>
                <p className="mt-1 text-lg font-bold text-primary tabular-nums">
                  {formatPrice(unitTotal)}
                </p>
                {item.description ? (
                  <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                    {item.description}
                  </p>
                ) : null}
              </div>

              <div className="mt-2 flex items-center gap-2">
                <div className="flex items-center gap-1 rounded-xl border border-border bg-muted/30 p-1">
                  <button
                    type="button"
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-base font-bold text-foreground active:bg-muted disabled:opacity-35"
                    disabled={!item.isAvailable}
                    onClick={handleDecrementQty}
                    aria-label={
                      quantity <= 1 ? "Dong (khong them)" : "Giam so luong"
                    }
                  >
                    −
                  </button>
                  <span className="min-w-8 text-center text-sm font-bold tabular-nums text-foreground">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-base font-bold text-foreground active:bg-muted disabled:opacity-35"
                    disabled={!item.isAvailable}
                    onClick={handleIncrementQty}
                    aria-label="Tang so luong"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-muted/35 px-0 py-3">
            {item.options && item.options.length > 0 ? (
              <div className="space-y-3 px-3">
                {item.options.map((option) => (
                  <OptionGroupCard
                    key={option.id}
                    option={option}
                    selectedChoiceIds={picked[option.id] ?? []}
                    onToggleChoice={handleToggleChoice}
                  />
                ))}
              </div>
            ) : null}

            <NoteSection
              open={noteOpen}
              value={note}
              preview={preview}
              onToggle={handleToggleNote}
              onChange={handleNoteChange}
            />

            <div className="h-4" />
          </div>
        </div>

        <footer className="sticky bottom-0 z-10 shrink-0 border-t border-border bg-background/98 px-4 pt-3 pb-[max(0.85rem,env(safe-area-inset-bottom))] shadow-[0_-8px_30px_rgba(0,0,0,0.08)] backdrop-blur-md supports-backdrop-filter:bg-background/90">
          <div className="flex items-center gap-3">
            <Button
              size="lg"
              className="h-12 flex-1 justify-between px-4 text-base font-bold shadow-md sm:h-13"
              disabled={!item.isAvailable || hasSelectionConstraintError}
              onClick={handleConfirmAdd}
            >
              {item.isAvailable ? (
                <>
                  <span className="inline-flex min-w-0 items-center gap-1.5 truncate">
                    <span>Them vao gio hang</span>
                  </span>
                  <span className="shrink-0 tabular-nums opacity-95">
                    {formatPrice(lineTotal)}
                  </span>
                </>
              ) : (
                "Het mon"
              )}
            </Button>
          </div>
        </footer>
      </div>
    </div>
  );
}

export function MenuItemDetail({ item, onClose, onAdd }: MenuItemDetailProps) {
  if (!item) return null;
  return (
    <MenuItemDetailModal
      key={item.id}
      item={item}
      onClose={onClose}
      onAdd={onAdd}
    />
  );
}
