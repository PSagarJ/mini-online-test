const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { MAIN_ADMIN_EMAIL } = require('../config/mainAdmin');

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Authentication required. No token provided.' });
    }

    const token = authHeader.split(' ')[1];
    const secret = process.env.JWT_SECRET || 'fallback_secret_for_dev_mode_only_replace';
    
    let decoded;
    try {
      decoded = jwt.verify(token, secret);
    } catch (err) {
      return res.status(401).json({ message: 'Invalid or expired token.' });
    }

    const user = await User.findById(decoded.userId).populate('classId');
    if (!user) {
      return res.status(401).json({ message: 'User not found.' });
    }

    // Server-level rule: Main admin always has the admin role
    const isMainAdmin = user.email.toLowerCase() === MAIN_ADMIN_EMAIL.toLowerCase();
    if (isMainAdmin && user.role !== 'admin') {
      user.role = 'admin';
    }

    req.user = user;
    req.isMainAdmin = isMainAdmin;
    next();
  } catch (error) {
    next(error);
  }
};

const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required.' });
  }

  const isMainAdmin = req.user.email.toLowerCase() === MAIN_ADMIN_EMAIL.toLowerCase();
  if (req.user.role !== 'admin' && !isMainAdmin) {
    return res.status(403).json({ message: 'Forbidden: Admin access required.' });
  }

  next();
};

module.exports = {
  authenticate,
  requireAdmin
};
