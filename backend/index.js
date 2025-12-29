import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors"
import dotenv from "dotenv";
import { connectDb } from "./config/dbConnect.js";
dotenv.config()
import bodyParser from "body-parser";
import authRoute from './routes/auth.routes.js'
import chatRoute from './routes/chat.routes.js'
import statusRoute from './routes/status.routes.js'
import http from "http"
import initializeSocket from './services/socket.service.js'

const PORT = process.env.PORT || 8000
const app = express()

// database connection 
connectDb()



const corsOption = {
    origin: process.env.FRONTEND_URL,
    credentials: true
}
app.use(cors(corsOption))

//Middlewares

app.use(express.json())
app.use(cookieParser())
app.use(bodyParser.urlencoded({ extended: true }))


//create server
const server = http.createServer(app)

const io = initializeSocket(server)

// apply socket middleware before routes
app.use((req, res, next) => {
    req.io = io;
    req.socketUserMap = io.socketUserMap
    next()
})


// Routes

app.use('/api/auth', authRoute)
app.use('/api/chats', chatRoute)
app.use("/api/status",statusRoute)



server.listen(PORT, () => {
    console.log(`Server running on this port ${PORT}`)
})