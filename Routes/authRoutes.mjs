import express from "express";
import UserController from "../Controllers/UserController.mjs";

const router = express.Router();

router.put("/update-profile", UserController.updateProfile);

// User registration
router.post("/signup", UserController.Signup);

// User login
router.post("/login", UserController.Login);

// User logout
router.post("/logout", UserController.Logout);

// Send OTP
router.post("/send-otp", UserController.sendOtp);

// Verify OTP
router.post("/verify-otp", UserController.verifyOtp);

// Verify Signup OTP
router.post("/signup-otp-verify", UserController.signupOtpVerify);
router.post("/resend-otp", UserController.resendOtp);
router.post("/reset-password", UserController.resetPassword);

// Get all users
router.get("/users", UserController.getAllUsers);

export default router;
