import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from 'url';
import * as productController from "../Controllers/ProductController.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

const uploadDir = path.resolve(__dirname, '..', 'uploads');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const filename = uniqueSuffix + '-' + file.originalname;
    cb(null, filename);
  }
});
const upload = multer({ storage: storage });

router.get('/', productController.getAllProducts);
router.get('/client/:clientId', productController.getClientProducts);
router.get("/getproduct/:id", productController.getProduct);
router.post("/addproduct", upload.single('image'), productController.addProduct);
router.put("/editproduct/:id", upload.single('image'), productController.editProduct);
router.delete("/deleteproduct/:id", productController.deleteProduct);

router.post("/cart/add", productController.addToCart);
router.get("/cart", productController.viewCart);
router.get("/cart/restaurant", productController.getCartRestaurant);
router.delete("/cart/remove", productController.removeFromCart);
router.delete("/cart/clear", productController.clearCart);

export default router;