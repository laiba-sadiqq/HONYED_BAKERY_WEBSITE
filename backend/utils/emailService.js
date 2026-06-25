const nodemailer = require('nodemailer');
const DEBUG = process.env.NODE_ENV !== 'production';

// Create transporter. If email env vars are missing, use a no-op transporter that logs emails.
let transporter;
if (process.env.EMAIL_USER && process.env.EMAIL_PASSWORD) {
  transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    }
  });
} else {
  console.warn('⚠️ Email credentials not set. Order confirmation emails will be logged, not sent.');
  transporter = {
    sendMail: async (mailOptions) => {
      if (DEBUG) {
        console.log('📧 [MOCK EMAIL] To:', mailOptions.to);
        console.log('📧 [MOCK EMAIL] Subject:', mailOptions.subject);
      }
      return Promise.resolve({ mocked: true });
    }
  };
}

// Send order confirmation email
exports.sendOrderConfirmation = async (email, order) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: `Order Confirmation - ${order.orderNumber}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #d4a574;">Thank you for your order!</h2>
        <p>Your order has been received and is being processed.</p>
        
        <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>Order Details</h3>
          <p><strong>Order Number:</strong> ${order.orderNumber}</p>
          <p><strong>Order Date:</strong> ${new Date(order.createdAt).toLocaleDateString()}</p>
          <p><strong>Total Amount:</strong> Rs. ${order.total.toFixed(2)}</p>
          <p><strong>Payment Method:</strong> ${order.paymentMethod}</p>
        </div>

        <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>Shipping Address</h3>
          <p>${order.shippingAddress.name}</p>
          <p>${order.shippingAddress.street}</p>
          <p>${order.shippingAddress.city}, ${order.shippingAddress.state} ${order.shippingAddress.zipCode}</p>
          <p>${order.shippingAddress.phone}</p>
        </div>

        <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>Order Items</h3>
          ${order.items.map(item => `
            <div style="padding: 10px 0; border-bottom: 1px solid #ddd;">
              <p><strong>${item.name}</strong></p>
              <p>Quantity: ${item.quantity} × Rs. ${item.price.toFixed(2)}</p>
            </div>
          `).join('')}
        </div>

        <p style="color: #666; font-size: 14px; margin-top: 30px;">
          We'll send you another email when your order ships.
        </p>

        <div style="margin-top: 30px; padding-top: 20px; border-top: 2px solid #d4a574;">
          <p style="color: #666; font-size: 12px;">
            This is an automated email. Please do not reply to this message.
          </p>
          <p style="color: #d4a574; font-weight: bold;">Honeyed Bakery</p>
        </div>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    if (DEBUG) console.log('Order confirmation email sent');
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
};

// Send email verification email
exports.sendVerificationEmail = async (email, name, verificationLink) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Verify Your Honeyed Bakery Account',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #d4a574;">Welcome to Honeyed Bakery!</h2>
        <p>Hi ${name},</p>
        
        <p>Thank you for registering. To complete your signup, please verify your email address by clicking the button below.</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationLink}" style="background-color: #d4a574; color: white; padding: 12px 30px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: bold;">
            Verify Email
          </a>
        </div>

        <p style="color: #666; font-size: 14px;">
          Or copy and paste this link in your browser:<br/>
          <span style="word-break: break-all;">${verificationLink}</span>
        </p>

        <p style="color: #666; font-size: 14px; margin-top: 30px;">
          This verification link will expire in 24 hours.
        </p>

        <p style="color: #666; font-size: 14px;">
          If you didn't create this account, you can safely ignore this email.
        </p>

        <div style="margin-top: 30px; padding-top: 20px; border-top: 2px solid #d4a574;">
          <p style="color: #666; font-size: 12px;">
            This is an automated email. Please do not reply to this message.
          </p>
          <p style="color: #d4a574; font-weight: bold;">Honeyed Bakery</p>
        </div>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    if (DEBUG) console.log('Verification email sent to:', email);
  } catch (error) {
    console.error('Error sending verification email:', error);
    // Don't throw - allow signup to proceed even if email fails
  }
};