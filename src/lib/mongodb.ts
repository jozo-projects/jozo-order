import mongoose from "mongoose";

const globalForMongoose = globalThis as unknown as {
  mongoosePromise: Promise<typeof mongoose> | undefined;
};

function maskMongoUri(uri: string): string {
  try {
    const parsed = new URL(uri);
    if (parsed.password) {
      parsed.password = "***";
    }
    return parsed.toString();
  } catch {
    // Fallback for malformed URI: still avoid exposing credentials.
    return uri.replace(/\/\/([^:/?#]+):([^@/]+)@/, "//$1:***@");
  }
}

type MongoEnvKey =
  | "DB_USER"
  | "DB_PASSWORD"
  | "VPS_IP"
  | "DB_NAME"
  | "VPS_PORT"
  | "VPS_AUTH_SOURCE";

function getRequiredEnv(
  key: Extract<MongoEnvKey, "DB_USER" | "DB_PASSWORD" | "VPS_IP" | "DB_NAME">,
): string {
  const value = process.env[key]?.trim();
  if (!value) {
    throw new Error(`${key} is not defined in environment variables`);
  }
  return value;
}

export function buildMongoUriFromEnv(): string {
  const user = encodeURIComponent(getRequiredEnv("DB_USER"));
  const password = encodeURIComponent(getRequiredEnv("DB_PASSWORD"));
  const host = getRequiredEnv("VPS_IP");
  const dbName = getRequiredEnv("DB_NAME");
  const port = process.env.VPS_PORT?.trim() || "27017";
  const authSource = process.env.VPS_AUTH_SOURCE?.trim() || "admin";
  return `mongodb://${user}:${password}@${host}:${port}/${dbName}?authSource=${authSource}`;
}

export function connectDB(): Promise<typeof mongoose> {
  const mongodbUri = buildMongoUriFromEnv();

  if (globalForMongoose.mongoosePromise) {
    return globalForMongoose.mongoosePromise;
  }

  globalForMongoose.mongoosePromise = mongoose
    .connect(mongodbUri, {
      serverSelectionTimeoutMS: 8000,
      maxPoolSize: 10,
    })
    .catch((error) => {
      // Allow next request to retry a fresh connection.
      globalForMongoose.mongoosePromise = undefined;
      console.error("MongoDB connect error:", {
        message: error instanceof Error ? error.message : String(error),
        uri: maskMongoUri(mongodbUri),
      });
      throw error;
    });

  return globalForMongoose.mongoosePromise;
}
