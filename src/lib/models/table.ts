import mongoose, { Schema, type InferSchemaType } from "mongoose";

const coffeeTableSchema = new Schema(
  {
    code: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    isActive: { type: Boolean, default: true },
    description: { type: String },
    createdBy: { type: String },
    updatedBy: { type: String },
  },
  { timestamps: true, collection: "coffee_tables" }
);

export type ICoffeeTable = InferSchemaType<typeof coffeeTableSchema> & {
  _id: string;
};

export const CoffeeTable =
  mongoose.models.CoffeeTable ||
  mongoose.model("CoffeeTable", coffeeTableSchema);
