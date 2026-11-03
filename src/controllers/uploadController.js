import path from 'path';
import fs from 'fs';
import mongoose from 'mongoose';
import { fileURLToPath } from 'url';
import { config } from '../config/env.js';
import { storageDriver, saveToGridFS, deleteFromGridFS } from '../config/storage.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Builds a URL for an uploaded file that works in every environment:
 *  - production: PUBLIC_URL + path  (https://campushub-api.onrender.com/uploads/x.jpg)
 *  - dev:        /uploads/x.jpg      (relative — the frontend prefixes its API origin)
 *
 * Returning a RELATIVE path by default is the key production fix: the old code
 * hardcoded `req.protocol://host`, which produced http://localhost:5000/... URLs
 * inside the database as soon as the app was deployed.
 */
const buildUrl = (req, relativePath) => {
  if (config.publicUrl) {
    return `${config.publicUrl.replace(/\/$/, '')}${relativePath}`;
  }
  // Behind a reverse proxy (Render/nginx) express doesn't know the public
  // protocol/host unless `trust proxy` is set — detect it when available.
  const host = req.get('host');
  if (host && host.includes('localhost')) {
    return `${req.protocol}://${host}${relativePath}`;
  }
  return relativePath;
};

const GRIDFS_URL_ID = /^[a-f\d]{24}$/i;

// @desc    Upload a single image, return its URL
// @route   POST /api/upload
// @access  Private
export const uploadImage = async (req, res, next) => {
  try {
    if (!req.file) {
      res.status(400);
      throw new Error('No file was uploaded');
    }

    if (storageDriver === 'gridfs') {
      // Buffer (multer memoryStorage) -> MongoDB. URL shape: /uploads/<id>/<name>
      const id = await saveToGridFS(req.file.buffer, req.file.filename, req.file.mimetype);
      return res.status(201).json({
        imageUrl: buildUrl(req, `/uploads/${id}/${req.file.filename}`)
      });
    }

    // Local disk driver: multer already saved the file
    res.status(201).json({ imageUrl: buildUrl(req, `/uploads/${req.file.filename}`) });
  } catch (error) {
    next(error);
  }
};

// @desc    Upload a course-notes document (PDF/DOC/PPT/TXT/ZIP)
// @route   POST /api/upload/note
// @access  Private
export const uploadNoteFile = async (req, res, next) => {
  try {
    if (!req.file) {
      res.status(400);
      throw new Error('No file was uploaded');
    }

    const sizeLabel = `${(req.file.size / (1024 * 1024)).toFixed(2)} MB`;

    if (storageDriver === 'gridfs') {
      const id = await saveToGridFS(req.file.buffer, req.file.filename, req.file.mimetype);
      return res.status(201).json({
        fileUrl: buildUrl(req, `/uploads/${id}/${req.file.filename}`),
        fileName: req.file.originalname,
        fileSize: sizeLabel
      });
    }

    res.status(201).json({
      fileUrl: buildUrl(req, `/uploads/notes/${req.file.filename}`),
      fileName: req.file.originalname,
      fileSize: sizeLabel
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Remove an uploaded file (owner cleans up after themselves)
// @route   DELETE /api/upload?path=/uploads/notes/x.pdf  (local)
//          DELETE /api/upload?path=/uploads/<gridfsId>/x.pdf  (gridfs)
// @access  Private
export const deleteUploadedFile = async (req, res, next) => {
  try {
    const raw = String(req.query.path || '');
    // Only ever allow deleting inside our uploads namespace (path traversal guard)
    const relative = raw.replace(/^\/uploads\/?/, '');
    if (!relative || relative.includes('..') || path.isAbsolute(relative)) {
      res.status(400);
      throw new Error('Invalid file path');
    }

    // GridFS URLs are /uploads/<objectId>/<filename>
    const [firstSegment] = relative.split('/');
    if (GRIDFS_URL_ID.test(firstSegment)) {
      if (!mongoose.isValidObjectId(firstSegment)) {
        res.status(400);
        throw new Error('Invalid file path');
      }
      await deleteFromGridFS(firstSegment);
      return res.json({ message: 'File removed' });
    }

    // Local driver: only inside the uploads folder
    const uploadsRoot = path.resolve(__dirname, '../../uploads');
    const fullPath = path.resolve(uploadsRoot, relative);
    if (!fullPath.startsWith(uploadsRoot)) {
      res.status(400);
      throw new Error('Invalid file path');
    }

    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
    res.json({ message: 'File removed' });
  } catch (error) {
    next(error);
  }
};
