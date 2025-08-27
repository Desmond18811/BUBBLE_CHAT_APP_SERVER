import mongoose from "mongoose";
import Message from "../models/Messages.js";
import fs from "fs";
import path from "path";

export const getMessages = async (req, res) => {
  try {
    const user1 = req.userId;
    const user2 = req.body.userId;

    if (!user1 || !user2) {
      return res.status(400).json({
        status: "error",
        statusCode: 400,
        message: "Both user Id's are required",
      });
    }

    const messages = await Message.find({
      $or: [
        { sender: user1, recipient: user2 },
        { sender: user2, recipient: user1 },
      ],
    }).sort({ timestamp: 1 });

    console.log(`Fetched ${messages.length} messages for users ${user1} and ${user2}`);

    return res.status(200).json({
      status: "Success",
      statusCode: 200,
      message: "success",
      messages,
    });
  } catch (error) {
    console.error("Get messages error:", error);
    return res.status(500).json({
      status: "error",
      statusCode: 500,
      error: error.message,
    });
  }
};

export const uploadFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        status: 'error',
        statusCode: 400,
        message: 'No file was uploaded'
      });
    }

    const date = new Date();
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const uploadDir = path.join("Uploads", "files", year.toString(), month, day);

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const ext = path.extname(req.file.originalname);
    const newFilename = `${Date.now()}${ext}`;
    const newPath = path.join(uploadDir, newFilename);

    fs.renameSync(req.file.path, newPath);

    // Use the full domain for fileUrl
    const baseUrl ='https://bubble-chat-app-server.onrender.com';
    const fileUrl = `${baseUrl}/Uploads/files/${year}/${month}/${day}/${newFilename}`;

    return res.status(200).json({
      status: 'success',
      statusCode: 200,
      message: 'File successfully uploaded',
      filePath: fileUrl,
      originalName: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype
    });
  } catch (error) {
    console.error("File upload error:", error);
    return res.status(500).json({
      status: "error",
      statusCode: 500,
      error: error.message,
    });
  }
};