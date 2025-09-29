// routes/AuthRoutes.js
import { Router } from 'express';
import { login, signup, getUserInfo, updateProfile, addProfileImage, removeProfileImage, logout } from '../controllers/AuthController.js';
import { verifyToken } from '../middleware/AuthMiddleware.js';
import multer from 'multer';
import passport from 'passport';
import jwt from 'jsonwebtoken';

const authRoutes = Router();

const upload = multer({ dest: 'uploads/profiles/' });

authRoutes.post('/signup', signup);
authRoutes.post('/login', passport.authenticate('local', { session: false }), login);
authRoutes.get('/user-info', verifyToken, getUserInfo);
authRoutes.post('/update-profile', verifyToken, updateProfile);
authRoutes.post('/add-profile-image', verifyToken, upload.single('profile-image'), addProfileImage);
authRoutes.delete('/remove-profile-image', verifyToken, removeProfileImage);
authRoutes.post('/logout', logout);

// Google routes
authRoutes.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
authRoutes.get('/google/callback',
    passport.authenticate('google', { session: false, failureRedirect: '/login' }),
    (req, res) => {
        const token = jwt.sign(
            {
                id: req.user._id, // Use _id
                email: req.user.email,
            },
            process.env.JWT_KEY,
            { expiresIn: '3d' }
        );

        res.cookie('jwt', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
            maxAge: 3 * 24 * 60 * 60 * 1000,
        });

        res.redirect(`${process.env.FRONTEND_URL}/auth-success`);
    }
);

export default authRoutes;