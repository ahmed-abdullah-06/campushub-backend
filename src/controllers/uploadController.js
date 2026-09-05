// @desc    Upload a single image, return its public URL
// @route   POST /api/upload
// @access  Private
export const uploadImage = (req, res, next) => {
  try {
    if (!req.file) {
      res.status(400);
      throw new Error('No file was uploaded');
    }
    // req.file.filename is set by multer's diskStorage (see uploadMiddleware.js)
    // The frontend just needs this URL back to attach to a Lost & Found / Marketplace post
    const imageUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    res.status(201).json({ imageUrl });
  } catch (error) {
    next(error);
  }
};