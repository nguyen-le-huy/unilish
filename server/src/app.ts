import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import mongoSanitize from 'mongo-sanitize';
import { env } from './config/env.js';
import { errorConverter, errorHandler } from './middlewares/error.middleware.js';
import { HttpStatus } from './constants/http-status.js';
import { AppError } from './utils/app-error.js';

const app = express();

// Middlewares
app.use(helmet());
app.use(cors({
    origin: [env.CLIENT_URL, 'http://localhost:5174'],
    credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(compression());

// Sanitize data
app.use((req, res, next) => {
    // req.body = mongoSanitize(req.body);
    // req.query = mongoSanitize(req.query);
    // req.params = mongoSanitize(req.params);
    next();
});

import authRouter from './routes/auth.route.js';
import uploadRouter from './routes/upload.route.js';
import settingRouter from './routes/system-setting.route.js';
import userRouter from './routes/user.route.js';

// Routes
app.use('/api/auth', authRouter);
app.use('/api/upload', uploadRouter);
app.use('/api/settings', settingRouter);
app.use('/api/users', userRouter);

app.get('/', (req, res) => {
    res.status(HttpStatus.OK).json({
        status: 'success',
        message: 'Unilish API is running...',
        env: env.NODE_ENV
    });
});

// 404 Handler
app.use((req, res, next) => {
    next(new AppError(`Not found - ${req.originalUrl}`, HttpStatus.NOT_FOUND));
});

// Error Handler
app.use(errorConverter);
app.use(errorHandler);

export default app;
