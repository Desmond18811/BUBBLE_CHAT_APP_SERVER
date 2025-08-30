# Bubble ChatApp Server 💬🚀

Backend server for the Bubble ChatApp - a modern, real-time chat application built with Node.js, Express, MongoDB, and Socket.IO. Features robust API endpoints, real-time messaging, file uploads to Cloudinary, and secure authentication.

![Node.js](https://img.shields.io/badge/Node.js-18.x-green) ![Express](https://img.shields.io/badge/Express-4.x-lightgrey) ![MongoDB](https://img.shields.io/badge/MongoDB-7.x-green) ![Socket.IO](https://img.shields.io/badge/Socket.IO-4.x-blue)

## ✨ Features

- **RESTful API** with comprehensive endpoints for chat functionality
- **Real-time messaging** powered by Socket.IO for instant communication
- **File upload support** with Cloudinary integration for images, audio, videos, and documents
- **JWT authentication** with secure cookie-based sessions
- **MongoDB integration** with Mongoose ODM for data persistence
- **CORS enabled** for cross-origin requests from frontend
- **Environment configuration** with dotenv for secure deployment

## 🏗️ Project Structure
BUBBLE_CHAT_APP_SERVER/
├── models/ # MongoDB models and schemas
│ ├── Messages.js # Message schema definition
│ ├── User.js # User schema definition
│ └── index.js # Model exports
├── routes/ # API route handlers
│ ├── AuthRoutes.js # Authentication endpoints
│ ├── ContactsRoutes.js # Contact management
│ ├── MessagesRoutes.js # Message handling
│ └── index.js # Route exports
├── middleware/ # Custom middleware
│ └── AuthMiddleware.js # JWT verification
├── controllers/ # Business logic
│ └── MessagesController.js # Message controller
├── socket.js # Socket.IO configuration
├── server.js # Main server file
├── uploads/ # Local file storage (for migration)
├── .env # Environment variables
└── package.json

text

## 🔌 API Endpoints

### Authentication Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/signup` | Register a new user |
| POST | `/api/auth/login` | Authenticate a user |
| GET | `/api/auth/user-info` | Get current user info |
| POST | `/api/auth/update-profile` | Update user profile |
| POST | `/api/auth/add-profile-image` | Upload profile image |
| POST | `/api/auth/remove-profile-image` | Remove profile image |
| POST | `/api/auth/logout` | Logout user |

### Message Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/messages/get-messages` | Get message history between users |
| POST | `/api/messages/upload-file` | Upload files to Cloudinary |

### Contact Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/contacts/search` | Search for contacts |
| GET | `/api/contacts/get-contacts-for-dm` | Get contacts for direct messaging |

### Utility Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Server health check |
| GET | `/api/test-cloudinary` | Test Cloudinary configuration |
| POST | `/api/migrate-old-urls` | Migrate local file URLs to Cloudinary |
| GET | `/api/file-urls` | Get all file URLs from database |

## 🚀 Quick Start

### Prerequisites

- Node.js (v18.x or later)
- MongoDB Atlas account or local MongoDB installation
- Cloudinary account for file storage

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Desmond18811/BUBBLE_CHAT_APP_SERVER.git
   cd BUBBLE_CHAT_APP_SERVER
Install dependencies

bash
npm install
Environment Configuration

Create a .env file in the root directory:

env
PORT=3000
JWT_KEY=your-super-secure-jwt-key-here-minimum-64-characters
ORIGIN=http://localhost:5173
DATABASE_URL=mongodb+srv://username:password@cluster.mongodb.net/bubble-chat-app?retryWrites=true&w=majority
CLOUDINARY_CLOUD_NAME=your-cloudinary-cloud-name
CLOUDINARY_API_KEY=your-cloudinary-api-key
CLOUDINARY_API_SECRET=your-cloudinary-api-secret
NODE_ENV=production
Database Setup

Create a MongoDB Atlas account or use local MongoDB

Update the DATABASE_URL in your .env file

Cloudinary Setup

Create a free account at cloudinary.com

Get your API credentials from the dashboard

Add them to your .env file

Start the server

bash
# Development mode
npm run dev

# Production mode
npm start
Verify server is running

bash
curl http://localhost:3000/api/health
📦 Dependencies
Production Dependencies
express - Web framework for Node.js

mongoose - MongoDB object modeling

socket.io - Real-time bidirectional communication

jsonwebtoken - JWT authentication

cookie-parser - Cookie parsing middleware

cors - Cross-Origin Resource Sharing

multer - File upload handling

cloudinary - Cloud-based file storage

dotenv - Environment variable management

Development Dependencies
nodemon - Automatic server restarts during development

🔧 Configuration
Environment Variables
Variable	Description	Example
PORT	Server port number	3000
JWT_KEY	Secret key for JWT tokens	your-secret-key
ORIGIN	Frontend origin for CORS	http://localhost:5173
DATABASE_URL	MongoDB connection string	mongodb+srv://user:pass@cluster.mongodb.net/db
CLOUDINARY_CLOUD_NAME	Cloudinary cloud name	your-cloud-name
CLOUDINARY_API_KEY	Cloudinary API key	1234567890
CLOUDINARY_API_SECRET	Cloudinary API secret	your-api-secret
NODE_ENV	Environment mode	production
🛠️ Development
Running in Development Mode
bash
npm run dev
Building for Production
bash
npm start
Testing API Endpoints
Use tools like Postman, Thunder Client, or curl to test endpoints:

bash
# Health check
curl http://localhost:3000/api/health

# Test Cloudinary configuration
curl http://localhost:3000/api/test-cloudinary
🚀 Deployment
Deploying to Render.com
Connect your GitHub repository to Render

Set up environment variables in Render dashboard

Deploy automatically from main branch

Environment Variables for Production
Make sure to set all required environment variables in your production environment.

🤝 Contributing
Fork the repository

Create a feature branch (git checkout -b feature/amazing-feature)

Commit your changes (git commit -m 'Add amazing feature')

Push to the branch (git push origin feature/amazing-feature)

Open a Pull Request

📄 License
This project is licensed under the MIT License - see the LICENSE file for details.

🆘 Troubleshooting
Common Issues
MongoDB Connection Error

Verify your connection string in .env

Check if MongoDB Atlas IP whitelisting is configured

Cloudinary Configuration Error

Ensure all Cloudinary environment variables are set

Verify Cloudinary credentials are correct

CORS Issues

Check the ORIGIN environment variable matches your frontend URL

File Upload Issues

Verify Cloudinary configuration

Check file size limits and supported formats

Getting Help
Check the issues page for known problems

Create a new issue for bugs or feature requests

⭐ Star this repository if you found it helpful!
