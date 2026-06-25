// utils/generateToken.js
const jwt = require('jsonwebtoken');

const generateToken = (id, role) => {
  return jwt.sign(
    { 
      id, 
      role  // ← CRITICAL: Add role to JWT payload!
    }, 
    process.env.JWT_SECRET, 
    {
      expiresIn: '30d'
    }
  );
};

module.exports = { generateToken };