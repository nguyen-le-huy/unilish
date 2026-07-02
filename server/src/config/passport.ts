import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { env } from './env.js';
import { authService } from '../services/auth.service.js';
import { logger } from '../utils/logger.js';
import { AppError } from '../utils/app-error.js';

const normalizeBaseUrl = (url: string): string => url.replace(/\/+$/, '');

const resolveGoogleCallbackUrl = (): string => {
    if (env.GOOGLE_CALLBACK_URL) {
        return env.GOOGLE_CALLBACK_URL;
    }

    return `${normalizeBaseUrl(env.SERVER_URL)}/api/auth/google/callback`;
};

passport.serializeUser((user: any, done) => {
    done(null, user.user._id || user._id);
});

passport.deserializeUser(async (id: string, done) => {
    // In a real app, you might want to fetch the user from DB here
    // But since we are using JWT mostly, we might not need heavy session usage
    // However, passport session needs this. 
    // For now simple pass through or basic fetch
    // But our authService returns { user, token } structure sometimes.
    // Let's assume we just store ID.
    done(null, { id } as any);
});

if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
    passport.use(
        new GoogleStrategy(
            {
                clientID: env.GOOGLE_CLIENT_ID,
                clientSecret: env.GOOGLE_CLIENT_SECRET,
                callbackURL: resolveGoogleCallbackUrl(),
            },
            async (_accessToken, _refreshToken, profile, done) => {
                try {
                    const email = profile.emails?.[0]?.value;
                    const emailVerified = Boolean(
                        (profile as { _json?: { email_verified?: boolean } })._json?.email_verified,
                    );

                    if (!email) {
                        throw new AppError('Google account chưa có email hợp lệ', 400);
                    }

                    if (!emailVerified) {
                        throw new AppError('Email Google chưa được xác minh', 400);
                    }

                    const result = await authService.handleGoogleLogin({
                        googleId: profile.id,
                        email,
                        fullName: profile.displayName,
                        avatarUrl: profile.photos?.[0]?.value || '',
                        emailVerified,
                    });

                    // Passport expects a user object. 
                    // We pass the enriched auth payload for callback redirect handling.
                    return done(null, result as any);
                } catch (error) {
                    logger.error('Google Auth Error:', error);
                    return done(error as Error, undefined);
                }
            }
        )
    );
}
