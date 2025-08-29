import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Try to load environment variables from different .env files
const envFiles = [
    '.env',
    '.env.local',
    '.env.production',
    '.env.production.local',
    '.env.development',
    '.env.development.local'
];

let envLoaded = false;
for (const envFile of envFiles) {
    const envPath = path.join(__dirname, envFile);
    if (fs.existsSync(envPath)) {
        console.log(`📁 Loading environment from: ${envFile}`);
        const envContent = fs.readFileSync(envPath, 'utf8');
        const envLines = envContent.split('\n');

        for (const line of envLines) {
            if (line.trim() && !line.startsWith('#')) {
                const [key, value] = line.split('=').map(part => part.trim());
                if (key && value) {
                    // Remove quotes if present
                    const cleanValue = value.replace(/^"(.*)"$/, '$1').replace(/^'(.*)'$/, '$1');
                    process.env[key] = cleanValue;
                    envLoaded = true;
                }
            }
        }
        break;
    }
}

if (!envLoaded) {
    console.log('ℹ️ No .env files found, checking process environment...');
}

// Debug: Check environment variables
console.log('Environment variables loaded:');
console.log('CLOUDINARY_CLOUD_NAME:', process.env.CLOUDINARY_CLOUD_NAME || '❌ Missing');
console.log('CLOUDINARY_API_KEY:', process.env.CLOUDINARY_API_KEY || '❌ Missing');
console.log('CLOUDINARY_API_SECRET:', process.env.CLOUDINARY_API_SECRET ? '✅ Set (hidden)' : '❌ Missing');
console.log('DATABASE_URL:', process.env.DATABASE_URL ? '✅ Set' : '❌ Missing');
console.log('NODE_ENV:', process.env.NODE_ENV || '❌ Missing');

// Validate required environment variables
const requiredEnvVars = [
    'CLOUDINARY_CLOUD_NAME',
    'CLOUDINARY_API_KEY',
    'CLOUDINARY_API_SECRET',
    'DATABASE_URL'
];

let missingVars = [];
for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
        missingVars.push(envVar);
        console.error(`❌ Missing required environment variable: ${envVar}`);
    }
}

if (missingVars.length > 0) {
    console.error('\n💡 Please create a .env file with these variables:');
    console.error('CLOUDINARY_CLOUD_NAME=your_cloud_name');
    console.error('CLOUDINARY_API_KEY=your_api_key');
    console.error('CLOUDINARY_API_SECRET=your_api_secret');
    console.error('DATABASE_URL=your_mongodb_connection_string');
    process.exit(1);
}

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true
});

// Fix MongoDB connection string if it's truncated
let databaseUrl = process.env.DATABASE_URL;
if (databaseUrl && databaseUrl.includes('retryWrites') && !databaseUrl.includes('retryWrites=true')) {
    console.log('⚠️  Fixing truncated MongoDB connection string...');
    databaseUrl = 'mongodb+srv://ubidesmond31:kksnm3MynZBZpf6z@cluster8.mq7lm6h.mongodb.net/bubble-chat-app?retryWrites=true&w=majority&appName=Cluster8';
    console.log('Fixed DATABASE_URL:', databaseUrl);
}

// Connect to MongoDB
mongoose.connect(databaseUrl)
    .then(() => console.log('🟢 Connected to Database'))
    .catch((err) => {
        console.error('❌ Database connection error:', err.message);
        console.log('💡 Trying alternative connection string...');

        // Try with a simplified connection string
        const altDatabaseUrl = 'mongodb+srv://ubidesmond31:kksnm3MynZBZpf6z@cluster8.mq7lm6h.mongodb.net/bubble-chat-app?retryWrites=true&w=majority';
        mongoose.connect(altDatabaseUrl)
            .then(() => {
                console.log('🟢 Connected to Database using alternative URL');
                startMigration();
            })
            .catch((err2) => {
                console.error('❌ Alternative connection also failed:', err2.message);
                process.exit(1);
            });
    });

const localUploadsDir = path.join(__dirname, 'uploads');

// Check if uploads directory exists
if (!fs.existsSync(localUploadsDir)) {
    console.error(`❌ Uploads directory not found: ${localUploadsDir}`);
    console.error('Please make sure your uploads folder exists in the server directory');
    process.exit(1);
}

const uploadFileToCloudinary = (filePath) => {
    return new Promise((resolve, reject) => {
        console.log(`📤 Uploading: ${path.basename(filePath)}`);

        cloudinary.uploader.upload(
            filePath,
            {
                folder: 'bubble-chat-app/migrated',
                use_filename: true,
                unique_filename: false,
                resource_type: 'auto'
            },
            (error, result) => {
                if (error) {
                    console.error(`❌ Upload failed for ${path.basename(filePath)}:`, error.message);
                    reject(error);
                } else {
                    console.log(`✅ Uploaded: ${result.secure_url}`);
                    resolve(result);
                }
            }
        );
    });
};

const startMigration = async () => {
    try {
        console.log('🔍 Scanning for files to migrate...');

        // Recursively find all files in uploads directory
        const findAllFiles = (dir, fileList = []) => {
            const files = fs.readdirSync(dir);

            files.forEach(file => {
                const filePath = path.join(dir, file);
                const stat = fs.statSync(filePath);

                if (stat.isDirectory()) {
                    findAllFiles(filePath, fileList);
                } else {
                    fileList.push(filePath);
                }
            });

            return fileList;
        };

        const allFiles = findAllFiles(localUploadsDir);
        console.log(`📁 Found ${allFiles.length} files to migrate`);

        if (allFiles.length === 0) {
            console.log('ℹ️ No files found to migrate');
            return;
        }

        // Upload each file to Cloudinary and update database
        let successCount = 0;
        let errorCount = 0;

        for (const filePath of allFiles) {
            try {
                const result = await uploadFileToCloudinary(filePath);

                // Update database records with the new URL
                const relativePath = filePath.replace(localUploadsDir + path.sep, '').replace(/\\/g, '/');
                const oldUrl = `/uploads/${relativePath}`;

                console.log(`🔄 Updating database records for: ${relativePath}`);

                // Update all messages that reference this file
                const updateResult = await mongoose.connection.db.collection('messages').updateMany(
                    { fileUrl: oldUrl },
                    { $set: { fileUrl: result.secure_url } }
                );

                console.log(`✅ Updated ${updateResult.modifiedCount} database records`);
                successCount++;

            } catch (error) {
                console.error(`❌ Failed to process ${path.basename(filePath)}:`, error.message);
                errorCount++;
            }
        }

        console.log('\n📊 Migration Summary:');
        console.log(`✅ Successful: ${successCount}`);
        console.log(`❌ Failed: ${errorCount}`);
        console.log(`📁 Total: ${allFiles.length}`);

    } catch (error) {
        console.error('❌ Migration error:', error.message);
    } finally {
        await mongoose.connection.close();
        console.log('🔴 MongoDB connection closed');
    }
};

// Start migration after successful connection
mongoose.connection.on('connected', () => {
    startMigration();
});

