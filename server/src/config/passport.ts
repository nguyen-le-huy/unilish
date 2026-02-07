import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { env } from './env.js';
import { authService } from '../services/auth.service.js';
import { logger } from '../utils/logger.js';

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
                callbackURL: '/api/auth/google/callback',
            },
            async (accessToken, refreshToken, profile, done) => {
                try {
                    const result = await authService.findOrCreateFromGoogle({
                        googleId: profile.id,
                        email: profile.emails?.[0]?.value || '',
                        fullName: profile.displayName,
                        avatarUrl: profile.photos?.[0]?.value || '',
                    });

                    // Passport expects a user object. 
                    // We can pass the whole result { user, token }
                    return done(null, result as any);
                } catch (error) {
                    logger.error('Google Auth Error:', error);
                    return done(error as Error, undefined);
                }
            }
        )
    );
}
