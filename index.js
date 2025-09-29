import express from 'express';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import mongoose from 'mongoose';
import cors from 'cors';
import { fileURLToPath } from 'url';
import path from 'path';
import multer from 'multer';
import { createRequire } from 'module';
import { v2 as cloudinary } from 'cloudinary';
import stream from 'stream';
import fs from 'fs';
import authRoutes from "./routes/AuthRoutes.js";
import contactRoutes from "./routes/ContactsRoutes.js";
import setUpSocket from './socket.js';
import messagesRoutes from './routes/MessagesRoutes.js';
import passport from 'passport';
import session from 'express-session';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as LocalStrategy } from 'passport-local';
import User from './models/UserModel.js';
import jwt from 'jsonwebtoken';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

// Load environment variables from multiple possible files
const envFiles = ['.env', '.env.production.local', '.env.development.local'];
let envLoaded = false;

for (const envFile of envFiles) {
    const envPath = path.join(__dirname, envFile);
    if (fs.existsSync(envPath)) {
        console.log(`📁 Loading environment from: ${envFile}`);
        const result = dotenv.config({ path: envPath });
        if (!result.error) {
            envLoaded = true;
            break;
        }
    }
}

if (!envLoaded) {
    console.log('⚠️ No .env files found, using process environment');
}

const app = express();
const PORT = process.env.PORT || 3000;
const databaseURL = process.env.DATABASE_URL;

// MANUAL CLOUDINARY CONFIGURATION (ensure it works)
const cloudinaryConfig = {
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dgpnyrcos',
    api_key: process.env.CLOUDINARY_API_KEY || '874595524684592',
    api_secret: process.env.CLOUDINARY_API_SECRET || 'R-3fT4emn9qhLqcnfm_KFGzpniA',
    secure: true
};

console.log('Cloudinary Configuration:');
console.log('Cloud Name:', cloudinaryConfig.cloud_name);
console.log('API Key:', cloudinaryConfig.api_key);
console.log('API Secret:', cloudinaryConfig.api_secret ? '*** (present)' : 'MISSING');

// Configure Cloudinary
cloudinary.config(cloudinaryConfig);

// Local uploads directory for migration
const localUploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(localUploadsDir)) {
    fs.mkdirSync(localUploadsDir, { recursive: true });
}

// Create a memory storage for Multer
const storage = multer.memoryStorage();

const upload = multer({
    storage,
    limits: {
        fileSize: 15 * 1024 * 1024,
        files: 1
    },
    fileFilter: (req, file, cb) => {
        const allowedMimeTypes = [
            'audio/mpeg', 'audio/wav', 'audio/webm', 'audio/mp3', 'audio/x-m4a', 'audio/aac',
            'audio/ogg', 'audio/x-wav', 'audio/x-aiff', 'audio/x-flac',
            'image/jpeg', 'image/png', 'image/gif', 'image/webp',
            'video/mp4', 'video/webm', 'video/ogg',
            'application/pdf', 'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'text/plain'
        ];
        const allowedExtensions = [
            '.mp3', '.wav', '.webm', '.m4a', '.aac', '.ogg', '.flac', '.aif',
            '.jpg', '.jpeg', '.png', '.gif', '.webp',
            '.mp4', '.webm', '.ogg',
            '.pdf', '.doc', '.docx', '.txt'
        ];

        const ext = path.extname(file.originalname).toLowerCase();
        const isMimeValid = allowedMimeTypes.includes(file.mimetype);
        const isExtValid = allowedExtensions.includes(ext);

        if (isMimeValid || isExtValid) {
            console.log(`✅ Accepting file: ${file.originalname} (${file.mimetype})`);
            cb(null, true);
        } else {
            console.warn(`❌ Rejecting file: ${file.originalname} (${file.mimetype})`);
            cb(new Error(`Unsupported format. Allowed: ${allowedExtensions.join(', ')}`));
        }
    }
});

const allowedOrigins = [
    'http://localhost:5173',
    'https://bubbleappchat.netlify.app'  // Add your Netlify URL here
];

