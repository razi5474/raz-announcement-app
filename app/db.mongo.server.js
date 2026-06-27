import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error("Please define MONGODB_URI in your .env file");
}

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

export async function connectMongo() {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI).then((m) => m);
  }

  cached.conn = await cached.promise;
  return cached.conn;
}

// Schema: saves text + timestamp for audit history
const AnnouncementSchema = new mongoose.Schema({
  shop: String,
  text: String,
  createdAt: { type: Date, default: Date.now },
});

export const Announcement =
  mongoose.models.Announcement ||
  mongoose.model("Announcement", AnnouncementSchema);