import User from "../Models/user.mjs";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import nodemailer from "nodemailer";

// Helper function to generate 6-digit OTP
const generateOtp = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Helper function to create nodemailer transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    service: "Gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

// ✅ Login Handler
const Login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({ success: false, message: "User not found" });
    }

    if (!user.isVerified) {
      return res.status(403).json({ success: false, message: "User not verified. Please verify your account before logging in." });
    }


const isPasswordValid = await bcrypt.compare(password, user.password);
if (!isPasswordValid) {
  return res.status(401).json({ success: false, message: "Incorrect password" });
}
    // ✅ Generate JWT token
    const token = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    return res.status(200).json({
      success: true,
      message: "Login successful",
      user,
      token,
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error during login",
    });
  }
};

const Signup = async (req, res) => {
  const { username, email, password, otp } = req.body;

 try {
     const existingUser = await User.findOne({ email });
 
     if (existingUser) {
       return res.status(400).json({
         success: false,
         message: "Email already registered",
       });
     }

    if (!otp) {
      // Send OTP
      const generatedOtp = generateOtp();
      const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
      
      const tempUser = new User({ username, email, password, isVerified: false, otp: generatedOtp, otpExpiry });

      const hashedPassword = await bcrypt.hash(password, 10);
      tempUser.username = username;
      tempUser.password = hashedPassword;
      await tempUser.save();

      const transporter = createTransporter();
      await transporter.sendMail({
        from: `"OTP Verification" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: "Your OTP Code",
        html: `
          <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #FF5722 0%, #FF9800 100%); border-radius: 20px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.2);">
            <div style="background: white; margin: 20px; border-radius: 15px; padding: 40px; text-align: center;">
              <div style="font-size: 4rem; margin-bottom: 20px;">🏪</div>
              <h1 style="color: #FF5722; margin-bottom: 10px; font-size: 2rem;">FoodExpress</h1>
              <h2 style="color: #333; margin-bottom: 30px;">Your OTP Code</h2>
              <div style="background: linear-gradient(45deg, #4CAF50, #8BC34A); color: white; padding: 20px; border-radius: 15px; font-size: 2rem; font-weight: bold; letter-spacing: 3px; margin: 30px 0;">${generatedOtp}</div>
              <p style="color: #666; font-size: 1.1rem; margin: 20px 0;">This code will expire in <strong style="color: #FF5722;">10 minutes</strong></p>
              <p style="color: #999; font-size: 0.9rem;">If you didn't request this code, please ignore this email.</p>
            </div>
          </div>
        `,
      });

      return res.status(200).json({
        success: true,
        message: "OTP sent to email. Please verify to complete signup.",
      });
    } else {
      // Verify OTP and create user
      const user = await User.findOne({ email });

      if (!user) {
        return res.status(400).json({
          success: false,
          message: "User not found. Please request OTP first.",
        });
      }

      if (user.otp !== otp) {
        return res.status(400).json({
          success: false,
          message: "Invalid OTP",
        });
      }

      if (user.otpExpiry < new Date()) {
        return res.status(400).json({
          success: false,
          message: "OTP expired",
        });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      user.username = username;
      user.password = hashedPassword;
      user.isVerified = true;
      user.otp = null;
      user.otpExpiry = null;

      await user.save();

      return res.status(201).json({
        success: true,
        message: "Signup successful. You can now login.",
        user,
      });
    }
  } catch (err) {
    console.error("Signup error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error during signup",
    });
  }
};

// ✅ Get All Users
const getAllUsers = async (req, res) => {
  try {
    const users = await User.find();
    return res.status(200).json({
      success: true,
      users,
    });
  } catch (err) {
    console.error("Get users error:", err);
    return res.status(500).json({
      success: false,
      message: "Error fetching users",
    });
  }
};

const Logout = async (req, res) => {
  try {
    // Instruct client to remove token and redirect to login/signup
    return res.status(200).json({
      success: true,
      message: "Logout successful. Please clear your token and redirect to login/signup pages.",
    });
  } catch (err) {
    console.error("Logout error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error during logout",
    });
  }
};

// New function to send OTP via email
const sendOtp = async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const otp = generateOtp();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // OTP valid for 10 minutes

    user.otp = otp;
    user.otpExpiry = otpExpiry;
    await user.save();

    const transporter = createTransporter();

      await transporter.sendMail({
        from: `"OTP Verification" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: "Your OTP Code",
        html: `
          <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #FF5722 0%, #FF9800 100%); border-radius: 20px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.2);">
            <div style="background: white; margin: 20px; border-radius: 15px; padding: 40px; text-align: center;">
              <div style="font-size: 4rem; margin-bottom: 20px;">🏪</div>
              <h1 style="color: #FF5722; margin-bottom: 10px; font-size: 2rem;">FoodExpress</h1>
              <h2 style="color: #333; margin-bottom: 30px;">Your OTP Code</h2>
              <div style="background: linear-gradient(45deg, #4CAF50, #8BC34A); color: white; padding: 20px; border-radius: 15px; font-size: 2rem; font-weight: bold; letter-spacing: 3px; margin: 30px 0;">${otp}</div>
              <p style="color: #666; font-size: 1.1rem; margin: 20px 0;">This code will expire in <strong style="color: #FF5722;">10 minutes</strong></p>
              <p style="color: #999; font-size: 0.9rem;">If you didn't request this code, please ignore this email.</p>
            </div>
          </div>
        `,
      });

    return res.status(200).json({
      success: true,
      message: "OTP sent to email",
    });
  } catch (error) {
    console.error("Error sending OTP:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to send OTP",
    });
  }
};

