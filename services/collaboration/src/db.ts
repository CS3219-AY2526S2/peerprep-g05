import mongoose from "mongoose";
import { config } from "@/config.js";

export const connectDB = async (): Promise<void> => {
  try {
    await mongoose.connect(config.MONGO_URI);
    console.log("MongoDB connected");
    return;
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};
