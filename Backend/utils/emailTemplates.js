/**
 * Email HTML templates for order-related notifications
 */

const brandColor = '#6366f1';
const bgColor = '#f8fafc';

const wrapper = (content) => `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:${bgColor};font-family:Arial,Helvetica,sans-serif;">
<div style="max-width:600px;margin:40px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
  <div style="background:linear-gradient(135deg,${brandColor},#8b5cf6);padding:32px;text-align:center;">
    <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;">Tortrose</h1>
  </div>
  <div style="padding:32px 28px;">
    ${content}
  </div>
  <div style="background:#f1f5f9;padding:20px 28px;text-align:center;">
    <p style="margin:0;color:#94a3b8;font-size:12px;">&copy; ${new Date().getFullYear()} Tortrose. All rights reserved.</p>
  </div>
</div>
</body>
</html>`;

exports.orderConfirmationEmail = (order) => {
  const items = order.orderItems.map(item => 
    `<tr>
      <td style="padding:8px 0;border-bottom:1px solid #f1f5f9;">
        <strong style="color:#1e293b;">${item.name}</strong><br/>
        <span style="color:#94a3b8;font-size:13px;">Qty: ${item.quantity} × $${item.price.toFixed(2)}</span>
      </td>
      <td style="padding:8px 0;border-bottom:1px solid #f1f5f9;text-align:right;color:#1e293b;font-weight:600;">$${(item.price * item.quantity).toFixed(2)}</td>
    </tr>`
  ).join('');

  return {
    subject: `Order Confirmed - ${order.orderId}`,
    html: wrapper(`
      <h2 style="color:#1e293b;margin:0 0 8px;">Order Confirmed! 🎉</h2>
      <p style="color:#64748b;margin:0 0 24px;">Thank you for your order. Here are your order details:</p>
      
      <div style="background:#f8fafc;border-radius:12px;padding:16px;margin-bottom:24px;">
        <p style="margin:0 0 4px;color:#94a3b8;font-size:13px;">Order ID</p>
        <p style="margin:0;color:${brandColor};font-weight:700;font-size:18px;">${order.orderId}</p>
      </div>

      <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
        <thead><tr><th style="text-align:left;padding:8px 0;border-bottom:2px solid #e2e8f0;color:#64748b;font-size:13px;">Item</th><th style="text-align:right;padding:8px 0;border-bottom:2px solid #e2e8f0;color:#64748b;font-size:13px;">Total</th></tr></thead>
        <tbody>${items}</tbody>
      </table>

      <div style="background:#f8fafc;border-radius:12px;padding:16px;">
        <table style="width:100%;">
          <tr><td style="padding:4px 0;color:#64748b;">Subtotal</td><td style="text-align:right;color:#1e293b;">$${order.orderSummary.subtotal.toFixed(2)}</td></tr>
          <tr><td style="padding:4px 0;color:#64748b;">Shipping</td><td style="text-align:right;color:#1e293b;">$${order.orderSummary.shippingCost.toFixed(2)}</td></tr>
          ${order.orderSummary.tax > 0 ? `<tr><td style="padding:4px 0;color:#64748b;">Tax</td><td style="text-align:right;color:#1e293b;">$${order.orderSummary.tax.toFixed(2)}</td></tr>` : ''}
          ${order.orderSummary.couponDiscount > 0 ? `<tr><td style="padding:4px 0;color:#22c55e;">Discount</td><td style="text-align:right;color:#22c55e;">-$${order.orderSummary.couponDiscount.toFixed(2)}</td></tr>` : ''}
          <tr><td style="padding:8px 0 0;font-weight:700;color:#1e293b;border-top:2px solid #e2e8f0;">Total</td><td style="text-align:right;padding:8px 0 0;font-weight:700;color:${brandColor};font-size:18px;border-top:2px solid #e2e8f0;">$${order.orderSummary.totalAmount.toFixed(2)}</td></tr>
        </table>
      </div>

      <div style="margin-top:24px;">
        <h3 style="color:#1e293b;margin:0 0 8px;font-size:15px;">Shipping To</h3>
        <p style="color:#64748b;margin:0;line-height:1.6;">
          ${order.shippingInfo.fullName}<br/>
          ${order.shippingInfo.address}<br/>
          ${order.shippingInfo.city}, ${order.shippingInfo.state} ${order.shippingInfo.postalCode}<br/>
          ${order.shippingInfo.country}
        </p>
      </div>

      <p style="color:#64748b;margin:24px 0 0;font-size:13px;">Payment Method: <strong>${order.paymentMethod === 'cash_on_delivery' ? 'Cash on Delivery' : 'Stripe (Online)'}</strong></p>
    `)
  };
};