// New function to verify OTP
const verifyOtp = async (req, res) => {
  const { email, otp } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (!user.otp || !user.otpExpiry) {
      return res.status(400).json({ success: false, message: "OTP not requested" });
    }

    if (user.otpExpiry < new Date()) {
      return res.status(400).json({ success: false, message: "OTP expired" });
    }

    if (user.otp !== otp) {
      return res.status(400).json({ success: false, message: "Invalid OTP" });
    }

    // OTP is valid, clear OTP fields and set isVerified true
    user.otp = null;
    user.otpExpiry = null;
    user.isVerified = true;
    await user.save();

    return res.status(200).json({
      success: true,
      message: "OTP verified successfully",
    });
  } catch (error) {
    console.error("Error verifying OTP:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to verify OTP",
    });
  }
};

const signupOtpVerify = async (req, res) => {
  const { email, otp } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (!user.otp || !user.otpExpiry) {
      return res.status(400).json({ success: false, message: "OTP not requested" });
    }

    if (user.otpExpiry < new Date()) {
      return res.status(400).json({ success: false, message: "OTP expired" });
    }

    if (user.otp !== otp) {
      return res.status(400).json({ success: false, message: "Invalid OTP" });
    }

    // OTP is valid, clear OTP fields and set isVerified true
    user.otp = null;
    user.otpExpiry = null;
    user.isVerified = true;
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Signup OTP verified successfully",
    });
  } catch (error) {
    console.error("Error verifying signup OTP:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to verify signup OTP",
    });
  }
};

const resendOtp = async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const otp = generateOtp();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // OTP valid for 10 minutes

    user.otp = otp;
    user.otpExpiry = otpExpiry;
    await user.save();

    const transporter = createTransporter();

    await transporter.sendMail({
      from: `"OTP Verification" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Your OTP Code",
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #FF5722 0%, #FF9800 100%); border-radius: 20px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.2);">
          <div style="background: white; margin: 20px; border-radius: 15px; padding: 40px; text-align: center;">
            <div style="font-size: 4rem; margin-bottom: 20px;">🏪</div>
            <h1 style="color: #FF5722; margin-bottom: 10px; font-size: 2rem;">FoodExpress</h1>
            <h2 style="color: #333; margin-bottom: 30px;">Your OTP Code</h2>
            <div style="background: linear-gradient(45deg, #4CAF50, #8BC34A); color: white; padding: 20px; border-radius: 15px; font-size: 2rem; font-weight: bold; letter-spacing: 3px; margin: 30px 0;">${otp}</div>
            <p style="color: #666; font-size: 1.1rem; margin: 20px 0;">This code will expire in <strong style="color: #FF5722;">10 minutes</strong></p>
            <p style="color: #999; font-size: 0.9rem;">If you didn't request this code, please ignore this email.</p>
          </div>
        </div>
      `,
    });

    return res.status(200).json({
      success: true,
      message: "OTP resent to email",
    });
  } catch (error) {
    console.error("Error resending OTP:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to resend OTP",
    });
  }
};

export const updateProfile = async (req, res) => {
  const { userId, username, password } = req.body;

  if (!userId) {
    return res.status(400).json({ success: false, message: "User ID is required" });
  }

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Check if username and password are same as current
    const isUsernameSame = username === user.username;
    let isPasswordSame = false;
    if (password) {
      isPasswordSame = await bcrypt.compare(password, user.password);
    } else {
      isPasswordSame = true; // No new password provided means password unchanged
    }

    if (isUsernameSame && isPasswordSame) {
      return res.status(400).json({
        success: false,
        message: "Update your profile can't update the same credentials",
      });
    }

    if (username && !isUsernameSame) {
      user.username = username;
    }

    if (password && !isPasswordSame) {
      const hashedPassword = await bcrypt.hash(password, 10);
      user.password = hashedPassword;
    }

    await user.save();

    // Exclude password from response
    const userResponse = user.toObject();
    delete userResponse.password;

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      user: userResponse,
    });
  } catch (error) {
    console.error("Error updating profile:", error);
    return res.status(500).json({
      success: false,
      message: "Server error during profile update",
    });
  }
};

const resetPassword = async (req, res) => {
  const { email, otp, newPassword } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (!user.otp || !user.otpExpiry) {
      return res.status(400).json({ success: false, message: "OTP not requested" });
    }

    if (user.otpExpiry < new Date()) {
      return res.status(400).json({ success: false, message: "OTP expired" });
    }

    if (user.otp !== otp) {
      return res.status(400).json({ success: false, message: "Invalid OTP" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    user.otp = null;
    user.otpExpiry = null;
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Password reset successfully",
    });
  } catch (error) {
    console.error("Error resetting password:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to reset password",
    });
  }
};

export default {
  Login,
  Signup,
  getAllUsers,
  Logout,
  sendOtp,
  verifyOtp,
  signupOtpVerify,
  resendOtp,
  updateProfile,
  resetPassword,
};