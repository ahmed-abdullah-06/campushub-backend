import mongoose from 'mongoose';
import { config } from './env.js';

export const connectDB = async () => {
  try {
    const conn = await mongoose.connect(config.mongoUri, {
      serverSelectionTimeoutMS: 3000
    });
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.warn(`⚠️ MongoDB Connection Warning (${error.message}). Express API server will proceed.`);
  }
};