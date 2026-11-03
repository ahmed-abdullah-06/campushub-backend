import mongoose from 'mongoose';

const noteSchema = new mongoose.Schema(
  {
    uploader: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    uploaderName: { type: String, default: 'Student' },
    title: { type: String, required: true },
    courseCode: { type: String, required: true },
    department: { type: String, default: 'Computer Science' },
    description: { type: String, default: '' },
    fileSize: { type: String, default: '2.5 MB' },
    fileUrl: { type: String, default: '' },
    downloads: { type: Number, default: 0 },
    rating: { type: Number, default: 5.0 },
    ratingCount: { type: Number, default: 0 },
    // One entry per student so a single account can't inflate the average.
    ratings: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        value: { type: Number, min: 1, max: 5 }
      }
    ],
    pages: { type: Number, default: 10 }
  },
  { timestamps: true }
);

export default mongoose.model('Note', noteSchema);