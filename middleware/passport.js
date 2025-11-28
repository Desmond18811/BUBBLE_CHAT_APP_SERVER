import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as LocalStrategy } from 'passport-local';
import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt';
import User from '../Models/UserModel.js';
//import { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, JWT_SECRET, SERVER_URL } from "./env.js";

passport.use(new LocalStrategy(
    { usernameField: 'email' },
    async (email, password, done) => {
        try {
            const user = await User.findOne({ email });
            if (!user) return done(null, false, { message: 'Incorrect email or password' });
            const isMatch = await user.correctPassword(password);
            if (!isMatch) return done(null, false, { message: 'Incorrect email or password' });
            return done(null, user);
        } catch (err) {
            return done(err);
        }
    }
));

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: `${process.env.SERVER_URL}/api/auth/google/callback`
}, async (accessToken, refreshToken, profile, done) => {
    try {
        // 1. Existing Google user
        let user = await User.findOne({ googleId: profile.id });
        if (user) return done(null, user);

        // 2. Existing local user with same email → link accounts
        user = await User.findOne({ email: profile.emails[0].value });
        if (user) {
            user.googleId = profile.id;
            await user.save();
            return done(null, user);
        }

        // 3. Brand new Google user
        const firstName = profile.name?.givenName || profile.displayName.split(' ')[0] || '';
        const lastName = profile.name?.familyName || profile.displayName.split(' ').slice(1).join(' ') || '';

        user = await User.create({
            googleId: profile.id,
            firstName,
            lastName,
            email: profile.emails[0].value
        });

        return done(null, user);
    } catch (err) {
        return done(err);
    }
}));

passport.use(new JwtStrategy({
    jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        (req) => req.headers['x-auth-token']
    ]),
    secretOrKey: process.env.JWT_KEY
}, async (payload, done) => {
    try {
        const user = await User.findById(payload.id);
        if (user) return done(null, user);
        return done(null, false);
    } catch (err) {
        return done(err);
    }
}));

export default passport;