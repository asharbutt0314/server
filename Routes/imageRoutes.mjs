import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const router = express.Router();

const uploadsDir = path.join(__dirname, '..', 'uploads');

// Get image by filename
router.get('/:filename', (req, res) => {
  const filename = req.params.filename;
  const imagePath = path.join(uploadsDir, filename);
  
  // Check if file exists
  if (!fs.existsSync(imagePath)) {
    return res.status(404).json({ message: 'Image not found' });
  }
  
  // Set appropriate headers
  const ext = path.extname(filename).toLowerCase();
  const mimeTypes = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp'
  };
  
  const mimeType = mimeTypes[ext] || 'application/octet-stream';
  res.setHeader('Content-Type', mimeType);
  res.setHeader('Cache-Control', 'public, max-age=31536000');
  
  res.sendFile(imagePath);
});

// Get all images list
router.get('/', (req, res) => {
  try {
    if (!fs.existsSync(uploadsDir)) {
      return res.json([]);
    }
    
    const files = fs.readdirSync(uploadsDir);
    const imageFiles = files.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext);
    });
    
    const images = imageFiles.map(file => ({
      filename: file,
      url: `/uploads/${file}`,
      fullUrl: `${req.protocol}://${req.get('host')}/uploads/${file}`
    }));
    
    res.json(images);
  } catch (error) {
    res.status(500).json({ message: 'Failed to list images', error: error.message });
  }
});

export default router;