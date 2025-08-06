import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  description: String,
  image: String,
  discount: { type: Number, default: 0, min: 0, max: 100 },
  clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true }
});

const Product = mongoose.model('Product', productSchema);
export default Product;
