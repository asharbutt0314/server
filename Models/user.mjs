import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  username: String,
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  otp: String,
  otpExpiry: Date,
  isVerified: { type: Boolean, default: false },
});

const User = mongoose.model("User", userSchema);
export default User;
