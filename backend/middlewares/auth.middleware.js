import { response } from "../utils/responseHandle.js";
import jwt from "jsonwebtoken";

export const authMiddleware=async (req,res,next)=>{
    const authToken=req.cookies?.auth_token
    if(!authToken){
        return response(res,401,'authorization token missing. please provide token')
    }
    try {
        const decode=jwt.verify(authToken,process.env.JWT_SECRET)
        req.user=decode

        next()
    } catch (error) {
        console.log(error)
        return response(res,401,'Invalid or expired token')
    }

}