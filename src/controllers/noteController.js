import Note from '../models/Note.js';
import { clearNotificationsFor } from '../utils/notificationService.js';

const canManage = (req, doc) => {
  if (!req.user) return false;
  return req.user.role === 'admin' || String(doc.uploader) === String(req.user._id);
};

const recalculateRating = (note) => {
  const ratings = note.ratings || [];
  if (ratings.length === 0) {
    note.rating = 0;
    note.ratingCount = 0;
    return;
  }
  const total = ratings.reduce((sum, r) => sum + r.value, 0);
  note.rating = Math.round((total / ratings.length) * 10) / 10;
  note.ratingCount = ratings.length;
};

export const getNotes = async (req, res, next) => {
  try {
    const { department, courseCode, search } = req.query;
    let query = {};
    if (department) query.department = department;
    if (courseCode) query.courseCode = courseCode;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { courseCode: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const notes = await Note.find(query)
      .populate('uploader', 'name email avatar')
      .sort({ createdAt: -1 });

    res.json(notes);
  } catch (error) {
    next(error);
  }
};

export const createNote = async (req, res, next) => {
  try {
    const { title, courseCode, department, description, fileSize, fileUrl, pages, subject } = req.body;

    if (!title || !courseCode) {
      res.status(400);
      throw new Error('Please provide a title and a course code');
    }

    const newNote = await Note.create({
      uploader: req.user._id,
      uploaderName: req.user.name,
      title,
      courseCode,
      department: department || subject || 'General',
      description: description || '',
      fileSize: fileSize || '2.5 MB',
      fileUrl: fileUrl || '',
      pages: Number(pages) || 5
    });

    res.status(201).json(await newNote.populate('uploader', 'name email avatar'));
  } catch (error) {
    next(error);
  }
};

// @desc    Record a download so the counter on the card is real
// @route   PUT /api/notes/:id/download
// @access  Private
export const incrementDownloads = async (req, res, next) => {
  try {
    const note = await Note.findByIdAndUpdate(
      req.params.id,
      { $inc: { downloads: 1 } },
      { new: true }
    );
    if (!note) {
      res.status(404);
      throw new Error('Note not found');
    }
    res.json(note);
  } catch (error) {
    next(error);
  }
};

// @desc    Rate a note 1-5 stars (one vote per student, re-ratings replace the old value)
// @route   PUT /api/notes/:id/rate
// @access  Private
export const rateNote = async (req, res, next) => {
  try {
    const value = Number(req.body.rating);
    if (!Number.isFinite(value) || value < 1 || value > 5) {
      res.status(400);
      throw new Error('Rating must be a number between 1 and 5');
    }

    const note = await Note.findById(req.params.id);
    if (!note) {
      res.status(404);
      throw new Error('Note not found');
    }

    const rounded = Math.round(value);
    const existing = (note.ratings || []).find(
      (r) => String(r.user) === String(req.user._id)
    );

    if (existing) {
      existing.value = rounded;
    } else {
      note.ratings.push({ user: req.user._id, value: rounded });
    }

    recalculateRating(note);
    await note.save();
    res.json(note);
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a note (uploader or admin)
// @route   DELETE /api/notes/:id
// @access  Private
export const deleteNote = async (req, res, next) => {
  try {
    const note = await Note.findById(req.params.id);
    if (!note) {
      res.status(404);
      throw new Error('Note not found');
    }
    if (!canManage(req, note)) {
      res.status(403);
      throw new Error('Only the uploader or an admin can delete this note');
    }

    await note.deleteOne();
    await clearNotificationsFor(note._id);
    res.json({ message: 'Note deleted successfully' });
  } catch (error) {
    next(error);
  }
};
