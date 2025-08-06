import Order from '../Models/order.mjs';
import Product from '../Models/product.mjs';
import User from '../Models/user.mjs';
import { sendOrderConfirmationEmail, sendOrderStatusEmail } from '../Services/emailService.mjs';

export const createOrder = async (req, res) => {
  try {
    const { userId, items, deliveryAddress, city, phone, allergies, paymentMethod } = req.body;
    
    // Calculate total amount
    let totalAmount = 0;
    const orderItems = [];
    
    // Get restaurant information
    const Client = (await import('../Models/client.mjs')).default;
    const restaurants = await Client.find({}, 'restaurantName');
    const restaurantMap = {};
    restaurants.forEach(r => {
      restaurantMap[r._id.toString()] = r.restaurantName;
    });

    for (const item of items) {
      const product = await Product.findById(item.productId);
      if (product) {
        const finalPrice = product.discount > 0 
          ? product.price * (1 - product.discount / 100) 
          : product.price;
        
        orderItems.push({
          productId: item.productId,
          name: product.name,
          restaurantName: restaurantMap[product.clientId.toString()] || 'Unknown Restaurant',
          price: product.price,
          discount: product.discount || 0,
          quantity: item.quantity,
          finalPrice: finalPrice
        });
        
        totalAmount += finalPrice * item.quantity;
      }
    }
    
    const order = new Order({
      userId,
      items: orderItems,
      totalAmount: totalAmount.toFixed(2),
      deliveryAddress,
      city,
      phone,
      allergies: allergies || '',
      paymentMethod: paymentMethod || 'cash'
    });
    
    await order.save();
    
    // Send order confirmation email
    try {
      const user = await User.findById(userId);
      
      if (user && user.email) {
        await sendOrderConfirmationEmail(user.email, user.username, order);
      }
    } catch (emailError) {
      console.error('Failed to send confirmation email:', emailError.message);
      // Don't fail the order if email fails
    }
    
    res.status(201).json({ success: true, order });
  } catch (err) {
    res.status(500).json({ message: 'Failed to create order', error: err.message });
  }
};

export const getUserOrders = async (req, res) => {
  try {
    const { userId } = req.params;
    const orders = await Order.find({ userId }).sort({ orderDate: -1 });
    res.status(200).json(orders);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch orders', error: err.message });
  }
};

export const getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find().populate('userId', 'username email').sort({ orderDate: -1 });
    const ordersWithCustomerName = orders.map(order => ({
      ...order.toObject(),
      customerName: order.userId ? order.userId.username : 'Unknown'
    }));
    res.status(200).json(ordersWithCustomerName);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch orders', error: err.message });
  }
};

export const getClientOrders = async (req, res) => {
  try {
    const { clientId } = req.params;
    
    // Get all products for this client
    const clientProducts = await Product.find({ clientId });
    const clientProductIds = clientProducts.map(p => p._id.toString());
    
    if (clientProductIds.length === 0) {
      return res.status(200).json([]);
    }
    
    // Find orders that contain products from this client
    const orders = await Order.find().populate('userId', 'username email').sort({ orderDate: -1 });
    
    const filteredOrders = orders
      .filter(order => order.items.some(item => clientProductIds.includes(item.productId.toString())))
      .map(order => {
        // Only include items that belong to this client
        const clientItems = order.items.filter(item => clientProductIds.includes(item.productId.toString()));
        
        // Recalculate total amount for client's items only
        const clientTotal = clientItems.reduce((sum, item) => sum + (item.finalPrice * item.quantity), 0);
        
        return {
          ...order.toObject(),
          items: clientItems,
          totalAmount: clientTotal.toFixed(2),
          customerName: order.userId ? order.userId.username : 'Unknown'
        };
      });
    
    res.status(200).json(filteredOrders);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch client orders', error: err.message });
  }
};

export const getOrderDetails = async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await Order.findById(orderId).populate('userId', 'username email');
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    const orderWithCustomerName = {
      ...order.toObject(),
      customerName: order.userId ? order.userId.username : 'Unknown'
    };
    res.status(200).json(orderWithCustomerName);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch order details', error: err.message });
  }
};

export const updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;
    
    const order = await Order.findByIdAndUpdate(
      orderId, 
      { status }, 
      { new: true }
    ).populate('userId', 'username email');
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    // Send status update email
    if (order.userId && order.userId.email) {
      try {
        await sendOrderStatusEmail(order.userId.email, order.userId.username, order, status);
      } catch (emailError) {
        console.error('Failed to send status update email:', emailError);
      }
    }
    
    res.status(200).json({ success: true, order });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update order', error: err.message });
  }
};

export const getClientOrderCount = async (req, res) => {
  try {
    const { clientId } = req.params;
    const clientProducts = await Product.find({ clientId });
    const clientProductIds = clientProducts.map(p => p._id.toString());
    
    const orders = await Order.find({ status: 'delivered' });
    const clientOrders = orders.filter(order => 
      order.items.some(item => clientProductIds.includes(item.productId.toString()))
    );
    const count = clientOrders.length;
    res.json({ count });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getUserOrderCount = async (req, res) => {
  try {
    const { userId } = req.params;
    const count = await Order.countDocuments({ userId });
    res.json({ count });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await Order.findById(orderId, 'status');
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    res.status(200).json({ status: order.status });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch order status', error: err.message });
  }
};

export const testEmail = async (req, res) => {
  try {
    const { email } = req.body;
    const testOrder = {
      _id: '507f1f77bcf86cd799439011',
      orderDate: new Date(),
      deliveryAddress: 'Test Address, City',
      phone: '+1234567890',
      totalAmount: '25.99',
      items: [{
        name: 'Test Pizza',
        quantity: 2,
        price: 15.99,
        discount: 10,
        finalPrice: 14.39
      }]
    };
    
    await sendOrderConfirmationEmail(email, 'Test User', testOrder);
    res.status(200).json({ success: true, message: 'Test email sent successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to send test email', error: err.message });
  }
};