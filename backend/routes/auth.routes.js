import express from "express";
import { checkAuthenticated, getAllUsers, logout, sendOtp, updateProfile, verifyOtp } from "../controllers/auth.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { multerMiddleware } from "../config/cloudinary.config.js";

const router=express.Router();

router.post('/send-otp',sendOtp)
router.post('/verify-otp',verifyOtp)
router.get('/logout',logout)


//protected routes

router.put('/update-profile',authMiddleware,multerMiddleware,updateProfile)
router.get('/check-auth',authMiddleware,checkAuthenticated)
router.get('/users',authMiddleware,getAllUsers)


export default router