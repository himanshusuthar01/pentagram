import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import userModel from "../models/userModel.js";
import { loginSchema, signupSchema } from "../validators/userValidate.js";
import cloudinary from "../config/cloudinary.js";
import streamifier from "streamifier";
const salt = Number(process.env.SALT);

const signupController = async (req, res) => {
  const { name, email, password } = req.body;

  try {
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: "All fields are required" });
    }
    const { error } = signupSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    let user = await userModel.findOne({ email });
    if (user) {
      return res.status(409).json({ success: false, message: "Email already exists" });
    }

    let hashPassword = await bcrypt.hash(password, salt);
    user = await userModel.create({
      name,
      email,
      password: hashPassword,
    });
    const payLoad = {
      id: user._id,
      name: user.name,
    };
    const token = jwt.sign(payLoad, process.env.SECRET, { expiresIn: "6h" });
    res.cookie("token", token, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
    });
    return res.status(201).json({
      success: true,
      message: "Signup successful",
      user: { id: user._id, name: user.name },
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

const loginController = async (req, res) => {
  const { email, password } = req.body;
  try {
    if (!email || !password) {
      return res.status(400).json({ success: false, message: "All fields are required" });
    }

    const { error } = loginSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    let user = await userModel.findOne({ email });
    if (!user) {
      return res.status(401).json({ success: false, message: "Invalid Credentials" });
    }

    const payLoad = {
      id: user._id,
      name: user.name,
    };
    const token = jwt.sign(payLoad, process.env.SECRET, { expiresIn: "6h" });
    res.cookie("token", token, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
    });
    return res.status(201).json({
      success: true,
      message: "Login successful",
      user: { id: user._id, name: user.name },
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

const logoutController = (req, res) => {
  res.clearCookie("token", { 
    httpOnly: true,
    secure: true,
    sameSite: "none"
  });
  return res
    .status(200)
    .json({ success: true, message: "Logged out successfully" });
};

const followUserController = async (req, res) => {
  try {
    const targetUserId = req.params.id;
    const currentUserId = req.userId;

    if (targetUserId === currentUserId) {
      return res.status(400).json({ success: false, message: "You cannot follow yourself" });
    }

    const targetUser = await userModel.findById(targetUserId);
    const currentUser = await userModel.findById(currentUserId);

    if (!targetUser || !currentUser) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (!currentUser.following.includes(targetUserId)) {
      await currentUser.updateOne({ $push: { following: targetUserId } });
      await targetUser.updateOne({ $push: { followers: currentUserId } });
      return res.status(200).json({ success: true, message: "User followed successfully" });
    } else {
      return res.status(400).json({ success: false, message: "You already follow this user" });
    }
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

const unfollowUserController = async (req, res) => {
  try {
    const targetUserId = req.params.id;
    const currentUserId = req.userId;

    if (targetUserId === currentUserId) {
      return res.status(400).json({ success: false, message: "You cannot unfollow yourself" });
    }

    const targetUser = await userModel.findById(targetUserId);
    const currentUser = await userModel.findById(currentUserId);

    if (!targetUser || !currentUser) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (currentUser.following.includes(targetUserId)) {
      await currentUser.updateOne({ $pull: { following: targetUserId } });
      await targetUser.updateOne({ $pull: { followers: currentUserId } });
      return res.status(200).json({ success: true, message: "User unfollowed successfully" });
    } else {
      return res.status(400).json({ success: false, message: "You do not follow this user" });
    }
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

const getUserProfileController = async (req, res) => {
  try {
    const id = req.params.id;
    const user = await userModel.findById(id).select("-password").populate("followers", "name profilePic").populate("following", "name profilePic");
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    return res.status(200).json({ success: true, user });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

const getAllUsersController = async (req, res) => {
  try {
    const users = await userModel.find().select("-password");
    return res.status(200).json({ success: true, users });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

const updateUserProfileController = async (req, res) => {
  try {
    const { name, bio } = req.body;
    const userId = req.userId;

    let updateData = { name, bio };

    if (req.file) {
      const uploadFromBuffer = (req) => {
        return new Promise((resolve, reject) => {
          let cld_upload_stream = cloudinary.uploader.upload_stream(
            { folder: "pentagram_profiles" },
            (error, result) => {
              if (result) {
                resolve(result);
              } else {
                reject(error);
              }
            }
          );
          streamifier.createReadStream(req.file.buffer).pipe(cld_upload_stream);
        });
      };
      const result = await uploadFromBuffer(req);
      updateData.profilePic = result.secure_url;
    }

    const updatedUser = await userModel.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select("-password");

    if (!updatedUser) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    return res.status(200).json({ success: true, message: "Profile updated successfully", user: updatedUser });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

const getMeController = async (req, res) => {
  try {
    const userId = req.userId;
    const user = await userModel.findById(userId).select("-password");
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    return res.status(200).json({ success: true, user });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

export { signupController, loginController, logoutController, followUserController, unfollowUserController, getUserProfileController, getAllUsersController, updateUserProfileController, getMeController };
