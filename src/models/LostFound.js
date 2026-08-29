import mongoose from 'mongoose';

const lostFoundSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    title: {
      type: String,
      required: [true, 'Please add a title'],
      trim: true
    },
    description: {
      type: String,
      required: [true, 'Please add a description']
    },
    type: {
      type: String,
      enum: ['lost', 'found'],
      required: [true, 'Specify whether item is lost or found']
    },
    category: {
      type: String,
      required: [true, 'Please add a category'],
      default: 'General'
    },
    location: {
      type: String,
      required: [true, 'Please specify location where item was lost/found']
    },
    image: {
      type: String,
      default: ''
    },
    claimedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    status: {
      type: String,
      enum: ['open', 'claimed', 'resolved'],
      default: 'open'
    }
  },
  { timestamps: true }
);

const LostFound = mongoose.model('LostFound', lostFoundSchema);
export default LostFound;