import mongoose from "mongoose";

const globalForMongoose = globalThis as unknown as {
  mongoosePromise: Promise<typeof mongoose> | undefined;
};

export function connectDB(): Promise<typeof mongoose> {
  const mongodbUri = process.env.MONGODB_URI;
  if (!mongodbUri) {
    throw new Error("MONGODB_URI is not defined in environment variables");
  }

  if (globalForMongoose.mongoosePromise) {
    return globalForMongoose.mongoosePromise;
  }

  globalForMongoose.mongoosePromise = mongoose.connect(mongodbUri);
  return globalForMongoose.mongoosePromise;
}
