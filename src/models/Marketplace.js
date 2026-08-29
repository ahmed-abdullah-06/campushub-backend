import mongoose from 'mongoose';

const marketplaceSchema = new mongoose.Schema(
  {
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    title: {
      type: String,
      required: [true, 'Please add an item title'],
      trim: true
    },
    description: {
      type: String,
      required: [true, 'Please add a description']
    },
    price: {
      type: Number,
      required: [true, 'Please add a price'],
      min: [0, 'Price cannot be negative']
    },
    category: {
      type: String,
      required: [true, 'Please select a category'],
      default: 'Other'
    },
    image: {
      type: String,
      default: ''
    },
    status: {
      type: String,
      enum: ['available', 'sold'],
      default: 'available'
    }
  },
  { timestamps: true }
);

const Marketplace = mongoose.model('Marketplace', marketplaceSchema);
export default Marketplace;