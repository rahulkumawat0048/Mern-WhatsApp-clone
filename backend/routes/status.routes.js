import express from "express";
import { multerMiddleware } from "../config/cloudinary.config.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { createStatus, deleteStatus, getStatus, viewStatus } from "../controllers/status.controller.js";

const router = express.Router();

router.post('/', multerMiddleware, authMiddleware, createStatus)
router.get('/', authMiddleware, getStatus)


router.put('/:statusId/view', authMiddleware, viewStatus)

router.delete('/:statusId', authMiddleware, deleteStatus)

export default router