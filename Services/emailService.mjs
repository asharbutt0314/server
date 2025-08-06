import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  tls: {
    rejectUnauthorized: false
  }
});

// Test connection
transporter.verify((error, success) => {
  if (error) {
    console.log('Email configuration error:', error);
  } else {
    // console.log('Email server is ready to send messages');
  }
});

export const sendOrderStatusEmail = async (userEmail, userName, order, status) => {
  const getStatusMessage = (status) => {
    switch (status) {
      case 'confirmed': return { title: 'Order Confirmed!', message: 'Your order has been accepted and is being prepared.', color: '#4CAF50' };
      case 'preparing': return { title: 'Order Being Prepared!', message: 'The vendor is making your order. Please wait!', color: '#FF5722' };
      case 'ready': return { title: 'Order Ready!', message: 'Your order is ready! Please wait 15 minutes to deliver at your doorstep.', color: '#9C27B0' };
      case 'delivered': return { title: 'Order Completed!', message: 'Your order has been completed and delivered!', color: '#2196F3' };
      case 'cancelled': return { title: 'Order Declined', message: 'We apologize, but your order has been declined by the vendor.', color: '#f44336' };
      default: return { title: 'Order Update', message: 'Your order status has been updated.', color: '#FF9800' };
    }
  };

  const statusInfo = getStatusMessage(status);
  const itemsList = order.items.map(item => 
    `<tr>
      <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.name}<br><small style="color: #666;">${item.restaurantName || 'Unknown Restaurant'}</small></td>
      <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
      <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right; font-weight: bold;">PKR ${(item.finalPrice * item.quantity).toFixed(2)}</td>
    </tr>`
  ).join('');

  const mailOptions = {
    from: `"FoodExpress" <${process.env.EMAIL_USER}>`,
    to: userEmail,
    subject: `${statusInfo.title} - Order #${order._id.toString().slice(-6)}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8f9fa; padding: 20px;">
        <div style="background: linear-gradient(135deg, ${statusInfo.color} 0%, #FF9800 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="margin: 0; font-size: 28px;">🏪 FoodExpress</h1>
          <h2 style="margin: 10px 0 0 0; font-size: 20px;">${statusInfo.title}</h2>
        </div>
        
        <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">
          <p style="font-size: 18px; color: #333; margin-bottom: 20px;">Hi ${userName},</p>
          <p style="color: #666; margin-bottom: 25px; font-size: 16px;">${statusInfo.message}</p>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 10px; margin-bottom: 25px;">
            <h3 style="color: #FF5722; margin-top: 0;">📄 Order Details</h3>
            <p><strong>Order ID:</strong> #${order._id.toString().slice(-6)}</p>
            <p><strong>Order Date:</strong> ${new Date(order.orderDate).toLocaleDateString()}</p>
            <p><strong>Status:</strong> <span style="color: ${statusInfo.color}; font-weight: bold;">${status.toUpperCase()}</span></p>
          </div>
          
          <div style="margin-bottom: 25px;">
            <h3 style="color: #FF5722;">🚚 Delivery Information</h3>
            <p style="margin-bottom: 8px;"><strong>Address:</strong> ${order.deliveryAddress}</p>
            <p style="margin-bottom: 8px;"><strong>City:</strong> ${order.city || 'N/A'}</p>
            <p style="margin-bottom: 8px;"><strong>Phone:</strong> ${order.phone}</p>
            <p style="margin-bottom: 8px;"><strong>Payment Method:</strong> ${order.paymentMethod === 'cash' ? '💰 Cash on Delivery' : order.paymentMethod || 'Cash on Delivery'}</p>
            ${order.allergies ? `<p style="margin-bottom: 8px;"><strong>Special Instructions:</strong> ${order.allergies}</p>` : ''}
          </div>
          
          <div style="margin-bottom: 25px;">
            <h3 style="color: #FF5722;">🍽️ Order Items</h3>
            <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
              <thead>
                <tr style="background: #FF5722; color: white;">
                  <th style="padding: 12px; text-align: left;">Item</th>
                  <th style="padding: 12px; text-align: center;">Qty</th>
                  <th style="padding: 12px; text-align: right;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${itemsList}
              </tbody>
            </table>
          </div>
          
          <div style="background: ${statusInfo.color}; color: white; padding: 20px; border-radius: 10px; text-align: center;">
            <h3 style="margin: 0; font-size: 24px;">Total Amount: PKR ${order.totalAmount}</h3>
          </div>
          
          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
            <p style="color: #666; margin-bottom: 10px;">Thank you for choosing FoodExpress!</p>
            <p style="color: #999; font-size: 14px;">🍽️ Delicious food delivered with love</p>
          </div>
        </div>
      </div>
    `
  };

  try {
    const result = await transporter.sendMail(mailOptions);
    return result;
  } catch (error) {
    console.error('Error sending status email:', error.message);
    throw error;
  }
};

