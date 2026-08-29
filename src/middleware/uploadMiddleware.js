// Express payload handles base64 string uploads up to 10MB by default
// If using Multer later, configure it here.
export const parseImagePayload = (req, res, next) => {
  // Pass-through validation for base64 or URL image payloads
  next();
};