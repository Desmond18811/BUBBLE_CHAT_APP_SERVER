import mongoose from "mongoose";
import Message from "../models/Messages.js";

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