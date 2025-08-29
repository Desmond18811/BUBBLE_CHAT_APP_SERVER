import { v2 as cloudinary } from 'cloudinary';
import mongoose from 'mongoose';

const config = {
    cloudinary: {
        cloud_name: 'dgpnyrcos',
        api_key: '874595524684592',
        api_secret: 'R-3fT4emn9qhLqcnfm_KFGzpniA'
    },
    database: {
        url: 'mongodb+srv://ubidesmond31:kksnm3MynZBZpf6z@cluster8.mq7lm6h.mongodb.net/bubble-chat-app?retryWrites=true&w=majority'
    }
};

cloudinary.config(config.cloudinary);

mongoose.connect(config.database.url)
    .then(async () => {
        console.log('🟢 Connected to Database');

        // Get all messages with file URLs
        const messages = await mongoose.connection.db.collection('messages')
            .find({ fileUrl: { $exists: true, $ne: null } })
            .toArray();

        console.log(`📊 Found ${messages.length} messages with file URLs`);

        let updatedCount = 0;

        for (const message of messages) {
            if (message.fileUrl && message.fileUrl.includes('localhost:3000')) {
                const filename = message.fileUrl.split('/').pop();
                const newUrl = `https://res.cloudinary.com/dgpnyrcos/image/upload/bubble-chat-app/migrated/${filename}`;

                await mongoose.connection.db.collection('messages').updateOne(
                    { _id: message._id },
                    { $set: { fileUrl: newUrl } }
                );

                updatedCount++;
                console.log(`✅ Updated: ${filename}`);
            }
        }

        console.log(`\n📊 Updated ${updatedCount} records`);
        await mongoose.connection.close();
        console.log('🔴 MongoDB connection closed');

    })
    .catch((err) => {
        console.error('❌ Error:', err.message);
    });