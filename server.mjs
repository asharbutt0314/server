import express from 'express';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import cors from 'cors';
import productRoutes from "./Routes/productRoutes.mjs";
import authRoutes from "./Routes/authRoutes.mjs";
import authRoutesClient from "./Routes/authRoutesClient.mjs";
import orderRoutes from "./Routes/OrderRoutes.mjs";
import imageRoutes from "./Routes/imageRoutes.mjs";

dotenv.config();
const app = express();

app.use(cors());
app.use(express.json());


import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Image serving endpoint
app.get('/api/image/:filename', (req, res) => {
  const filename = req.params.filename;
  const imagePath = path.join(__dirname, 'uploads', filename);
  
  res.sendFile(imagePath, (err) => {
    if (err) {
      res.status(404).json({ message: 'Image not found' });
    }
  });
});

app.use('/products', productRoutes);
app.use("/auth", authRoutes);
app.use("/Clientauth", authRoutesClient);
app.use("/orders", orderRoutes);
app.use('/images', imageRoutes);

mongoose.connect(process.env.MONGO_URL)
  .then(() => console.log('✅ MongoDB connected'))
  .catch((err) => console.log('❌ MongoDB error:', err));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

// Global error handling middleware
app.use((err, req, res, next) => {
  console.error('Global error handler:', err);
  if (res.headersSent) {
    return next(err);
  }
  res.status(err.status || 500).json({ message: err.message || 'Internal Server Error' });
});


