import mongoose, { Schema, type InferSchemaType } from "mongoose";

const orderItemSchema = new Schema(
  {
    menuItemId: { type: String, required: true },
    menuItemName: { type: String, required: true },
    quantity: { type: Number, required: true },
    price: { type: Number, required: true },
    note: { type: String, default: null },
    selectedOptions: { type: Schema.Types.Mixed, default: null },
    status: {
      type: String,
      enum: ["pending", "preparing", "ready", "served", "cancelled"],
      default: "pending",
    },
  },
  { _id: false }
);

const orderSchema = new Schema(
  {
    tableId: {
      type: Schema.Types.ObjectId,
      ref: "CoffeeTable",
      required: true,
    },
    tableCode: { type: String, required: true },
    sessionId: { type: String, default: () => crypto.randomUUID() },
    items: [orderItemSchema],
    status: {
      type: String,
      enum: [
        "pending",
        "confirmed",
        "preparing",
        "ready",
        "served",
        "cancelled",
      ],
      default: "pending",
    },
    totalAmount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export type IOrder = InferSchemaType<typeof orderSchema> & { _id: string };

export const Order =
  mongoose.models.Order || mongoose.model("Order", orderSchema);
