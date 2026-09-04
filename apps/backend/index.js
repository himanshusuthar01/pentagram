import "./setupEnv.js";

import connectDB from "./src/config/db.js";
import userRoute from "./src/routes/userRoute.js";
import blogRoute from "./src/routes/blogRoute.js";
import commentRoute from "./src/routes/commentRoute.js";
import express from "express";
import { app, server } from "./src/config/socket.js";
import cookieParser from "cookie-parser";
import cors from "cors";

app.use(cors({
  origin: process.env.CLIENT_URL || true,
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

import messageRoute from "./src/routes/messageRoute.js";

app.use("/api/auth", userRoute);
app.use("/api/posts", blogRoute);
app.use("/api/posts/:postId/comments", commentRoute);
app.use("/api/message", messageRoute);

// Added aliases without '/api' prefix because the frontend is calling them directly
app.use("/auth", userRoute);
app.use("/posts", blogRoute);
app.use("/posts/:postId/comments", commentRoute);
app.use("/message", messageRoute);

// Simple health check route
app.get("/", (req, res) => {
  res.status(200).json({ message: "Backend is running successfully!" });
});

const start = async () => {
  try {
    await connectDB();
    const port = process.env.PORT || 5000;
    server.listen(port, () => {
      console.log(`Server Started at port ${port}`);
    });
  } catch (error) {
    console.log("Server failed to start", error);
  }
};

const handler = async (req, res) => {
  try {
    await connectDB();
    return app(req, res);
  } catch (error) {
    console.error("Request failed to initialize", error);
    return res.status(500).json({ message: "Service unavailable" });
  }
};

export { app };
export default handler;

if (!process.env.VERCEL) {
  start();
}
