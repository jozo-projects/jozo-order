import { connectDB } from "@/lib/mongodb";
import { CoffeeTable } from "@/lib/models/table";
import { Order } from "@/lib/models/order";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();
    const { tableCode, items } = body as {
      tableCode: string;
      items: {
        menuItemId: string;
        menuItemName: string;
        quantity: number;
        price: number;
        note?: string;
        selectedOptions?: Record<string, string>;
      }[];
    };

    if (!tableCode || !items?.length) {
      return NextResponse.json(
        { success: false, message: "Thieu thong tin ban hoac mon" },
        { status: 400 }
      );
    }

    const table = await CoffeeTable.findOne({
      code: tableCode,
      isActive: true,
    }).lean();

    if (!table) {
      return NextResponse.json(
        { success: false, message: "Ban khong ton tai" },
        { status: 404 }
      );
    }

    const totalAmount = items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );

    const order = await Order.create({
      tableId: table._id,
      tableCode,
      items: items.map((item) => ({
        menuItemId: item.menuItemId,
        menuItemName: item.menuItemName,
        quantity: item.quantity,
        price: item.price,
        note: item.note ?? null,
        selectedOptions: item.selectedOptions ?? null,
        status: "pending",
      })),
      status: "pending",
      totalAmount,
    });

    return NextResponse.json({ success: true, data: order }, { status: 201 });
  } catch (error) {
    console.error("Create order error:", error);
    return NextResponse.json(
      { success: false, message: "Loi he thong" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const tableCode = searchParams.get("tableCode");

    if (!tableCode) {
      return NextResponse.json(
        { success: false, message: "Thieu ma ban" },
        { status: 400 }
      );
    }

    const table = await CoffeeTable.findOne({
      code: tableCode,
      isActive: true,
    }).lean();

    if (!table) {
      return NextResponse.json(
        { success: false, message: "Ban khong ton tai" },
        { status: 404 }
      );
    }

    const orders = await Order.find({ tableId: table._id })
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ success: true, data: orders });
  } catch (error) {
    console.error("Get orders error:", error);
    return NextResponse.json(
      { success: false, message: "Loi he thong" },
      { status: 500 }
    );
  }
}
