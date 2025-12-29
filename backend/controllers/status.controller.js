import { uploadFileToCloudinary } from "../config/cloudinary.config.js";
import Status from "../models/Status.model.js"
import {response} from "../utils/responseHandle.js"
import Message from "../models/Message.model.js"

export const createStatus = async (req, res) => {
    try {
        const { content, contentType } = req.body;
        const userId = req.user.userId;
        const file = req.file;

        let mediaUrl = null;
        let finalContentType = contentType || "text";

        // Handle file upload
        if (file) {
            const uploadFile = await uploadToCloudinary(file);

            if (!uploadFile?.secure_url) {
                return response(res, 400, "Failed to upload media");
            }

            mediaUrl = uploadFile.secure_url;

            if (file.mimetype.startsWith("image")) {
                finalContentType = "image";
            } else if (file.mimetype.startsWith("video")) {
                finalContentType = "video";
            } else {
                return response(res, 400, "Unsupported file type");
            }
        }
        else if (!content?.trim()) {
            return response(res, 400, "Message content is required");
        }

        // Expiry time (24 hours)
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24);

        const status = new Status({
            user: userId,
            content,
            contentType: finalContentType,
            expiresAt
        });

        await status.save();

        const populatedStatus = await Status.findOne(status?._id)
            .populate("user", "username profilePicture")
            .populate("viewers", "username profilePicture");


        //Emit socket event
        if (req.io && req.socketUserMap) {
            //Broadcast to all connecting users except the creator
            for (const [connectingUserId, socketId] of req.socketUserMap) {
                if (connectingUserId !== userId) {
                    req.io.to(socketId).emit("new_status", populatedStatus)
                }
            }
        }


        return response(res, 201, "Status created successfully", populatedStatus);

    } catch (error) {
        console.error(error);
        return response(res, 500, "Internal server error");
    }
};

export const getStatus = async (req, res) => {

    try {
        const statuses = await Status.find({
            expiresAt: { $gt: new Date() }
        }).populate("user", "username profilePicture")
            .populate("viewers", "username profilePicture").sort({ createdAt: -1 })

        return response(res, 200, "Status retrived successfully", statuses)
    } catch (error) {
        console.error(error);
        return response(res, 500, "Internal server error");
    }

}
export const viewStatus = async (req, res) => {
    try {
        const { statusId } = req.params
        const userId = req.user.userId

        const status = await Status.findById(statusId)
        if (!status) {
            return response(res, 404, "Status not found")
        }
        if (!status.viewers.includes(userId)) {
            status.viewers.push(userId)
            await status.save()

            const updatedStatus = await Status.findById(statusId)
                .populate("user", "username profilePicture")
                .populate("viewers", "username profilePicture")

            //Emit socket event
            if (req.io && req.socketUserMap) {
                //Broadcast to all connecting users except the creator

                const statusOwnerSocketId = req.socketUserMap.get(status.user._id.toString())
                if (statusOwnerSocketId) {
                    const viewData = {
                        statusId,
                        viewerId: userId,
                        totalViewers: updatedStatus.viewers.length,
                        viewers: updatedStatus.viewers
                    }

                    req.io.to(statusOwnerSocketId).emit("status_viewed", viewData)
                } else {
                    console.log("status owner are not connected")
                }
            }


        } else {
            console.log("user already viewed the status")
        }

        return response(res, 200, "Status viewed successfully")

    } catch (error) {
        console.error(error);
        return response(res, 500, "Internal server error");
    }
}

export const deleteStatus = async (req, res) => {
    try {
        const { statusId } = req.params
        const userId = req.user.userId
        const status = await Status.findById(statusId)
        if (!status) {
            return response(res, 404, "Status not found")
        }
        if (status.user.toString() !== userId) {
            return response(res, 403, "Not authorized to delete this stauts")
        }
        await status.deleteOne()


        //Emit socket event
        if (req.io && req.socketUserMap) {

            //Broadcast to all connecting users except the creator
            for (const [connectingUserId, socketId] of req.socketUserMap) {
                if (connectingUserId !== userId) {
                    req.io.to(socketId).emit("status_deleted", statusId)
                }
            }
        }

        return response(res, 200, "Status deleted successfully")

    } catch (error) {
        console.error(error);
        return response(res, 500, "Internal server error");
    }
}