import express from "express";
import { checkAuthenticated, getAllUsers, logout, sendOtp, updateProfile, verifyOtp } from "../controllers/auth.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { multerMiddleware } from "../config/cloudinary.config.js";
import { deleteMessage, getConversation, getMessages, markAsRead, sendMessage } from "../controllers/chat.controller.js";

const router=express.Router();

router.post('/send-message',multerMiddleware,authMiddleware,sendMessage)

router.get('/conversations',authMiddleware,getConversation)
router.get('/conversations/:conversationId/messages',authMiddleware,getMessages)

router.put('/messages/read',authMiddleware,markAsRead)

router.delete('/messages/:messageId',authMiddleware,deleteMessage)

export default router