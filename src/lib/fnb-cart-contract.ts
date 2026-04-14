/**
 * Hop dong groupKey / optionKey giong Shopee — dung hang so khi menu map sang key co dinh.
 * Khi menu chi co Mongo id, co the dung truc tiep option.id / choice.id lam key (truong hop hien tai).
 */

export const FNB_GROUP = {
  SUGAR: "sugar",
  ICE: "ice",
  SIZE: "size",
} as const;

export const FNB_OPTION = {
  SUGAR_30PCT: "30pct",
  SUGAR_50PCT: "50pct",
  ICE_LESS: "less",
  ICE_NORMAL: "normal",
  ICE_SEPARATE: "separate",
} as const;

export type FnbGroupKey = (typeof FNB_GROUP)[keyof typeof FNB_GROUP];
export type FnbOptionKey = (typeof FNB_OPTION)[keyof typeof FNB_OPTION];
