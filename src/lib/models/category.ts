import mongoose, { Schema, type InferSchemaType } from "mongoose";

const categorySchema = new Schema(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export type ICategory = InferSchemaType<typeof categorySchema> & {
  _id: string;
};

export const Category =
  mongoose.models.Category || mongoose.model("Category", categorySchema);
