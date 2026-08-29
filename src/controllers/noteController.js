import Note from '../models/Note.js';

export const getNotes = async (req, res, next) => {
  try {
    const notes = await Note.find().sort({ createdAt: -1 });
    res.json(notes);
  } catch (error) { next(error); }
};

export const createNote = async (req, res, next) => {
  try {
    const { title, courseCode, department, description, fileSize, fileUrl, pages } = req.body;
    const newNote = await Note.create({
      uploader: req.user ? req.user._id : null,
      uploaderName: req.user ? req.user.name : 'Student Uploader',
      title,
      courseCode,
      department: department || 'General',
      description: description || '',
      fileSize: fileSize || '2.5 MB',
      fileUrl: fileUrl || '',
      pages: Number(pages) || 5
    });
    res.status(201).json(newNote);
  } catch (error) { next(error); }
};

export const incrementDownloads = async (req, res, next) => {
  try {
    const note = await Note.findById(req.params.id);
    if (!note) {
      res.status(404);
      throw new Error('Note not found');
    }
    note.downloads = (note.downloads || 0) + 1;
    await note.save();
    res.json(note);
  } catch (error) { next(error); }
};
