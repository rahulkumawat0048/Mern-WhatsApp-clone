import useUserStore from "../store/useUserStore";
import axiosInstance from "./url.service"
import {io} from "socket.io-client"

let socket=null;

export const initializeSocket=()=>{
    if(socket) return  socket;

    const user=useUserStore.getState().user
    const BACKEND_URL=import.meta.env.VITE_API_URL;

    socket=io(BACKEND_URL,{
        withCredentials:true,
        reconnectionAttempts:5,
        reconnectionDelay:1000,
    })

    // connection events 
    socket.on('connect',()=>{
        socket.emit("user_connected",user?._id)
    })

    socket.on("connect_error",(error)=>[
        console.log("socket connection error",error)
    ])
    //disconnected event
    socket.on('disconnect',(reason)=>{
    })

    return socket;
    
}

export const getSocket=()=>{
    if(!socket){
        return initializeSocket()
    }
    return socket ;
}

export const disconnectSocket=()=>{
    if(socket){
        socket.disconnect();
        socket=null
    }
}