app.use(cors({
    origin: (origin, callback) => {

        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    credentials: true,
    exposedHeaders: ["Content-Disposition"]
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Session middleware for Passport
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        maxAge: 3 * 24 * 60 * 60 * 1000
    }
}));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Passport Local Strategy
passport.use(new LocalStrategy(
    { usernameField: 'email' },
    async (email, password, done) => {
        try {
            const user = await User.findOne({ email });
            if (!user) return done(null, false, { message: 'Invalid credentials' });

            const isMatch = await user.comparePassword(password);
            if (!isMatch) return done(null, false, { message: 'Invalid credentials' });

            return done(null, user);
        } catch (err) {
            return done(err);
        }
    }
));

// Passport Google Strategy
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: `${process.env.BASE_URL}/auth/google/callback`
}, async (accessToken, refreshToken, profile, done) => {
    try {
        let user = await User.findOne({ googleId: profile.id });

        if (!user) {
            user = await User.create({
                googleId: profile.id,
                email: profile.emails[0].value,
                firstName: profile.name.givenName,
                lastName: profile.name.familyName,
                profileSetup: true // Assuming Google users have basic profile set
            });
        }

        return done(null, user);
    } catch (err) {
        return done(err);
    }
}));

// Serialize/Deserialize
passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (err) {
        done(err);
    }
});

// Serve local uploads for migration period
//app.use('/local-uploads', express.static(localUploadsDir));
app.use('/uploads', express.static(localUploadsDir));  // Instead of /local-uploads

// Test endpoint to verify Cloudinary configuration
app.get('/api/test-cloudinary', async (req, res) => {
    try {
        // Test Cloudinary configuration
        const result = await cloudinary.uploader.upload(
            'https://res.cloudinary.com/demo/image/upload/sample.jpg',
            {
                folder: 'test',
                public_id: 'test_upload'
            }
        );

        res.json({
            success: true,
            message: 'Cloudinary is configured correctly!',
            cloudinaryUrl: result.secure_url,
            config: {
                cloud_name: cloudinaryConfig.cloud_name,
                api_key: cloudinaryConfig.api_key ? '✅ Present' : '❌ Missing',
                api_secret: cloudinaryConfig.api_secret ? '✅ Present' : '❌ Missing'
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Cloudinary configuration error',
            message: error.message,
            config: cloudinaryConfig
        });
    }
});

// Upload endpoint using Cloudinary
app.post('/api/messages/upload-file', upload.single('file'), async (req, res) => {
    try {
        // Check if Cloudinary is configured
        if (!cloudinaryConfig.cloud_name || !cloudinaryConfig.api_key || !cloudinaryConfig.api_secret) {
            return res.status(500).json({
                success: false,
                error: 'Cloudinary not configured',
                message: 'Server missing Cloudinary API credentials.',
                required: ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET']
            });
        }

        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'No file uploaded or file type not allowed'
            });
        }

        // Determine resource type based on MIME type
        let resourceType = 'auto';
        if (req.file.mimetype.startsWith('image/')) {
            resourceType = 'image';
        } else if (req.file.mimetype.startsWith('video/')) {
            resourceType = 'video';
        } else if (req.file.mimetype.startsWith('audio/')) {
            resourceType = 'video'; // Cloudinary treats audio as video
        }

        // Create a promise-based upload function
        const uploadStream = () => {
            return new Promise((resolve, reject) => {
                const cloudinaryUploadStream = cloudinary.uploader.upload_stream(
                    {
                        resource_type: resourceType,
                        folder: 'bubble-chat-app',
                        use_filename: true,
                        unique_filename: true
                    },
                    (error, result) => {
                        if (error) {
                            console.error('Cloudinary upload error:', error);
                            reject(error);
                        } else {
                            resolve(result);
                        }
                    }
                );

                // Create a buffer stream and pipe to Cloudinary
                const bufferStream = new stream.PassThrough();
                bufferStream.end(req.file.buffer);
                bufferStream.pipe(cloudinaryUploadStream);
            });
        };

        // Upload the file
        const result = await uploadStream();

        res.json({
            success: true,
            fileUrl: result.secure_url,
            filename: req.file.originalname,
            size: req.file.size,
            mimetype: req.file.mimetype,
            duration: req.body.duration || null,
            publicId: result.public_id
        });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({
            success: false,
            error: 'File upload failed',
            message: error.message,
            details: 'Check server logs for more information'
        });
    }
});

