import mongoose from 'mongoose';

const commentSchema = new mongoose.Schema({
  authorName: { type: String, default: 'Student' },
  text: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const eventSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  location: { type: String, required: true },
  date: { type: Date, required: true },
  category: { type: String, default: 'General' },
  organizer: { type: String, default: 'Campus Council' },
  faculty: { type: String, default: 'Engineering' },
  imageUrl: { type: String, default: '' },
  creatorKey: { type: String, required: true },
  announcement: { type: String, default: '' },
  enableCounter: { type: Boolean, default: false },
  goingCount: { type: Number, default: 0 },
  likes: { type: Number, default: 0 },
  comments: [commentSchema]
}, { timestamps: true });

export default mongoose.models.Event || mongoose.model('Event', eventSchema);