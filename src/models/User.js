import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please add a name'],
      trim: true
    },
    email: {
      type: String,
      required: [true, 'Please add an email'],
      unique: true,
      lowercase: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please add a valid email']
    },
    password: {
      type: String,
      required: [true, 'Please add a password'],
      minlength: 6
    },
    role: {
    type: String,
    enum: ['student', 'faculty', 'staff', 'alumni', 'admin'],
    default: 'student'
    },
    avatar: {
      type: String,
      default: ''
    },
    // New fields — CampusHub serves the whole campus (staff, faculty, alumni, clubs, not just students),
    // so these are free-text rather than a locked "student-only" dropdown.
    university: {
      type: String,
      default: 'State University',
      trim: true
    },
    major: {
      type: String,
      default: '',
      trim: true
    },
    year: {
      type: String,
      default: '',
      trim: true
    },
    bio: {
      type: String,
      default: '',
      trim: true,
      maxlength: 500
    }
  },
  { timestamps: true }
);

const User = mongoose.model('User', userSchema);
export default User;