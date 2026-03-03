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

import session from 'express-session';
import passport from 'passport';
import './config/passport.js';

// Middlewares
app.use(helmet({
    // API server — resources are intentionally loaded cross-origin (audio, images)
    crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
app.use(cors({
    origin: (origin, callback) => {
        if (env.NODE_ENV !== 'production') {
            callback(null, true);
            return;
        }

        if (!origin) {
            callback(null, true);
            return;
        }

        const allowList = new Set([env.CLIENT_URL, 'http://localhost:5174']);
        const isAllowedByList = allowList.has(origin);

        if (isAllowedByList) {
            callback(null, true);
            return;
        }

        callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(compression());

app.use(
    session({
        secret: env.SESSION_SECRET,
        resave: false,
        saveUninitialized: false,
        cookie: {
            secure: env.NODE_ENV === 'production',
            httpOnly: true,
            maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        },
    })
);

app.use(passport.initialize());
app.use(passport.session());

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
import couponRouter from './routes/coupon.route.js';
import learningGoalRouter from './routes/learning-goal.route.js';
import languageRouter from './routes/language.route.js';
import courseSeriesRouter from './routes/course-series.route.js';
import courseRouter from './routes/course.route.js';
import unitRouter from './routes/unit.route.js';
import lessonRouter from './routes/lesson.route.js';
import vocabRouter from './routes/vocab.route.js';
import grammarRouter from './routes/grammar.route.js';
import readingRouter from './routes/reading.route.js';
import listeningRouter from './routes/listening.route.js';
import writingRouter from './routes/writing.route.js';
import audioRouter from './routes/audio.route.js';
import { streamListeningAudio } from './controllers/listening.controller.js';

// Routes
app.use('/api/auth', authRouter);
app.use('/api/upload', uploadRouter);
app.use('/api/settings', settingRouter);
app.use('/api/users', userRouter);
app.use('/api/coupons', couponRouter);
app.use('/api/curriculum/goals', learningGoalRouter);
app.use('/api/curriculum/languages', languageRouter);
app.use('/api/curriculum/series', courseSeriesRouter);
app.use('/api/curriculum/courses', courseRouter);
app.use('/api/curriculum/units', unitRouter);
// Audio proxy — must be before lessonRouter (which has global protect middleware)
app.get('/api/curriculum/lessons/:lessonId/listening/audio', streamListeningAudio);

app.use('/api/curriculum/lessons', lessonRouter);
app.use('/api/curriculum/lessons', vocabRouter);
app.use('/api/curriculum/lessons', grammarRouter);
app.use('/api/curriculum/lessons', readingRouter);
app.use('/api/curriculum/lessons', listeningRouter);
app.use('/api/curriculum/lessons', writingRouter);
app.use('/api/audio', audioRouter);

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
