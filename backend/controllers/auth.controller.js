import { otpGenerate } from "../utils/otpGenerate.js"
import User from "../models/User.model.js"
import { response } from "../utils/responseHandle.js"
import { sendOtpToEmail } from "../services/email.service.js"
import { sendOtpToPhoneNumber } from "../services/twilio.service.js"
import { generateToken } from "../utils/generateToken.js"
import { uploadFileToCloudinary } from "../config/cloudinary.config.js"
import Conversation from "../models/Conversation.model.js"
import { verifyOtpService } from "../services/twilio.service.js"


export const sendOtp = async (req, res) => {
    try {
        const { phoneNumber, phoneSuffix, email } = req.body
        const otp = otpGenerate()
        const expiry = new Date(Date.now() + 5 * 60 * 1000)
        let user;
        if (email) {
            user = await User.findOne({ email })
            if (!user) {
                user = new User({ email })
            }
            user.emailOtp = otp
            user.emailOtpExpiry = expiry
            await user.save()
            await sendOtpToEmail(email, otp)

            return response(res, 200, "Otp send to your email", { email })

        }
        if (!phoneNumber || !phoneSuffix) {
            return response(res, 400, "Phone number and phone suffix required")
        }
        const fullPhoneNumber = `${phoneSuffix}${phoneNumber}`
        user = await User.findOne({ phoneNumber })
        if (!user) {
            user = await new User({ phoneNumber, phoneSuffix })
        }
        await sendOtpToPhoneNumber(fullPhoneNumber)
        await user.save()
        return response(res, 200, "Otp send successfully", user)
    } catch (error) {
        console.log(error)
        return response(res, 500, "Internal server error")
    }
}

export const verifyOtp = async (req, res) => {
    try {
        const { phoneNumber, phoneSuffix, email, otp } = req.body

        let user;
        if (email) {
            user = await User.findOne({ email })
            if (!user) {
                return response(res, 404, 'user not found')
            }
            const now = new Date()
            if (!user.emailOtp || String(user.emailOtp) !== String(otp) || now > new Date(user.emailOtpExpiry)) {
                return response(res, 400, 'invalid or expired otp')
            }
            user.isVerified = true
            user.emailOtp = null
            user.emailOtpExpiry = null

            await user.save()
        } else {

            if (!phoneNumber || !phoneSuffix) {
                return response(res, 400, "Phone number and phone suffix required")
            }
            const fullPhoneNumber = `${phoneSuffix}${phoneNumber}`
            user = await User.findOne({ phoneNumber })
            if (!user) {
                user = await new User({ phoneNumber, phoneSuffix })
            }
            const result = await verifyOtpService(fullPhoneNumber, otp)

            if (result.status !== "approved") {
                return response(res, 400, "invalid otp")
            }
            user.isVerified = true
            await user.save()

        }
        const token = generateToken(user?._id)
        res.cookie("auth_token", token, {
            httpOnly: true,
            maxAge: 1000 * 60 * 60 * 24 * 365
        })
        return response(res, 200, 'Otp verified successfully', { token, user })

    } catch (error) {
        console.log(error)
        return response(res, 500, "Internal server error")
    }
}

export const updateProfile = async (req, res) => {
    try {
        const { username, agreed, about } = req.body
        const userId = req.user.userId

        const user = await User.findById(userId)
        const file = req.file
        if (file) {
            const uploadResult = await uploadFileToCloudinary(file)
            user.profilePicture = uploadResult?.secure_url
        } else if (req.body.profilePicture) {
            user.profilePicture = req.body.profilePicture
        }

        if (username) user.username = username
        if (agreed) user.agreed = agreed
        if (about) user.about = about
        await user.save()

        return response(res, 200, 'user profile updated successfully', user)

    } catch (error) {
        console.log(error)
        return response(res, 500, "Internal server error")
    }
}

export const logout = async (req, res) => {
    try {
        res.cookie('auth_token', "", { expires: new Date(0) })
        return response(res, 200, "user logout successfully")
    } catch (error) {
        console.log(error)
        return response(res, 500, "Internal server error")
    }
}

export const checkAuthenticated = async (req, res) => {
    try {
        const userId = req.user.userId
        if (!userId) {
            return response(res, 404, 'unauthorized ! please login before access our app')
        }

        const user = await User.findById(userId)
        if (!user) {
            return response(res, 404, 'User not found')
        }
        return response(res, 200, 'user retrived and allow to use whatsapp', user)

    } catch (error) {
        console.log(error)
        return response(res, 500, "Internal server error")
    }
}


export const getAllUsers = async (req, res) => {
    try {
        const loggedInUserId = req.user.userId;

        const users = await User.find({
            _id: { $ne: loggedInUserId },
        })
            .select("username profilePicture lastSeen isOnline about phoneNumber phoneSuffix")
            .lean();

        const usersWithConversation = await Promise.all(
            users.map(async (user) => {
                const conversation = await Conversation.findOne({
                    participants: { $all: [loggedInUserId, user._id] }, // ✅ FIX
                })
                    .populate({
                        path: "lastMessage",
                        select: "content createdAt sender receiver",
                    })
                    .lean();

                return {
                    ...user,
                    conversation: conversation || null,
                };
            })
        );

        return response(res, 200, "Users retrieved successfully", usersWithConversation);
    } catch (error) {
        console.log(error);
        return response(res, 500, "Internal server error");
    }
};
