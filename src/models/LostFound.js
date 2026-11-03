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
    // Date the item was lost/found (displayed on the post card)
    dateLost: {
      type: String,
      default: ''
    },
    // Claim workflow: a student claims a FOUND item (or the finder claims a
    // LOST item) and can leave a short proof message for the poster.
    claimedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    claimNote: {
      type: String,
      trim: true,
      maxlength: [500, 'Claim message cannot exceed 500 characters'],
      default: ''
    },
    claimedAt: {
      type: Date,
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