import express from "express";
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import ClientController from "../Controllers/ClientController.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadDir = path.resolve(__dirname, '..', 'uploads');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const filename = Date.now() + path.extname(file.originalname);
    cb(null, filename);
  }
});

const upload = multer({ storage });

const router = express.Router();

router.put("/update-profile", upload.single('restaurantImage'), ClientController.updateProfile);

// User registration
router.post("/signup", upload.single('restaurantImage'), ClientController.Signup);

// User login
router.post("/login", ClientController.Login);

// User logout
router.post("/logout", ClientController.Logout);

// Send OTP
router.post("/send-otp", ClientController.sendOtp);

// Verify OTP
router.post("/verify-otp", ClientController.verifyOtp);

// Verify Signup OTP
router.post("/signup-otp-verify", ClientController.signupOtpVerify);
router.post("/resend-otp", ClientController.resendOtp);
router.post("/reset-password", ClientController.resetPassword);

// Get all clients
router.get("/users", ClientController.getAllClients);
router.get("/restaurants", ClientController.getAllRestaurants);

export default router;
