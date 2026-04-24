import { connectDB } from "./mongodb";
import { CoffeeTable } from "./models/table";
import { Category } from "./models/category";
import { MenuItem } from "./models/menu-item";
import { Order } from "./models/order";
import {
  extractTemplateGroups,
  mergeOptionGroups,
  normalizeItemOptions,
  type CustomizationGroupTemplateDoc,
  type FnbRawOptionGroup,
} from "./fnb-menu-options";
import type { BoardGameGuideItem } from "@/types";

export async function getTableByCode(code: string) {
  await connectDB();
  return CoffeeTable.findOne({ code, isActive: true }).lean();
}

export async function getCategories() {
  await connectDB();
  return Category.find().sort({ sortOrder: 1 }).lean();
}

export async function getMenuItems() {
  await connectDB();
  return MenuItem.find().sort({ sortOrder: 1 }).lean();
}

export async function getMenuItemsByCategory(categoryId: string) {
  await connectDB();
  return MenuItem.find({ categoryId }).sort({ sortOrder: 1 }).lean();
}

export async function getOrdersByTable(tableId: string) {
  await connectDB();
  return Order.find({ tableId }).sort({ createdAt: -1 }).lean();
}

type FnbMenuItemDoc = {
  _id: string;
  name: string;
  category?: string;
  price?: number;
  image?: string | null;
  parentId?: string;
  inventory?: { quantity?: number };
  options?: FnbRawOptionGroup[];
  customizationGroups?: FnbRawOptionGroup[];
};

type RawBoardGameDoc = {
  _id: unknown;
  name?: string;
  slug?: string;
  shortDescription?: string;
  guideContent?: string;
  images?: unknown;
  players?: unknown;
  playerRange?: unknown;
  recommendedPlayers?: unknown;
  playerCount?: unknown;
  minPlayers?: unknown;
  maxPlayers?: unknown;
  playTimeMinutes?: unknown;
  learnMinutes?: unknown;
  estimatedLearnMinutes?: unknown;
  introductionMinutes?: unknown;
  tutorialMinutes?: unknown;
};

export async function getFnbMenuData() {
  await connectDB();

  const [docs, templateDocsPrimary] = await Promise.all([
    MenuItem.db
      .collection("fnb_menu_item")
      .find({
        category: { $in: ["snack", "drink"] },
      })
      .sort({ category: 1, name: 1 })
      .toArray() as unknown as Promise<FnbMenuItemDoc[]>,
    MenuItem.db
      .collection("customization_group_templates")
      .find({})
      .toArray() as unknown as Promise<CustomizationGroupTemplateDoc[]>,
  ]);

  const globalOptions = extractTemplateGroups(templateDocsPrimary);

  const categories = [
    { id: "drink", name: "Drink", slug: "drink", sortOrder: 0 },
    { id: "snack", name: "Snack", slug: "snack", sortOrder: 1 },
  ].filter((c) => docs.some((d) => d.category === c.id));

  const items = docs.map((doc) => ({
    _id: String(doc._id),
    name: doc.name,
    description: "",
    price: Number(doc.price ?? 0),
    image: doc.image ?? null,
    categoryId: doc.category ?? "snack",
    isAvailable: (doc.inventory?.quantity ?? 0) > 0,
    options: mergeOptionGroups(globalOptions, [
      ...normalizeItemOptions(doc.options),
      ...normalizeItemOptions(doc.customizationGroups),
    ]),
    parentId: doc.parentId ?? "",
  }));

  return { categories, items };
}

function toCleanString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function toPositiveNumber(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return null;
  }
  return Math.round(value);
}

function pickPlayersText(doc: RawBoardGameDoc): string {
  const fromTextFields = [
    doc.players,
    doc.playerRange,
    doc.recommendedPlayers,
    doc.playerCount,
  ]
    .map(toCleanString)
    .find((value) => value != null);
  if (fromTextFields) return fromTextFields;

  const minPlayers = toPositiveNumber(doc.minPlayers);
  const maxPlayers = toPositiveNumber(doc.maxPlayers);
  if (minPlayers && maxPlayers) {
    return minPlayers === maxPlayers
      ? `${minPlayers} người`
      : `${minPlayers}-${maxPlayers} người`;
  }
  if (minPlayers) return `${minPlayers}+ người`;
  if (maxPlayers) return `tối đa ${maxPlayers} người`;

  return "Đang cập nhật số người chơi";
}

function pickLearnMinutesText(doc: RawBoardGameDoc): string {
  const minutes = [
    doc.playTimeMinutes,
    doc.learnMinutes,
    doc.estimatedLearnMinutes,
    doc.introductionMinutes,
    doc.tutorialMinutes,
  ]
    .map(toPositiveNumber)
    .find((value) => value != null);
  if (minutes) return `~${minutes} phút làm quen`;

  return "Đang cập nhật thời gian làm quen";
}

