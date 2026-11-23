import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import multer from 'multer';
import { body, param, validationResult } from 'express-validator';
import { Education, Message, Profile, Project, Resume } from './models.js';
import { COOKIE_NAME, cookieOptions, createAdminToken, credentialsMatch, requireAdmin } from './auth.js';

const router = express.Router();
const here = path.dirname(fileURLToPath(import.meta.url));
export const uploadDirectory = path.resolve(here, '../uploads');
await fs.mkdir(uploadDirectory, { recursive: true });

function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ message: 'Please check the submitted fields.', errors: errors.array() });
  next();
}

function asyncRoute(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

const loginLimit = (await import('express-rate-limit')).rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message: 'Too many login attempts. Try again in 15 minutes.' },
  skipSuccessfulRequests: true
});

const pdfUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, done) => done(null, uploadDirectory),
    filename: (_req, _file, done) => done(null, `${crypto.randomUUID()}.pdf`)
  }),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, done) => {
    const allowedType = ['application/pdf', 'application/octet-stream'].includes(file.mimetype);
    const isPdf = allowedType && path.extname(file.originalname).toLowerCase() === '.pdf';
    done(isPdf ? null : new Error('Upload a PDF file.'), isPdf);
  }
});

router.get('/profile', asyncRoute(async (_req, res) => {
  const [profile, education, resume] = await Promise.all([
    Profile.findOne({ key: 'main' }).lean(),
    Education.find().sort({ createdAt: 1 }).lean(),
    Resume.findOne({ key: 'main' }).lean()
  ]);
  if (!profile) return res.status(404).json({ message: 'Profile is not available.' });
  res.json({
    profile,
    education,
    resume: resume ? { originalName: resume.originalName, uploadedAt: resume.uploadedAt } : null
  });
}));

router.get('/projects', asyncRoute(async (_req, res) => {
  const projects = await Project.find().sort({ createdAt: -1 }).lean();
  res.json(projects);
}));

router.post('/contact', [
  body('name').isString().trim().isLength({ min: 1, max: 100 }),
  body('email').isEmail().normalizeEmail().isLength({ max: 254 }),
  body('message').isString().trim().isLength({ min: 5, max: 5000 })
], validate, asyncRoute(async (req, res) => {
  const saved = await Message.create({ name: req.body.name, email: req.body.email, message: req.body.message });
  res.status(201).json({ message: 'Your message has been sent.', id: saved.id });
}));

router.get('/resume', asyncRoute(async (_req, res) => {
  const resume = await Resume.findOne({ key: 'main' }).lean();
  if (!resume) return res.status(404).json({ message: 'No resume has been uploaded yet.' });
  const filePath = path.join(uploadDirectory, resume.storedName);
  res.download(filePath, resume.originalName, (error) => {
    if (error && !res.headersSent) res.status(404).json({ message: 'Resume file is unavailable.' });
  });
}));

router.post('/admin/login', loginLimit, [
  body('username').isString().trim().isLength({ min: 1, max: 128 }),
  body('password').isString().isLength({ min: 1, max: 256 })
], validate, (req, res) => {
  if (!process.env.ADMIN_USERNAME || !process.env.ADMIN_PASSWORD || !process.env.JWT_SECRET) {
    return res.status(503).json({ message: 'Admin login is not configured.' });
  }
  if (!credentialsMatch(req.body.username, req.body.password)) {
    return res.status(401).json({ message: 'Invalid username or password.' });
  }
  res.cookie(COOKIE_NAME, createAdminToken(), cookieOptions());
  res.json({ message: 'Signed in.' });
});

router.use('/admin', requireAdmin);

router.get('/admin/check-session', (_req, res) => res.json({ authenticated: true }));
router.post('/admin/logout', (_req, res) => {
  res.clearCookie(COOKIE_NAME, { ...cookieOptions(), maxAge: undefined });
  res.json({ message: 'Signed out.' });
});

