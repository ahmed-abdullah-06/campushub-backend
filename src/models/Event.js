import mongoose from 'mongoose';

const eventSchema = new mongoose.Schema(
  {
    organizer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    organizerName: { type: String, default: 'Student Community' },
    title: { type: String, required: true },
    description: { type: String, required: true },
    date: { type: String, required: true },
    time: { type: String, default: '10:00 AM' },
    endTime: { type: String, default: '12:00 PM' },
    location: { type: String, required: true },
    capacity: { type: Number, default: 50 },
    attendees: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    attendeeCount: { type: Number, default: 1 },
    category: { type: String, default: 'Academic' },
    image: { type: String, default: '' }
  },
  { timestamps: true }
);

export default mongoose.model('Event', eventSchema);