export const sendOrderConfirmationEmail = async (userEmail, userName, order) => {
  const itemsList = order.items.map(item => 
    `<tr>
      <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.name}<br><small style="color: #666;">${item.restaurantName || 'Unknown Restaurant'}</small></td>
      <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
      <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">
        ${item.discount > 0 ? 
          `<span style="text-decoration: line-through; color: #999;">PKR ${item.price}</span> 
           <span style="color: #4CAF50; font-weight: bold;">PKR ${item.finalPrice.toFixed(2)}</span>` 
          : `PKR ${item.price}`}
      </td>
      <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right; font-weight: bold;">PKR ${(item.finalPrice * item.quantity).toFixed(2)}</td>
    </tr>`
  ).join('');

  const mailOptions = {
    from: `"FoodExpress" <${process.env.EMAIL_USER}>`,
    to: userEmail,
    subject: `Order Confirmation - FoodExpress #${order._id.toString().slice(-6)}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8f9fa; padding: 20px;">
        <div style="background: linear-gradient(135deg, #FF5722 0%, #FF9800 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="margin: 0; font-size: 28px;">🏪 FoodExpress</h1>
          <h2 style="margin: 10px 0 0 0; font-size: 20px;">Order Confirmed!</h2>
        </div>
        
        <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">
          <p style="font-size: 18px; color: #333; margin-bottom: 20px;">Hi ${userName},</p>
          <p style="color: #666; margin-bottom: 25px;">Thank you for your order! We've received your order and it's being processed.</p>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 10px; margin-bottom: 25px;">
            <h3 style="color: #FF5722; margin-top: 0;">📄 Order Details</h3>
            <p><strong>Order ID:</strong> #${order._id.toString().slice(-6)}</p>
            <p><strong>Order Date:</strong> ${new Date(order.orderDate).toLocaleDateString()}</p>
            <p><strong>Status:</strong> <span style="color: #FF9800; font-weight: bold;">PENDING</span></p>
          </div>
          
          <div style="margin-bottom: 25px;">
            <h3 style="color: #FF5722;">🚚 Delivery Information</h3>
            <p style="margin-bottom: 8px;"><strong>Address:</strong> ${order.deliveryAddress}</p>
            <p style="margin-bottom: 8px;"><strong>City:</strong> ${order.city || 'N/A'}</p>
            <p style="margin-bottom: 8px;"><strong>Phone:</strong> ${order.phone}</p>
            <p style="margin-bottom: 8px;"><strong>Payment Method:</strong> ${order.paymentMethod === 'cash' ? '💰 Cash on Delivery' : order.paymentMethod || 'Cash on Delivery'}</p>
            ${order.allergies ? `<p style="margin-bottom: 8px;"><strong>Special Instructions:</strong> ${order.allergies}</p>` : ''}
          </div>
          
          <div style="margin-bottom: 25px;">
            <h3 style="color: #FF5722;">🍽️ Order Items</h3>
            <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
              <thead>
                <tr style="background: #FF5722; color: white;">
                  <th style="padding: 12px; text-align: left;">Item</th>
                  <th style="padding: 12px; text-align: center;">Qty</th>
                  <th style="padding: 12px; text-align: right;">Price</th>
                  <th style="padding: 12px; text-align: right;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${itemsList}
              </tbody>
            </table>
          </div>
          
          <div style="background: #4CAF50; color: white; padding: 20px; border-radius: 10px; text-align: center;">
            <h3 style="margin: 0; font-size: 24px;">Total Amount: PKR ${order.totalAmount}</h3>
          </div>
          
          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
            <p style="color: #666; margin-bottom: 10px;">We'll notify you when your order is ready for delivery!</p>
            <p style="color: #999; font-size: 14px;">Thank you for choosing FoodExpress 🍽️</p>
          </div>
        </div>
      </div>
    `
  };

  try {
    const result = await transporter.sendMail(mailOptions);
    return result;
  } catch (error) {
    console.error('Error sending email:', error.message);
    throw error;
  }
};