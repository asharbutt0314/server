import mongoose from "mongoose";

const clientSchema = new mongoose.Schema({
  username: { type: String, required: true },
  restaurantName: { type: String, required: true },
  restaurantImage: { type: String, default: '' },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  otp: String,
  otpExpiry: Date,
  isVerified: { type: Boolean, default: false },
});

const Client = mongoose.model("Client", clientSchema);
export default Client;