exports.orderStatusUpdateEmail = (order, newStatus) => {
  const statusLabels = {
    confirmed: { label: 'Confirmed', emoji: '✅', color: '#22c55e', msg: 'Your order has been confirmed and is being prepared.' },
    processing: { label: 'Processing', emoji: '⚙️', color: '#f59e0b', msg: 'Your order is now being processed.' },
    shipped: { label: 'Shipped', emoji: '🚚', color: '#3b82f6', msg: 'Your order has been shipped and is on its way!' },
    delivered: { label: 'Delivered', emoji: '📦', color: '#22c55e', msg: 'Your order has been delivered successfully!' },
    cancelled: { label: 'Cancelled', emoji: '❌', color: '#ef4444', msg: 'Your order has been cancelled.' },
  };

  const info = statusLabels[newStatus] || { label: newStatus, emoji: '📋', color: brandColor, msg: `Your order status has been updated to ${newStatus}.` };

  return {
    subject: `Order ${info.label} - ${order.orderId}`,
    html: wrapper(`
      <div style="text-align:center;margin-bottom:24px;">
        <span style="font-size:48px;">${info.emoji}</span>
        <h2 style="color:#1e293b;margin:12px 0 8px;">Order ${info.label}</h2>
        <p style="color:#64748b;margin:0;">${info.msg}</p>
      </div>

      <div style="background:#f8fafc;border-radius:12px;padding:16px;text-align:center;">
        <p style="margin:0 0 4px;color:#94a3b8;font-size:13px;">Order ID</p>
        <p style="margin:0;color:${brandColor};font-weight:700;font-size:18px;">${order.orderId}</p>
        <div style="margin-top:12px;display:inline-block;background:${info.color};color:#fff;padding:6px 16px;border-radius:20px;font-size:13px;font-weight:600;">${info.label}</div>
      </div>

      <p style="color:#64748b;margin:24px 0 0;font-size:13px;text-align:center;">If you have any questions, please contact our support team.</p>
    `)
  };
};

exports.newOrderSellerEmail = (order, sellerName) => {
  const items = order.orderItems.map(item =>
    `<tr><td style="padding:8px 0;border-bottom:1px solid #f1f5f9;color:#1e293b;">${item.name} × ${item.quantity}</td><td style="text-align:right;padding:8px 0;border-bottom:1px solid #f1f5f9;color:#1e293b;font-weight:600;">$${(item.price * item.quantity).toFixed(2)}</td></tr>`
  ).join('');

  return {
    subject: `New Order Received - ${order.orderId}`,
    html: wrapper(`
      <div style="text-align:center;margin-bottom:24px;">
        <span style="font-size:48px;">🛒</span>
        <h2 style="color:#1e293b;margin:12px 0 8px;">New Order Received!</h2>
        <p style="color:#64748b;margin:0;">Hey ${sellerName}, you have a new order.</p>
      </div>
      <div style="background:#f8fafc;border-radius:12px;padding:16px;margin-bottom:20px;">
        <p style="margin:0 0 4px;color:#94a3b8;font-size:13px;">Order ID</p>
        <p style="margin:0;color:${brandColor};font-weight:700;font-size:18px;">${order.orderId}</p>
      </div>
      <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
        <thead><tr><th style="text-align:left;padding:8px 0;border-bottom:2px solid #e2e8f0;color:#64748b;font-size:13px;">Item</th><th style="text-align:right;padding:8px 0;border-bottom:2px solid #e2e8f0;color:#64748b;font-size:13px;">Total</th></tr></thead>
        <tbody>${items}</tbody>
      </table>
      <div style="background:#f8fafc;border-radius:12px;padding:16px;">
        <p style="margin:0;color:#1e293b;font-weight:700;font-size:16px;">Total: $${order.orderSummary.totalAmount.toFixed(2)}</p>
      </div>
      <div style="margin-top:20px;">
        <h3 style="color:#1e293b;margin:0 0 8px;font-size:15px;">Ship To</h3>
        <p style="color:#64748b;margin:0;line-height:1.6;">${order.shippingInfo.fullName}<br/>${order.shippingInfo.address}<br/>${order.shippingInfo.city}, ${order.shippingInfo.state} ${order.shippingInfo.postalCode}</p>
      </div>
      <p style="color:#64748b;margin:20px 0 0;font-size:13px;text-align:center;">Log in to your seller dashboard to manage this order.</p>
    `)
  };
};

