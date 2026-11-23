import mongoose from 'mongoose';

const profileSchema = new mongoose.Schema({
  key: { type: String, default: 'main', unique: true },
  name: { type: String, required: true },
  typingTitles: { type: [String], default: [] },
  introOne: { type: String, default: '' },
  introTwo: { type: String, default: '' },
  location: { type: String, default: '' },
  status: { type: String, default: '' },
  socials: {
    github: { type: String, default: '' },
    linkedin: { type: String, default: '' },
    instagram: { type: String, default: '' }
  },
  aboutSummary: { type: String, default: '' },
  skills: { type: [String], default: [] },
  email: { type: String, default: '' }
}, { timestamps: true });

const educationSchema = new mongoose.Schema({
  degree: { type: String, required: true, trim: true },
  institution: { type: String, required: true, trim: true },
  years: { type: String, default: '', trim: true },
  notes: { type: String, default: '', trim: true }
}, { timestamps: true });

const projectSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  githubUrl: { type: String, required: true, trim: true },
  description: { type: String, default: '', trim: true },
  status: { type: String, enum: ['Planned', 'In Progress', 'Completed', 'On Hold'], default: 'Planned' }
}, { timestamps: true });

const messageSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, trim: true, lowercase: true },
  message: { type: String, required: true, trim: true },
  read: { type: Boolean, default: false }
}, { timestamps: true });

const resumeSchema = new mongoose.Schema({
  key: { type: String, default: 'main', unique: true },
  originalName: { type: String, required: true },
  storedName: { type: String, required: true },
  uploadedAt: { type: Date, default: Date.now }
});

export const Profile = mongoose.models.Profile || mongoose.model('Profile', profileSchema);
export const Education = mongoose.models.Education || mongoose.model('Education', educationSchema);
export const Project = mongoose.models.Project || mongoose.model('Project', projectSchema);
export const Message = mongoose.models.Message || mongoose.model('Message', messageSchema);
export const Resume = mongoose.models.Resume || mongoose.model('Resume', resumeSchema);
