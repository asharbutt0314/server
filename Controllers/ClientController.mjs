import Client from "../Models/client.mjs";
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
    const client = await Client.findOne({ email });

    if (!client) {
      return res.status(401).json({ success: false, message: "Client not found" });
    }

    if (!client.isVerified) {
      return res.status(403).json({ success: false, message: "Client not verified. Please verify your account before logging in." });
    }


const isPasswordValid = await bcrypt.compare(password, client.password);
if (!isPasswordValid) {
  return res.status(401).json({ success: false, message: "Incorrect password" });
}
    // ✅ Generate JWT token
    const token = jwt.sign(
      { id: client._id, email: client.email },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    return res.status(200).json({
      success: true,
      message: "Login successful",
      client,
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
    const { username, restaurantName, email, password, otp } = req.body;
  let restaurantImagePath = '';
  if (req.file) {
    restaurantImagePath = '/uploads/' + req.file.filename;
  }

  try {
    const existingClient = await Client.findOne({ email });

    if (existingClient) {
      return res.status(400).json({
        success: false,
        message: "Email already registered",
      });
    }

    if (!otp) {
      // Send OTP
      const generatedOtp = generateOtp();
      const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
      
      const hashedPassword = await bcrypt.hash(password, 10);
      const tempClient = new Client({ 
        username, 
        restaurantName,
        restaurantImage: restaurantImagePath,
        email, 
        password: hashedPassword, 
        isVerified: false, 
        otp: generatedOtp, 
        otpExpiry 
      });
      await tempClient.save();

      const transporter = createTransporter();
      await transporter.sendMail({
        from: `"OTP Verification" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: "Your OTP Code",
        html: `
          <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #FF5722 0%, #FF9800 100%); border-radius: 20px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.2);">
            <div style="background: white; margin: 20px; border-radius: 15px; padding: 40px; text-align: center;">
              <div style="font-size: 4rem; margin-bottom: 20px;">🏪</div>
              <h1 style="color: #FF5722; margin-bottom: 10px; font-size: 2rem;">FoodExpress Admin</h1>
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
      // Verify OTP and create client
      const client = await Client.findOne({ email });

      if (!client) {
        return res.status(400).json({
          success: false,
          message: "Client not found. Please request OTP first.",
        });
      }

      if (client.otp !== otp) {
        return res.status(400).json({
          success: false,
          message: "Invalid OTP",
        });
      }

      if (client.otpExpiry < new Date()) {
        return res.status(400).json({
          success: false,
          message: "OTP expired",
        });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      client.username = username;
      client.restaurantName = restaurantName;
      if (restaurantImagePath) {
        client.restaurantImage = restaurantImagePath;
      }
      client.password = hashedPassword;
      client.isVerified = true;
      client.otp = null;
      client.otpExpiry = null;

      await client.save();

      return res.status(201).json({
        success: true,
        message: "Signup successful. You can now login.",
        client,
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

// ✅ Get All Clients
const getAllClients = async (req, res) => {
  try {
    const clients = await Client.find();
    return res.status(200).json({
      success: true,
      clients,
    });
  } catch (err) {
    console.error("Get clients error:", err);
    return res.status(500).json({
      success: false,
      message: "Error fetching clients",
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
    const client = await Client.findOne({ email });
    if (!client) {
      return res.status(404).json({ success: false, message: "Client not found" });
    }

    const otp = generateOtp();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // OTP valid for 10 minutes

    client.otp = otp;
    client.otpExpiry = otpExpiry;
    await client.save();

    const transporter = createTransporter();

      await transporter.sendMail({
        from: `"OTP Verification" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: "Your OTP Code",
        html: `
          <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #FF5722 0%, #FF9800 100%); border-radius: 20px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.2);">
            <div style="background: white; margin: 20px; border-radius: 15px; padding: 40px; text-align: center;">
              <div style="font-size: 4rem; margin-bottom: 20px;">🏪</div>
              <h1 style="color: #FF5722; margin-bottom: 10px; font-size: 2rem;">FoodExpress Admin</h1>
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
    const client = await Client.findOne({ email });
    if (!client) {
      return res.status(404).json({ success: false, message: "Client not found" });
    }

    if (!client.otp || !client.otpExpiry) {
      return res.status(400).json({ success: false, message: "OTP not requested" });
    }

    if (client.otpExpiry < new Date()) {
      return res.status(400).json({ success: false, message: "OTP expired" });
    }

    if (client.otp !== otp) {
      return res.status(400).json({ success: false, message: "Invalid OTP" });
    }

    // OTP is valid, clear OTP fields and set isVerified true
    client.otp = null;
    client.otpExpiry = null;
    client.isVerified = true;
    await client.save();

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
    const client = await Client.findOne({ email });
    if (!client) {
      return res.status(404).json({ success: false, message: "Client not found" });
    }

    if (!client.otp || !client.otpExpiry) {
      return res.status(400).json({ success: false, message: "OTP not requested" });
    }

    if (client.otpExpiry < new Date()) {
      return res.status(400).json({ success: false, message: "OTP expired" });
    }

    if (client.otp !== otp) {
      return res.status(400).json({ success: false, message: "Invalid OTP" });
    }

    // OTP is valid, clear OTP fields and set isVerified true
    client.otp = null;
    client.otpExpiry = null;
    client.isVerified = true;
    await client.save();

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
    const client = await Client.findOne({ email });
    if (!client) {
      return res.status(404).json({ success: false, message: "Client not found" });
    }

    const otp = generateOtp();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // OTP valid for 10 minutes

    client.otp = otp;
    client.otpExpiry = otpExpiry;
    await client.save();

    const transporter = createTransporter();

    await transporter.sendMail({
      from: `"OTP Verification" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Your OTP Code",
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #FF5722 0%, #FF9800 100%); border-radius: 20px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.2);">
          <div style="background: white; margin: 20px; border-radius: 15px; padding: 40px; text-align: center;">
            <div style="font-size: 4rem; margin-bottom: 20px;">🏪</div>
            <h1 style="color: #FF5722; margin-bottom: 10px; font-size: 2rem;">FoodExpress Admin</h1>
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
  const { clientId, username, restaurantName, password } = req.body;
  let restaurantImagePath = '';
  if (req.file) {
    restaurantImagePath = '/uploads/' + req.file.filename;
  }

  if (!clientId) {
    return res.status(400).json({ success: false, message: "Client ID is required" });
  }

  try {
    const client = await Client.findById(clientId);
    if (!client) {
      return res.status(404).json({ success: false, message: "Client not found" });
    }

    // Check if anything is actually changing
    const isUsernameSame = username === client.username;
    const isRestaurantNameSame = restaurantName === client.restaurantName;
    let isPasswordSame = false;
    if (password) {
      isPasswordSame = await bcrypt.compare(password, client.password);
    } else {
      isPasswordSame = true; // No new password provided means password unchanged
    }
    const hasNewImage = !!restaurantImagePath;

    if (isUsernameSame && isRestaurantNameSame && isPasswordSame && !hasNewImage) {
      return res.status(400).json({
        success: false,
        message: "No changes detected. Please modify at least one field to update your profile.",
      });
    }

    if (username && !isUsernameSame) {
      client.username = username;
    }

    if (restaurantName) {
      client.restaurantName = restaurantName;
    }

    if (restaurantImagePath) {
      client.restaurantImage = restaurantImagePath;
    }

    if (password && !isPasswordSame) {
      const hashedPassword = await bcrypt.hash(password, 10);
      client.password = hashedPassword;
    }

    await client.save();

    // Exclude password from response
    const clientResponse = client.toObject();
    delete clientResponse.password;

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      client: clientResponse,
      
    });
  } catch (error) {
    console.error("Error updating profile:", error);
    return res.status(500).json({
      success: false,
      message: "Server error during profile update",
    });
  }
};

const getAllRestaurants = async (req, res) => {
  try {
    const restaurants = await Client.find({ isVerified: true }, 'username restaurantName restaurantImage email');
    // Clean up products from deleted clients
    const Product = (await import('../Models/product.mjs')).default;
    const validClientIds = restaurants.map(r => r._id.toString());
    await Product.deleteMany({ clientId: { $nin: validClientIds } });
    
    return res.status(200).json({
      success: true,
      restaurants,
    });
  } catch (err) {
    console.error("Get restaurants error:", err);
    return res.status(500).json({
      success: false,
      message: "Error fetching restaurants",
    });
  }
};

const resetPassword = async (req, res) => {
  const { email, otp, newPassword } = req.body;

  try {
    const client = await Client.findOne({ email });
    if (!client) {
      return res.status(404).json({ success: false, message: "Client not found" });
    }

    if (!client.otp || !client.otpExpiry) {
      return res.status(400).json({ success: false, message: "OTP not requested" });
    }

    if (client.otpExpiry < new Date()) {
      return res.status(400).json({ success: false, message: "OTP expired" });
    }

    if (client.otp !== otp) {
      return res.status(400).json({ success: false, message: "Invalid OTP" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    client.password = hashedPassword;
    client.otp = null;
    client.otpExpiry = null;
    await client.save();

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
  getAllClients,
  getAllRestaurants,
  Logout,
  sendOtp,
  verifyOtp,
  signupOtpVerify,
  resendOtp,
  updateProfile,
  resetPassword,
};