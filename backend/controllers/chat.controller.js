import { populate } from "dotenv"
import { uploadFileToCloudinary } from "../config/cloudinary.config.js"
import Conversation from "../models/Conversation.model.js"
import Message from "../models/Message.model.js"
import { response } from "../utils/responseHandle.js"

export const sendMessage = async (req, res) => {
    try {
        const { senderId, receiverId, content, messageStatus } = req.body
        const file = req.file

        const participants = [senderId, receiverId].sort()

        //check if conversation already exits
        let conversation = await Conversation.findOne({
            participants: participants
        })
        if (!conversation) {
            conversation = new Conversation({
                participants,

            })
            await conversation.save()
        }

        let imageOrVideoUrl = null
        let contentType = null



        if (file) {
            const uploadFile = await uploadFileToCloudinary(file)
            if (!uploadFile?.secure_url) {
                return response(res, 400, 'failed to upload media')
            }
            imageOrVideoUrl = uploadFile?.secure_url;
            if (file.mimetype.startsWith('image')) {
                contentType = 'image'
            } else if (file.mimetype.startsWith('video')) {
                contentType = 'video'
            } else {
                return response(res, 400, 'Unsupported file type')
            }
        } else if (content?.trim()) {
            contentType = 'text'
        } else {
            return response(res, 400, 'Message content is required')
        }

        const message = new Message({
            conversation: conversation?._id,
            sender: senderId,
            receiver: receiverId,
            content,
            contentType,
            imageOrVideoUrl,
            messageStatus
        })

        await message.save()
        if (message?.content) {
            conversation.lastMessage = message?._id
        }
        conversation.unreadCount += 1;
        await conversation.save()

        const populatedMessage = await Message.findOne(message?._id)
            .populate("sender", "username profilePicture")
            .populate("receiver", "username profilePicture")

         //Emit socket event
        if (req.io && req.socketUserMap) {
            const receiverSocketId=req.socketUserMap.get(receiverId)
            if(receiverSocketId){
                req.io.to(receiverSocketId).emit("receive_message",populatedMessage)
                message.messageStatus="delivered"
                await message.save()
            }            
        }


        return response(res, 201, 'Message send successfully', populatedMessage)

    } catch (error) {
        console.log(error)
        return response(res, 500, "Internal server error")
    }
}


export const getConversation = async (req, res) => {
    const userId = req.user.userId
    try {
        let conversation = await Conversation.find({
            participants: userId
        }).populate("participants", "username profilePicture isOnline lastSeen")
            .populate({
                path: "lastMessage",
                populate: {
                    path: "sender receiver",
                    select: "username profilePicture"
                }
            }).sort({ updatedAt: -1 })

        return response(res, 201, 'Conversation get successfully', conversation)

    } catch (error) {
        console.log(error)
        return response(res, 500, "Internal server error")
    }
}

export const getMessages = async (req, res) => {
    try {
        const { conversationId } = req.params
        const userId = req.user.userId

        const conversation = await Conversation.findById(conversationId)
        if (!conversation) {
            return response(res, 404, 'Conversation not found')
        }
        if (!conversation.participants.includes(userId)) {
            return response(res, 403, 'Not authorized to view this conversation')
        }
        const messages = await Message.find({ conversation: conversationId })
            .populate("sender", "username profilePicture")
            .populate("receiver", "username profilePicture")
            .sort("createdAt")

        await Message.updateMany({
            conversation: conversationId,
            receiver: userId,
            messageStatus: { $in: ["send", "delivered"] }
        },
            { $set: { messageStatus: "read" } }
        )

        conversation.unreadCount = 0

        await conversation.save()

        return response(res, 200, 'Message retrived', messages)

    } catch (error) {
        console.log(error)
        return response(res, 500, "Internal server error")
    }
}


export const markAsRead = async (req, res) => {

    try {
        const { messageId } = req.body
        const userId = req.user.userId

        let messages = await Message.find({
            _id: { $in: messageId },
            receiver: userId
        })

        await Message.updateMany({
            _id: { $in: messageId },
            receiverId: userId
        },
            { $set: { messageStatus: "read" } }
        )

        //notify to original sender
        if (req.io && req.socketUserMap) {
            for(const message of messages){
                const senderSocketId=req.socketUserMap.get(message.sender.toString())
                if(senderSocketId){
                    const updatedMessage={
                        _id:message._id,
                        messageStatus:"read"
                    }
                    req.io.to(senderSocketId).emit("message_read",updatedMessage)
                    await message.save()
                }
            }          
        }

        return response(res, 200, 'Messages marked as read', messages)

    } catch (error) {
        console.log(error)
        return response(res, 500, "Internal server error")
    }

}

export const deleteMessage = async (req, res) => {

    const { messageId } = req.params
    const userId = req.user.userId
    try {
        const message = await Message.findById(messageId)
        if (!message) {
            return response(res, 404, "Message not found")
        }
        if (message.sender.toString() !== userId) {
            return response(res, 403, "Not authorized to delete this message")
        }
        await message.deleteOne();

          //Emit socket event
        if (req.io && req.socketUserMap) {
            const receiverSocketId=req.socketUserMap.get(message.receiver.toString())
            if(receiverSocketId){
                req.io.to(receiverSocketId).emit("message_deleted",messageId)
            }            
        }

        return response(res, 200, "Message deleted successfully")
    } catch (error) {
        console.log(error)
        return response(res, 500, "Internal server error")
    }


}