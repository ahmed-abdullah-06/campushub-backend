import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { storageDriver } from '../config/storage.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Files get saved to backend/uploads — created automatically if it doesn't exist yet
const uploadDir = path.resolve(__dirname, '../../uploads');
const noteDir = path.resolve(uploadDir, 'notes');
if (storageDriver === 'local') {
  for (const dir of [uploadDir, noteDir]) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
}

const makeFilename = (file) => {
  // Unique filename: timestamp + random number + original extension
  // e.g. "1735689234567-482910384.jpg" — prevents two uploads ever overwriting each other
  const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
  const ext = path.extname(file.originalname).toLowerCase().slice(0, 10);
  return `${uniqueSuffix}${ext}`;
};

// 'local' writes straight to disk (dev default). 'gridfs' buffers the file in
// memory so the controller can store it inside MongoDB instead — this is the
// production default because cloud filesystems are wiped on every redeploy.
const diskStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Note attachments live in their own sub-folder to keep images tidy
    cb(null, file.fieldname === 'file' ? noteDir : uploadDir);
  },
  filename: (req, file, cb) => cb(null, makeFilename(file))
});

const memoryStorage = multer.memoryStorage();

const storage = storageDriver === 'gridfs' ? memoryStorage : diskStorage;

const imageFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPG, PNG, WEBP, and GIF images are allowed'), false);
  }
};

// Notes are documents, not images. Restricted to common course-material types.
const documentFilter = (req, file, cb) => {
  const allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'application/zip'
  ];
  const allowedExt = ['.pdf', '.doc', '.docx', '.ppt', '.pptx', '.txt', '.zip'];
  const ext = path.extname(file.originalname).toLowerCase();

  if (allowedTypes.includes(file.mimetype) || allowedExt.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Notes must be PDF, DOC/DOCX, PPT/PPTX, TXT or ZIP files'), false);
  }
};

export const upload = multer({
  storage,
  fileFilter: imageFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB max per image
});

// Separate multer instance for course notes (field name: 'file')
export const uploadNote = multer({
  storage,
  fileFilter: documentFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB max per document
});

// In gridfs mode (memoryStorage) multer never generates a filename — this
// middleware attaches one so the controller can build the stored URL uniformly.
export const attachFilename = (req, res, cb) => {
  if (req.file && !req.file.filename) {
    req.file.filename = makeFilename(req.file);
  }
  cb();
};
