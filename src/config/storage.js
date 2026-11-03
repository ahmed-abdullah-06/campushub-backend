import mongoose from 'mongoose';
import { config } from '../config/env.js';

// ---------------------------------------------------------------------------
// Upload storage.
//
//  - 'local'  : files saved to backend/uploads on disk (default in dev).
//  - 'gridfs' : files stored inside MongoDB itself (default in production).
//
// Most cloud hosts (Render, Railway, Heroku free/eco tiers) have an EPHEMERAL
// filesystem: every redeploy wipes backend/uploads. GridFS stores the files in
// the database instead, so images and notes survive redeploys with no extra
// services or buckets to configure.
// ---------------------------------------------------------------------------

export const storageDriver = process.env.UPLOAD_STORAGE
  || (config.isProduction ? 'gridfs' : 'local');

let bucket = null;

/** Lazily create the GridFS bucket once the MongoDB connection is ready. */
const getBucket = () => {
  if (!bucket) {
    if (!mongoose.connection?.db) {
      throw new Error('GridFS storage requires an active MongoDB connection');
    }
    bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
      bucketName: 'uploads'
    });
  }
  return bucket;
};

/**
 * Saves a multer memory-buffer to GridFS.
 * @param {Buffer} buffer - file content
 * @param {string} filename - unique filename (keep the extension!)
 * @param {string} contentType - original mime type
 * @returns {Promise<string>} the GridFS file id (as a string)
 */
export const saveToGridFS = async (buffer, filename, contentType) => {
  const b = getBucket();
  const id = new mongoose.Types.ObjectId();
  const uploadStream = b.openUploadStreamWithId(id, filename, {
    contentType,
    metadata: { uploadedAt: new Date() }
  });

  return new Promise((resolve, reject) => {
    uploadStream.on('error', reject);
    uploadStream.on('finish', () => resolve(id.toString()));
    uploadStream.end(buffer);
  });
};

/** Deletes a file from GridFS by id. Missing files are not an error. */
export const deleteFromGridFS = async (id) => {
  try {
    const b = getBucket();
    await b.delete(new mongoose.Types.ObjectId(id));
  } catch (error) {
    // File may already be gone (deleted twice) — not fatal.
    if (error?.code !== 'ENOENT' && error?.message !== 'file not found') {
      console.warn('GridFS delete failed:', error.message);
    }
  }
};

/** Opens a readable stream for a GridFS file id (used by the /uploads route). */
export const openGridFSStream = (id) => {
  const b = getBucket();
  return b.openDownloadStream(new mongoose.Types.ObjectId(id));
};

/** Fetches the stored metadata (filename, content type) for a GridFS file. */
export const findGridFSFile = async (id) => {
  const b = getBucket();
  const files = await b.find({ _id: new mongoose.Types.ObjectId(id) }).toArray();
  return files[0] || null;
};
