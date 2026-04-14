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
