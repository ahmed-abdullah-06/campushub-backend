import mongoose from 'mongoose';

const skillRequestSchema = new mongoose.Schema(
  {
    fromUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    toUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    skillOffered: { type: String, required: true },
    skillWanted: { type: String, required: true },
    message: { type: String, default: '' },
    status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
    sentAt: { type: String, default: () => new Date().toISOString() }
  },
  { timestamps: true }
);

export default mongoose.model('SkillRequest', skillRequestSchema);