router.put('/admin/profile', [
  body('name').isString().trim().isLength({ min: 1, max: 120 }),
  body('typingTitles').isArray({ max: 8 }),
  body('typingTitles.*').isString().trim().isLength({ min: 1, max: 100 }),
  body('introOne').isString().trim().isLength({ max: 500 }),
  body('introTwo').isString().trim().isLength({ max: 500 }),
  body('location').isString().trim().isLength({ max: 120 }),
  body('status').isString().trim().isLength({ max: 120 }),
  body('socials').isObject(),
  ...['github', 'linkedin', 'instagram'].map((key) => body(`socials.${key}`).isString().trim().custom((value) => !value || /^https:\/\//i.test(value))),
  body('aboutSummary').isString().trim().isLength({ max: 5000 }),
  body('skills').isArray({ max: 50 }),
  body('skills.*').isString().trim().isLength({ min: 1, max: 80 }),
  body('email').isEmail().normalizeEmail().isLength({ max: 254 })
], validate, asyncRoute(async (req, res) => {
  const allowed = ['name', 'typingTitles', 'introOne', 'introTwo', 'location', 'status', 'socials', 'aboutSummary', 'skills', 'email'];
  const changes = Object.fromEntries(allowed.map((key) => [key, req.body[key]]));
  const profile = await Profile.findOneAndUpdate({ key: 'main' }, { $set: changes }, { new: true, runValidators: true }).lean();
  res.json(profile);
}));

const educationFields = [
  body('degree').isString().trim().isLength({ min: 1, max: 180 }),
  body('institution').isString().trim().isLength({ min: 1, max: 220 }),
  body('years').isString().trim().isLength({ max: 80 }),
  body('notes').isString().trim().isLength({ max: 1500 })
];
router.post('/admin/education', educationFields, validate, asyncRoute(async (req, res) => {
  res.status(201).json(await Education.create({ ...req.body }));
}));
router.put('/admin/education/:id', [param('id').isMongoId(), ...educationFields], validate, asyncRoute(async (req, res) => {
  const entry = await Education.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!entry) return res.status(404).json({ message: 'Education entry not found.' });
  res.json(entry);
}));
router.delete('/admin/education/:id', [param('id').isMongoId()], validate, asyncRoute(async (req, res) => {
  const entry = await Education.findByIdAndDelete(req.params.id);
  if (!entry) return res.status(404).json({ message: 'Education entry not found.' });
  res.json({ message: 'Education entry deleted.' });
}));

const projectFields = [
  body('name').isString().trim().isLength({ min: 1, max: 180 }),
  body('githubUrl').isURL({ protocols: ['http', 'https'], require_protocol: true }).isLength({ max: 500 }),
  body('description').isString().trim().isLength({ max: 3000 }),
  body('status').isIn(['Planned', 'In Progress', 'Completed', 'On Hold'])
];
router.post('/admin/projects', projectFields, validate, asyncRoute(async (req, res) => {
  res.status(201).json(await Project.create({ ...req.body }));
}));
router.put('/admin/projects/:id', [param('id').isMongoId(), ...projectFields], validate, asyncRoute(async (req, res) => {
  const project = await Project.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!project) return res.status(404).json({ message: 'Project not found.' });
  res.json(project);
}));
router.delete('/admin/projects/:id', [param('id').isMongoId()], validate, asyncRoute(async (req, res) => {
  const project = await Project.findByIdAndDelete(req.params.id);
  if (!project) return res.status(404).json({ message: 'Project not found.' });
  res.json({ message: 'Project deleted.' });
}));

router.get('/admin/messages', asyncRoute(async (_req, res) => {
  res.json(await Message.find().sort({ createdAt: -1 }).lean());
}));
router.patch('/admin/messages/:id/read', [param('id').isMongoId(), body('read').isBoolean()], validate, asyncRoute(async (req, res) => {
  const message = await Message.findByIdAndUpdate(req.params.id, { read: req.body.read }, { new: true });
  if (!message) return res.status(404).json({ message: 'Message not found.' });
  res.json(message);
}));
router.delete('/admin/messages/:id', [param('id').isMongoId()], validate, asyncRoute(async (req, res) => {
  const message = await Message.findByIdAndDelete(req.params.id);
  if (!message) return res.status(404).json({ message: 'Message not found.' });
  res.json({ message: 'Message deleted.' });
}));

router.post('/admin/resume', (req, res, next) => {
  pdfUpload.single('resume')(req, res, (error) => {
    if (error) return res.status(error.code === 'LIMIT_FILE_SIZE' ? 413 : 400).json({ message: error.message || 'Resume upload failed.' });
    next();
  });
}, asyncRoute(async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'Choose a PDF file.' });
  const handle = await fs.open(req.file.path, 'r');
  const header = Buffer.alloc(5);
  const { bytesRead } = await handle.read(header, 0, 5, 0);
  await handle.close();
  if (bytesRead < 5 || header.toString() !== '%PDF-') {
    await fs.unlink(req.file.path).catch(() => {});
    return res.status(400).json({ message: 'The selected file is not a valid PDF.' });
  }
  const previous = await Resume.findOne({ key: 'main' });
  const nextResume = await Resume.findOneAndUpdate({ key: 'main' }, {
    key: 'main',
    originalName: path.basename(req.file.originalname.replace(/\\/g, '/')),
    storedName: req.file.filename,
    uploadedAt: new Date()
  }, { new: true, upsert: true, setDefaultsOnInsert: true });
  if (previous?.storedName && previous.storedName !== nextResume.storedName) {
    await fs.unlink(path.join(uploadDirectory, previous.storedName)).catch(() => {});
  }
  res.status(201).json({ originalName: nextResume.originalName, uploadedAt: nextResume.uploadedAt });
}));

router.delete('/admin/resume', asyncRoute(async (_req, res) => {
  const resume = await Resume.findOneAndDelete({ key: 'main' });
  if (!resume) return res.status(404).json({ message: 'There is no resume to delete.' });
  await fs.unlink(path.join(uploadDirectory, resume.storedName)).catch(() => {});
  res.json({ message: 'Resume deleted.' });
}));

export default router;
