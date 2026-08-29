import mongoose from 'mongoose';

const skillSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    userName: { type: String, required: true },
    major: { type: String, default: 'Computer Science' },
    university: { type: String, default: 'Campus' },
    offeredSkills: [{ type: String }],
    wantedSkills: [{ type: String }],
    rating: { type: Number, default: 4.8 },
    ratingCount: { type: Number, default: 12 },
    bio: { type: String, default: '' },
    avatar: { type: String, default: '' }
  },
  { timestamps: true }
);

export default mongoose.model('Skill', skillSchema);