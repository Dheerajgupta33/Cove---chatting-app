import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import mongoSanitize from 'express-mongo-sanitize';
import morgan from 'morgan';
import { env } from './config/env.js';
import routes from './routes/index.js';
import authRoutes from './routes/auth.routes.js';
import { apiLimiter } from './middleware/rateLimit.js';
import { sanitizeBody } from './middleware/sanitize.js';
import { errorHandler, notFound } from './middleware/error.js';
import { UPLOAD_DIR } from './services/storage.js';

const app = express();

app.set('trust proxy', 1); // Render/Railway sit behind a proxy: needed for correct IPs + secure cookies
app.disable('x-powered-by');

// Security headers. Cross-origin resource policy is relaxed so the SPA can show ./uploads images in dev.
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(
  cors({
    origin: (origin, cb) => cb(null, !origin || env.clientOrigins.includes(origin)),
    credentials: true, // required for the httpOnly refresh cookie
  })
);
app.use(compression());
app.use(morgan(env.isProd ? 'combined' : 'dev'));
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
app.use(mongoSanitize()); // blocks NoSQL operator injection ($ / . keys)
app.use(sanitizeBody); // strips HTML from every string in the body

app.get('/health', (_req, res) => res.json({ status: 'ok', uptime: process.uptime() }));
app.use('/uploads', express.static(UPLOAD_DIR, { maxAge: '7d', setHeaders: (res) => res.setHeader('X-Content-Type-Options', 'nosniff') }));

app.use('/api/auth', apiLimiter, authRoutes);
app.use('/api', apiLimiter, routes);

app.use(notFound);
app.use(errorHandler);

export default app;
