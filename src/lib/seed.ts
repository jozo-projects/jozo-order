import mongoose from "mongoose";
import { CoffeeTable } from "./models/table";
import { Category } from "./models/category";
import { MenuItem } from "./models/menu-item";
import { Order } from "./models/order";
import { buildMongoUriFromEnv } from "./mongodb";

async function seed() {
  await mongoose.connect(buildMongoUriFromEnv());
  console.log("Connected to MongoDB");

  await Order.deleteMany();
  await MenuItem.deleteMany();
  await Category.deleteMany();
  console.log("Cleared menu/order data");

  // Check existing coffee_tables
  const existingTables = await CoffeeTable.countDocuments();
  if (existingTables === 0) {
    await CoffeeTable.insertMany(
      Array.from({ length: 10 }, (_, i) => ({
        code: String(i + 1),
        name: `Ban ${i + 1}`,
        isActive: true,
        description: i < 5 ? "Tang 1" : "Tang 2",
      })),
    );
    console.log("Created 10 tables (coffee_tables was empty)");
  } else {
    console.log(`Skipped tables - ${existingTables} already exist`);
  }

  // Categories
  const [doUong, monChinh, monPhu, trangMieng] = await Promise.all([
    Category.create({ name: "Do uong", slug: "do-uong", sortOrder: 0 }),
    Category.create({ name: "Mon chinh", slug: "mon-chinh", sortOrder: 1 }),
    Category.create({ name: "Mon phu", slug: "mon-phu", sortOrder: 2 }),
    Category.create({
      name: "Trang mieng",
      slug: "trang-mieng",
      sortOrder: 3,
    }),
  ]);
  console.log("Created 4 categories");

  const menuItems = await MenuItem.insertMany([
    {
      name: "Tra dao cam sa",
      description: "Tra dao tuoi pha cung cam va sa thom mat",
      price: 35000,
      categoryId: doUong._id,
      isAvailable: true,
      sortOrder: 0,
      options: [
        {
          id: "ice",
          name: "Da",
          choices: [
            { id: "normal", label: "Binh thuong", priceAdjustment: 0 },
            { id: "less", label: "It da", priceAdjustment: 0 },
            { id: "no", label: "Khong da", priceAdjustment: 0 },
          ],
        },
        {
          id: "sugar",
          name: "Duong",
          choices: [
            { id: "100", label: "100%", priceAdjustment: 0 },
            { id: "70", label: "70%", priceAdjustment: 0 },
            { id: "50", label: "50%", priceAdjustment: 0 },
          ],
        },
      ],
    },
    {
      name: "Ca phe sua da",
      description: "Ca phe phin truyen thong voi sua dac",
      price: 29000,
      categoryId: doUong._id,
      isAvailable: true,
      sortOrder: 1,
    },
    {
      name: "Nuoc ep cam",
      description: "Cam tuoi ep nguyen chat",
      price: 40000,
      categoryId: doUong._id,
      isAvailable: true,
      sortOrder: 2,
    },
    {
      name: "Sinh to bo",
      description: "Bo dac biet xay cung sua tuoi",
      price: 45000,
      categoryId: doUong._id,
      isAvailable: false,
      sortOrder: 3,
    },
    {
      name: "Com ga nuong",
      description: "Dui ga nuong mat ong kem com trang va rau",
      price: 65000,
      categoryId: monChinh._id,
      isAvailable: true,
      sortOrder: 0,
    },
    {
      name: "Pho bo tai",
      description: "Pho bo Bac truyen thong voi thit bo tai",
      price: 55000,
      categoryId: monChinh._id,
      isAvailable: true,
      sortOrder: 1,
    },
    {
      name: "Bun cha Ha Noi",
      description: "Bun cha nuong than hoa kem nuoc mam chua ngot",
      price: 50000,
      categoryId: monChinh._id,
      isAvailable: true,
      sortOrder: 2,
    },
    {
      name: "Mi xao bo",
      description: "Mi trung xao voi bo mem va rau cu",
      price: 60000,
      categoryId: monChinh._id,
      isAvailable: true,
      sortOrder: 3,
    },
    {
      name: "Goi cuon tom thit",
      description: "Goi cuon tuoi voi tom, thit, bun va rau song",
      price: 35000,
      categoryId: monPhu._id,
      isAvailable: true,
      sortOrder: 0,
    },
    {
      name: "Khoai lang chien",
      description: "Khoai lang chien gion vang",
      price: 25000,
      categoryId: monPhu._id,
      isAvailable: true,
      sortOrder: 1,
    },
    {
      name: "Salad tron dau giam",
      description: "Rau cu tuoi tron sot dau giam",
      price: 30000,
      categoryId: monPhu._id,
      isAvailable: true,
      sortOrder: 2,
    },
    {
      name: "Che khuc bach",
      description: "Che mat lanh voi thach va nuoc cot dua",
      price: 30000,
      categoryId: trangMieng._id,
      isAvailable: true,
      sortOrder: 0,
    },
    {
      name: "Banh flan",
      description: "Banh flan mem min voi caramel",
      price: 25000,
      categoryId: trangMieng._id,
      isAvailable: true,
      sortOrder: 1,
    },
  ]);
  console.log(`Created ${menuItems.length} menu items`);

  await mongoose.disconnect();
  console.log("Seed completed!");
}

seed().catch((e) => {
  console.error("Seed error:", e);
  process.exit(1);
});