export async function getBoardGameGuideData(): Promise<BoardGameGuideItem[]> {
  await connectDB();

  const docs = (await MenuItem.db
    .collection("games")
    .aggregate([
      { $match: { isActive: true } },
      {
        $addFields: {
          normalizedTypeId: {
            $convert: {
              input: "$typeId",
              to: "objectId",
              onError: null,
              onNull: null,
            },
          },
        },
      },
      {
        $lookup: {
          from: "game_types",
          localField: "normalizedTypeId",
          foreignField: "_id",
          as: "gameTypeDoc",
        },
      },
      {
        $addFields: {
          gameTypeLabel: {
            $ifNull: [
              "$gameTypeLabel",
              {
                slug: { $arrayElemAt: ["$gameTypeDoc.slug", 0] },
                name: { $arrayElemAt: ["$gameTypeDoc.name", 0] },
                description: { $arrayElemAt: ["$gameTypeDoc.description", 0] },
              },
            ],
          },
        },
      },
      { $match: { "gameTypeLabel.slug": "board-game" } },
      { $sort: { name: 1 } },
      {
        $project: {
          _id: 1,
          name: 1,
          slug: 1,
          shortDescription: 1,
          guideContent: 1,
          images: 1,
          players: 1,
          playerRange: 1,
          recommendedPlayers: 1,
          playerCount: 1,
          minPlayers: 1,
          maxPlayers: 1,
          playTimeMinutes: 1,
          learnMinutes: 1,
          estimatedLearnMinutes: 1,
          introductionMinutes: 1,
          tutorialMinutes: 1,
        },
      },
    ])
    .toArray()) as RawBoardGameDoc[];

  return docs.map((doc) => {
    const firstImage = Array.isArray(doc.images)
      ? doc.images.find((item) => typeof item === "string")
      : null;

    const minPlayers = toPositiveNumber(doc.minPlayers);
    const maxPlayers = toPositiveNumber(doc.maxPlayers);
    const playTimeMinutes = toPositiveNumber(doc.playTimeMinutes);

    return {
      id: String(doc._id),
      name: toCleanString(doc.name) ?? "Board game",
      slug: toCleanString(doc.slug) ?? String(doc._id),
      shortDescription: toCleanString(doc.shortDescription) ?? "",
      guideContent: toCleanString(doc.guideContent) ?? "",
      image: firstImage ?? null,
      minPlayers,
      maxPlayers,
      playTimeMinutes,
      playersText: pickPlayersText(doc),
      learnMinutesText: pickLearnMinutesText(doc),
    };
  });
}

export async function getBoardGameGuideBySlug(
  slug: string,
): Promise<BoardGameGuideItem | null> {
  await connectDB();

  const docs = (await MenuItem.db
    .collection("games")
    .aggregate([
      { $match: { isActive: true, slug } },
      {
        $addFields: {
          normalizedTypeId: {
            $convert: {
              input: "$typeId",
              to: "objectId",
              onError: null,
              onNull: null,
            },
          },
        },
      },
      {
        $lookup: {
          from: "game_types",
          localField: "normalizedTypeId",
          foreignField: "_id",
          as: "gameTypeDoc",
        },
      },
      {
        $addFields: {
          gameTypeLabel: {
            $ifNull: [
              "$gameTypeLabel",
              {
                slug: { $arrayElemAt: ["$gameTypeDoc.slug", 0] },
                name: { $arrayElemAt: ["$gameTypeDoc.name", 0] },
                description: { $arrayElemAt: ["$gameTypeDoc.description", 0] },
              },
            ],
          },
        },
      },
      { $match: { "gameTypeLabel.slug": "board-game" } },
      {
        $project: {
          _id: 1,
          name: 1,
          slug: 1,
          shortDescription: 1,
          guideContent: 1,
          images: 1,
          players: 1,
          playerRange: 1,
          recommendedPlayers: 1,
          playerCount: 1,
          minPlayers: 1,
          maxPlayers: 1,
          playTimeMinutes: 1,
          learnMinutes: 1,
          estimatedLearnMinutes: 1,
          introductionMinutes: 1,
          tutorialMinutes: 1,
        },
      },
      { $limit: 1 },
    ])
    .toArray()) as RawBoardGameDoc[];

  if (docs.length === 0) return null;

  const doc = docs[0];
  const firstImage = Array.isArray(doc.images)
    ? doc.images.find((item) => typeof item === "string")
    : null;
  const minPlayers = toPositiveNumber(doc.minPlayers);
  const maxPlayers = toPositiveNumber(doc.maxPlayers);
  const playTimeMinutes = toPositiveNumber(doc.playTimeMinutes);

  return {
    id: String(doc._id),
    name: toCleanString(doc.name) ?? "Board game",
    slug: toCleanString(doc.slug) ?? String(doc._id),
    shortDescription: toCleanString(doc.shortDescription) ?? "",
    guideContent: toCleanString(doc.guideContent) ?? "",
    image: firstImage ?? null,
    minPlayers,
    maxPlayers,
    playTimeMinutes,
    playersText: pickPlayersText(doc),
    learnMinutesText: pickLearnMinutesText(doc),
  };
}
