import multer from "multer";
import cloudinary from "cloudinary";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config(); // 🔥 REQUIRED

cloudinary.v2.config({
    cloud_name: process.env.CLOUDINARY_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const uploadFileToCloudinary = (file) => {
    const options = {
        resource_type: file.mimetype.startsWith("video") ? "video" : "image",
    };

    return new Promise((resolve, reject) => {
        const uploader = file.mimetype.startsWith("video")
            ? cloudinary.v2.uploader.upload_large
            : cloudinary.v2.uploader.upload;

        uploader(file.path, options, (error, result) => {
            fs.unlink(file.path, () => {});
            if (error) return reject(error);
            resolve(result);
        });
    });
};

export const multerMiddleware = multer({
    dest: "uploads/",
}).single("media");
