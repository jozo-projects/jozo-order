import mongoose, { Schema, type InferSchemaType } from "mongoose";

const optionChoiceSchema = new Schema(
  {
    id: { type: String, required: true },
    label: { type: String, required: true },
    priceAdjustment: { type: Number, default: 0 },
  },
  { _id: false }
);

const optionSchema = new Schema(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
    choices: [optionChoiceSchema],
  },
  { _id: false }
);

const menuItemSchema = new Schema(
  {
    name: { type: String, required: true },
    description: { type: String, default: "" },
    price: { type: Number, required: true },
    image: { type: String, default: null },
    categoryId: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    isAvailable: { type: Boolean, default: true },
    options: { type: [optionSchema], default: [] },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export type IMenuItem = InferSchemaType<typeof menuItemSchema> & {
  _id: string;
};

export const MenuItem =
  mongoose.models.MenuItem || mongoose.model("MenuItem", menuItemSchema);