exports.sellerAccountCreatedEmail = (userName) => {
  return {
    subject: 'Your Seller Account is Ready! 🎉',
    html: wrapper(`
      <div style="text-align:center;margin-bottom:24px;">
        <span style="font-size:48px;">🏪</span>
        <h2 style="color:#1e293b;margin:12px 0 8px;">Welcome, Seller ${userName}!</h2>
        <p style="color:#64748b;margin:0 0 24px;">Your seller account has been successfully created on Tortrose.</p>
      </div>
      <div style="background:#f8fafc;border-radius:12px;padding:20px;margin-bottom:24px;">
        <h3 style="color:#1e293b;margin:0 0 12px;font-size:15px;">What's Next?</h3>
        <ul style="color:#64748b;margin:0;padding-left:20px;line-height:2;">
          <li>Set up your store from the Seller Dashboard</li>
          <li>Add your first products</li>
          <li>Configure shipping methods</li>
          <li>Start receiving orders!</li>
        </ul>
      </div>
      <div style="text-align:center;">
        <a href="${process.env.FRONTEND_URL || 'https://tortrose.com'}/seller-dashboard" style="display:inline-block;background:linear-gradient(135deg,${brandColor},#8b5cf6);color:#fff;padding:12px 32px;border-radius:10px;text-decoration:none;font-weight:600;">Go to Seller Dashboard</a>
      </div>
    `)
  };
};

exports.welcomeEmail = (userName) => {
  return {
    subject: 'Welcome to Tortrose! 🎉',
    html: wrapper(`
      <h2 style="color:#1e293b;margin:0 0 8px;">Welcome, ${userName}! 👋</h2>
      <p style="color:#64748b;margin:0 0 24px;">Thanks for joining Tortrose. We're excited to have you on board!</p>
      <p style="color:#64748b;margin:0 0 24px;">Browse our amazing products from verified sellers and enjoy a seamless shopping experience.</p>
      <div style="text-align:center;">
        <a href="${process.env.FRONTEND_URL || 'https://tortrose.com'}" style="display:inline-block;background:linear-gradient(135deg,${brandColor},#8b5cf6);color:#fff;padding:12px 32px;border-radius:10px;text-decoration:none;font-weight:600;">Start Shopping</a>
      </div>
    `)
  };
};
  return {
    subject: 'Welcome to Tortrose! 🎉',
    html: wrapper(`
      <h2 style="color:#1e293b;margin:0 0 8px;">Welcome, ${userName}! 👋</h2>
      <p style="color:#64748b;margin:0 0 24px;">Thanks for joining Tortrose. We're excited to have you on board!</p>
      <p style="color:#64748b;margin:0 0 24px;">Browse our amazing products from verified sellers and enjoy a seamless shopping experience.</p>
      <div style="text-align:center;">
        <a href="${process.env.FRONTEND_URL || 'https://tortrose.com'}" style="display:inline-block;background:linear-gradient(135deg,${brandColor},#8b5cf6);color:#fff;padding:12px 32px;border-radius:10px;text-decoration:none;font-weight:600;">Start Shopping</a>
      </div>
    `)
  };
};