// Endpoint to migrate old file URLs to Cloudinary URLs
app.post('/api/migrate-old-urls', async (req, res) => {
    try {
        const { oldUrl, newUrl } = req.body;

        if (!oldUrl || !newUrl) {
            return res.status(400).json({
                success: false,
                error: 'Both oldUrl and newUrl are required'
            });
        }

        // Update all messages with the old URL
        const updateResult = await mongoose.connection.db.collection('messages').updateMany(
            { fileUrl: oldUrl },
            { $set: { fileUrl: newUrl } }
        );

        res.json({
            success: true,
            updatedCount: updateResult.modifiedCount,
            message: `Updated ${updateResult.modifiedCount} records`
        });

    } catch (error) {
        console.error('Migration error:', error);
        res.status(500).json({
            success: false,
            error: 'Migration failed',
            message: error.message
        });
    }
});

// Endpoint to get all unique file URLs from database
app.get('/api/file-urls', async (req, res) => {
    try {
        const fileUrls = await mongoose.connection.db.collection('messages')
            .distinct('fileUrl', { fileUrl: { $exists: true, $ne: null } });

        // Filter out non-file URLs and localhost URLs
        const localhostUrls = fileUrls.filter(url =>
            url && (url.includes('localhost:3000') || url.startsWith('/uploads'))
        );

        res.json({
            success: true,
            totalUrls: fileUrls.length,
            localhostUrls: localhostUrls.length,
            urls: localhostUrls
        });

    } catch (error) {
        console.error('Error getting file URLs:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get file URLs',
            message: error.message
        });
    }
});

function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

mongoose.connect(databaseURL)
    .then(() => console.log('🟢 Connected to Database'))
    .catch((err) => {
        console.error('❌ Database connection error:', err);
        process.exit(1);
    });

app.get('/api/health', (req, res) => {
    const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
    const uptime = process.uptime();
    const memoryUsage = process.memoryUsage();

    res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        database: dbStatus,
        uptime: `${uptime.toFixed(2)} seconds`,
        memory: {
            rss: formatBytes(memoryUsage.rss),
            heapTotal: formatBytes(memoryUsage.heapTotal),
            heapUsed: formatBytes(memoryUsage.heapUsed)
        }
    });
});

app.use('/api/auth', authRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/messages', messagesRoutes);

app.all(/^\/api\//, (req, res) => {
    res.status(404).json({
        success: false,
        error: 'Endpoint not found',
        requestedUrl: req.originalUrl,
        method: req.method
    });
});

app.use((err, req, res, next) => {
    console.error('Error:', {
        message: err.message,
        stack: err.stack,
        url: req.originalUrl,
        method: req.method
    });

    if (err instanceof multer.MulterError) {
        return res.status(400).json({
            success: false,
            error: 'File upload error',
            message: err.message,
            code: err.code,
            field: err.field
        });
    }

    res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: err.message || 'Unexpected error'
    });
});

const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server started on http://localhost:${PORT}`);
    console.log(`📁 Local uploads directory: ${localUploadsDir}`);
    console.log(`☁️  Using Cloudinary for new file storage`);
    console.log(`🌐 CORS allowed origin: ${process.env.ORIGIN || 'http://localhost:5173'}`);
});

try {
    const io = setUpSocket(server);
    console.log('🟢 Socket.io server initialized');

    io.on('connection', (socket) => {
        console.log(`🔌 Socket connected: ${socket.id}`);
        socket.on('disconnect', (reason) => {
            console.log(`🔌 Socket disconnected: ${socket.id} | Reason: ${reason}`);
        });
    });
} catch (err) {
    console.error('❌ Socket.io init failed:', err);
    process.exit(1);
}

process.on('unhandledRejection', (err) => {
    console.error('⚠️ Unhandled Rejection:', err);
});

process.on('SIGTERM', () => {
    console.log('🛑 SIGTERM received. Shutting down gracefully...');
    server.close(() => {
        mongoose.connection.close(false, () => {
            console.log('🔴 MongoDB connection closed');
            process.exit(0);
        });
    });
});

process.on('SIGINT', () => {
    console.log('🛑 SIGINT received. Shutting down...');
    server.close(() => {
        mongoose.connection.close(false, () => {
            console.log('🔴 MongoDB connection closed');
            process.exit(0);
        });
    });
});