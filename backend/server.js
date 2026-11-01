import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';
import Event from './models/Event.js';
import User from './models/User.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

// Connect to MongoDB
mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch((err) => console.error('❌ MongoDB Connection Error:', err.message));

const otpStore = new Map();

// --- EVENT API ENDPOINTS ---
app.get('/api/events', async (req, res) => {
  try {
    const events = await Event.find({}).sort({ createdAt: -1 });
    res.json(Array.isArray(events) ? events : []);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching events', data: [] });
  }
});

app.post('/api/events', async (req, res) => {
  try {
    const newEvent = new Event(req.body);
    const saved = await newEvent.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

app.put('/api/events/:id', async (req, res) => {
  try {
    const updated = await Event.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

app.delete('/api/events/:id', async (req, res) => {
  try {
    await Event.findByIdAndDelete(req.params.id);
    res.json({ message: 'Event deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.patch('/api/events/:id/rsvp', async (req, res) => {
  try {
    const { action } = req.body;
    const increment = action === 'inc' ? 1 : -1;
    const updated = await Event.findByIdAndUpdate(
      req.params.id,
      { $inc: { goingCount: increment } },
      { new: true }
    );
    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

app.post('/api/events/:id/comments', async (req, res) => {
  try {
    const { authorName, text } = req.body;
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found' });

    event.comments.push({ authorName, text });
    const saved = await event.save();
    res.json(saved);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// --- AUTH API ENDPOINTS ---

// Send real OTP to email
app.post('/api/auth/send-otp', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: 'Email required' });

  // Generate random 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  otpStore.set(email, otp);

  // Gmail transporter
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });

  const mailOptions = {
    from: `"Ruhuna Event Hub" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Your OTP Code - Ruhuna Event Hub',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
        <h2 style="color: #10b981; margin-bottom: 10px;">Ruhuna Event Hub</h2>
        <p>Your One-Time Password (OTP) is:</p>
        <h1 style="letter-spacing: 8px; color: #0f172a; margin: 20px 0;">${otp}</h1>
        <p>This code is valid for 10 minutes.</p>
        <p style="color: #64748b; font-size: 13px;">If you did not request this, please ignore this email.</p>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`OTP sent to ${email}: ${otp}`);
    res.json({ message: 'OTP sent to your email!' });
  } catch (err) {
    console.error('Email error:', err.message);
    res.status(500).json({ message: 'Failed to send OTP. Please try again.' });
  }
});

// Verify OTP and create account
app.post('/api/auth/verify-otp', async (req, res) => {
  const { email, otp, username, password } = req.body;
  const storedOtp = otpStore.get(email);

  if (!storedOtp || storedOtp !== otp) {
    return res.status(400).json({ message: 'Invalid or expired OTP code' });
  }

  try {
    let user = await User.findOne({ email });
    if (!user) {
      user = new User({ email, username, password });
      await user.save();
    }
    otpStore.delete(email);
    res.json({ user: { id: user._id, username: user.username, email: user.email } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email, password });
    if (!user) return res.status(401).json({ message: 'Invalid email or password' });

    res.json({ user: { id: user._id, username: user.username, email: user.email } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Backend running on http://localhost:${PORT}`);
});