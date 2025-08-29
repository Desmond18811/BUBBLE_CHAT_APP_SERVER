import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Connect to MongoDB
mongoose.connect(process.env.DATABASE_URL)
  .then(() => {
    console.log('🟢 Connected to Database');
    checkFileUrls();
  })
  .catch((err) => {
    console.error('❌ Database connection error:', err.message);
    process.exit(1);
  });

async function checkFileUrls() {
  try {
    // Get all messages that have file URLs
    const messagesWithFiles = await mongoose.connection.db.collection('messages')
      .find({ fileUrl: { $exists: true } })
      .toArray();

    console.log(`📊 Found ${messagesWithFiles.length} messages with file URLs`);

    // Group by file URL pattern
    const urlPatterns = {};

    messagesWithFiles.forEach(message => {
      const url = message.fileUrl;
      if (url) {
        // Extract the pattern (e.g., "/uploads/files/2025/08/18/filename.webp")
        const pattern = url.split('/').slice(0, -1).join('/');
        if (!urlPatterns[pattern]) {
          urlPatterns[pattern] = 0;
        }
        urlPatterns[pattern]++;
      }
    });

    console.log('\n📋 File URL patterns found in database:');
    Object.entries(urlPatterns).forEach(([pattern, count]) => {
      console.log(`${pattern}/ : ${count} files`);
    });

    // Show some sample file URLs
    console.log('\n🔍 Sample file URLs:');
    messagesWithFiles.slice(0, 5).forEach(message => {
      console.log(`- ${message.fileUrl}`);
    });

  } catch (error) {
    console.error('❌ Error checking file URLs:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('🔴 MongoDB connection closed');
  }
}