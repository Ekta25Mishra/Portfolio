import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import mongoose from 'mongoose';
import apiRoutes from './routes.js';
import { seedPortfolio } from './seed.js';

const required = ['MONGO_URI', 'JWT_SECRET', 'ADMIN_USERNAME', 'ADMIN_PASSWORD'];
const missing = required.filter((key) => !process.env[key]);
if (missing.length) {
  throw new Error(`Missing server environment values: ${missing.join(', ')}`);
}

const app = express();
const clientOrigin = process.env.CLIENT_ORIGIN || 
'https://portfolio-nsxd-rho.vercel.app' || 
'https://portfolio-nsxd-git-main-ekta-mishras-projects.vercel.app' ||
'https://portfolio-nsxd-8sznm99un-ekta-mishras-projects.vercel.app' ||
'http://localhost:5173' 


app.use(cors({
  origin(origin, callback) {
    if (!origin || origin === clientOrigin) return callback(null, true);
    return callback(new Error('Origin is not allowed by CORS.'));
  },
  credentials: true
}));

app.disable('x-powered-by');
app.use(helmet());
app.use(express.json({ limit: '32kb' }));
app.use(cookieParser());
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
app.use('/api', apiRoutes);
app.use((error, _req, res, _next) => {
  console.error(error);
  if (res.headersSent) return;
  res.status(500).json({ message: 'Something went wrong. Please try again.' });
});

const port = Number(process.env.PORT) || 5000;
await mongoose.connect(process.env.MONGO_URI);
await seedPortfolio();
app.listen(port, () => console.log(`Portfolio API listening on port ${port}`));
