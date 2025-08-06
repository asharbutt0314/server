import Product from "../Models/product.mjs";
import path from "path";


const cart = [];

export const getAllProducts = async (req, res) => {
  try {
    const Client = (await import('../Models/client.mjs')).default;
    
    // Clean up orphaned products first
    const validClients = await Client.find({}, '_id');
    const validClientIds = validClients.map(c => c._id.toString());
    await Product.deleteMany({ clientId: { $nin: validClientIds } });
    
    // Get remaining valid products
    const products = await Product.find();
    
    res.status(200).json(products);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch products', error: err.message });
  }
};

export const getClientProducts = async (req, res) => {
  try {
    const { clientId } = req.params;
    
    // Verify client exists
    const Client = (await import('../Models/client.mjs')).default;
    const client = await Client.findById(clientId);
    if (!client) {
      return res.status(404).json({ message: 'Client not found' });
    }
    
    const products = await Product.find({ clientId });
    res.status(200).json(products);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch client products', error: err.message });
  }
};

export const addProduct = async (req, res) => {
  try {
    const { name, price, description, discount, clientId } = req.body;

    let imagePath = '';
    if (req.file) {
      imagePath = '/uploads/' + path.basename(req.file.path);
    }

    const product = new Product({
      name,
      price,
      description,
      image: imagePath,
      discount: discount || 0,
      clientId
    });


    await product.save();

    res.status(201).json(product);
  } catch (err) {
    res.status(500).json({ message: 'Upload failed', error: err.message });
  }
};

export const addToCart = async (req, res) => {
  const { productId, action } = req.body;
  
  if (!productId) {
    return res.status(400).json({ message: "Product ID is required" });
  }
  
  try {
    // Get the product to check its restaurant
    const product = await Product.findById(productId);
    
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    
    // Check if cart has items from different restaurant
    if (cart.length > 0) {
      const firstCartProduct = await Product.findById(cart[0].productId);
      if (firstCartProduct && firstCartProduct.clientId && product.clientId) {
        if (firstCartProduct.clientId.toString() !== product.clientId.toString()) {
          return res.status(400).json({ message: "You can add products from 1 restaurant at a time" });
        }
      }
    }
    
    const existing = cart.find(item => item.productId === productId);
    if (action === 'increment') {
      if (existing) {
        existing.quantity += 1;
      } else {
        cart.push({ productId, quantity: 1 });
      }
    } else if (action === 'decrement') {
      if (existing) {
        existing.quantity -= 1;
        if (existing.quantity <= 0) {
          const index = cart.findIndex(item => item.productId === productId);
          if (index !== -1) {
            cart.splice(index, 1);
          }
        }
      } else {
        return res.status(400).json({ message: "Product not in cart" });
      }
    } else {
      // Default action: add or increment
      if (existing) {
        existing.quantity += 1;
      } else {
        cart.push({ productId, quantity: 1 });
      }
    }
    res.status(200).json({ message: "Cart updated", cart });
  } catch (err) {
    res.status(500).json({ message: "Failed to add to cart", error: err.message });
  }
};

// Edit an existing product
export const editProduct = async (req, res) => {
  try {
    const { clientId } = req.body;
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });
    
    // Check if product belongs to the client
    if (product.clientId.toString() !== clientId) {
      return res.status(403).json({ message: "Not authorized to edit this product" });
    }

const updateData = { ...req.body };
    if (req.file) {
      updateData.image = '/uploads/' + path.basename(req.file.path);
    }
    if (updateData.discount !== undefined) {
      updateData.discount = Math.max(0, Math.min(100, updateData.discount || 0));
    }
    const updatedProduct = await Product.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
    });
    res.status(200).json(updatedProduct);
  } catch (err) {
    res.status(400).json({ message: "Failed to update product", error: err.message });
  }
};


// Delete a product
export const deleteProduct = async (req, res) => {
  try {
    const { clientId } = req.body;
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });
    
    // Check if product belongs to the client
    if (product.clientId.toString() !== clientId) {
      return res.status(403).json({ message: "Not authorized to delete this product" });
    }
    
    const deletedProduct = await Product.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "Product deleted", product: deletedProduct });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete product" });
  }
};

export const getProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.status(200).json(product);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch product", error: err.message });
  }
};

export const viewCart = (req, res) => {
  res.status(200).json(cart);
};

export const removeFromCart = (req, res) => {
  const { productId } = req.body;
  if (!productId) {
    return res.status(400).json({ message: "Product ID is required" });
  }
  const index = cart.findIndex(item => item.productId === productId);
  if (index !== -1) {
    cart.splice(index, 1);
    res.status(200).json({ message: "Product removed from cart", cart });
  } else {
    res.status(404).json({ message: "Product not found in cart" });
  }
};

export const clearCart = (req, res) => {
  cart.length = 0;
  res.status(200).json({ message: "Cart cleared", cart });
};

export const getCartRestaurant = async (req, res) => {
  try {
    if (cart.length === 0) {
      return res.status(200).json({ restaurantId: null, restaurantName: null });
    }
    
    const firstProduct = await Product.findById(cart[0].productId);
    if (!firstProduct) {
      return res.status(200).json({ restaurantId: null, restaurantName: null });
    }
    
    const Client = (await import('../Models/client.mjs')).default;
    const restaurant = await Client.findById(firstProduct.clientId);
    
    res.status(200).json({ 
      restaurantId: firstProduct.clientId, 
      restaurantName: restaurant ? restaurant.restaurantName : 'Unknown Restaurant'
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to get cart restaurant", error: err.message });
  }
};

export default {
  getAllProducts,
  getProduct,
  addProduct,
  editProduct,
  deleteProduct,
  addToCart,
  viewCart,
  removeFromCart,
  clearCart,
  getCartRestaurant,
};
