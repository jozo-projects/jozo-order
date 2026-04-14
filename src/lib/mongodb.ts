import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI!;

if (!MONGODB_URI) {
  throw new Error("MONGODB_URI is not defined in environment variables");
}

const globalForMongoose = globalThis as unknown as {
  mongoosePromise: Promise<typeof mongoose> | undefined;
};

export function connectDB(): Promise<typeof mongoose> {
  if (globalForMongoose.mongoosePromise) {
    return globalForMongoose.mongoosePromise;
  }

  globalForMongoose.mongoosePromise = mongoose.connect(MONGODB_URI);
  return globalForMongoose.mongoosePromise;
}
