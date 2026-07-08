const User = require('../models/User');
const { generateToken } = require('../utils/generateToken');
const crypto = require('crypto');
const { sendVerificationEmail } = require('../utils/emailService');

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Check if user exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({
        success: false,
        message: 'User already exists'
      });
    }

    // Generate email verification token
    const emailVerificationToken = crypto.randomBytes(32).toString('hex');
    const emailVerificationExpire = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Create user - auto-verify in development mode
   const isProduction = false;
    const user = await User.create({
  name,
  email,
  password,
  isVerified: true,
  emailVerificationToken: undefined,
  emailVerificationExpire: undefined
});
    // Send verification email only in production
    if (isProduction) {
      const verificationLink = `${process.env.FRONTEND_URL || 'https://honyedbakery.vercel.app'}/verify-email.html?token=${emailVerificationToken}`;
      await sendVerificationEmail(email, name, verificationLink);
    }

    res.status(201).json({
      success: true,
      message: isProduction ? 'Please check your email to verify your account' : 'Account created successfully! You can now login.',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check for user
    const user = await User.findOne({ email }).select('+password');
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if email is verified
    if (!user.isVerified) {
      return res.status(401).json({
        success: false,
        message: 'Please verify your email first. Check your inbox for the verification link.'
      });
    }

    // Check password
    const isMatch = await user.matchPassword(password);
    
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    const token = generateToken(user._id, user.role);  // ← Pass role!

    res.status(200).json({
      success: true,
      token,  // ← Token at root level
      user: {  // ← "user" not "data"
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,  // ← Make sure role is included
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Verify email
// @route   POST /api/auth/verify-email
// @access  Public
exports.verifyEmail = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Verification token is required'
      });
    }

    // Hash the token
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // Find user with matching token and check if not expired
    const user = await User.findOne({
      emailVerificationToken: hashedToken,
      emailVerificationExpire: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification token'
      });
    }

    // Mark email as verified
    user.isVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpire = undefined;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Email verified successfully! You can now login.'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    res.status(200).json({
      success: true,
      user: {  // ← Change from 'data' to 'user'
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,  // ← Make sure role is included
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};