const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const SchoolClass = require('../models/SchoolClass');
const { MAIN_ADMIN_EMAIL } = require('../config/mainAdmin');
const { authenticate } = require('../middleware/auth');

const formatUserResponse = (user) => {
  const isMain = user.email.toLowerCase() === MAIN_ADMIN_EMAIL.toLowerCase();
  const role = isMain ? 'admin' : user.role;
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role,
    classId: user.classId?._id || user.classId || null,
    className: user.classId?.name || null,
    isMainAdmin: isMain
  };
};

const createToken = (user) => {
  const secret = process.env.JWT_SECRET || 'fallback_secret_for_dev_mode_only_replace';
  const isMain = user.email.toLowerCase() === MAIN_ADMIN_EMAIL.toLowerCase();
  const role = isMain ? 'admin' : user.role;
  return jwt.sign(
    { userId: user._id, email: user.email, role },
    secret,
    { expiresIn: '7d' }
  );
};

// POST /auth/signup
router.post('/signup', async (req, res, next) => {
  try {
    const { name, email, password, classId } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Name is required.' });
    }

    if (!email || !email.trim()) {
      return res.status(400).json({ message: 'Email is required.' });
    }

    if (!password || password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters long.' });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check email uniqueness
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(409).json({ message: 'An account with this email already exists.' });
    }

    let validClassId = null;
    let populatedClass = null;
    if (classId) {
      populatedClass = await SchoolClass.findById(classId);
      if (!populatedClass) {
        return res.status(400).json({ message: 'Selected class does not exist.' });
      }
      validClassId = populatedClass._id;
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const isMain = normalizedEmail === MAIN_ADMIN_EMAIL.toLowerCase();
    const role = isMain ? 'admin' : 'student';

    const newUser = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
      role,
      classId: validClassId
    });

    if (populatedClass) {
      newUser.classId = populatedClass;
    }

    const token = createToken(newUser);
    res.status(201).json({
      token,
      user: formatUserResponse(newUser)
    });
  } catch (err) {
    next(err);
  }
});

// POST /auth/login
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Invalid email or password.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail }).populate('classId');

    if (!user) {
      // Use the same generic error for a wrong email and a wrong password
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    // Enforce main admin rule
    if (user.email.toLowerCase() === MAIN_ADMIN_EMAIL.toLowerCase() && user.role !== 'admin') {
      user.role = 'admin';
      await user.save();
    }

    const token = createToken(user);
    res.json({
      token,
      user: formatUserResponse(user)
    });
  } catch (err) {
    next(err);
  }
});

// GET /auth/me
router.get('/me', authenticate, async (req, res) => {
  res.json({
    user: formatUserResponse(req.user)
  });
});

// PATCH /auth/me/class
router.patch('/me/class', authenticate, async (req, res, next) => {
  try {
    const { classId } = req.body;
    
    // Sets the class only if the user doesn't have one yet
    if (req.user.classId) {
      return res.status(400).json({ message: 'Class is already set and cannot be changed here.' });
    }

    if (!classId) {
      return res.status(400).json({ message: 'Class ID is required.' });
    }

    const schoolClass = await SchoolClass.findById(classId);
    if (!schoolClass) {
      return res.status(404).json({ message: 'Class not found.' });
    }

    req.user.classId = schoolClass;
    await req.user.save();

    res.json({
      user: formatUserResponse(req.user)
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
