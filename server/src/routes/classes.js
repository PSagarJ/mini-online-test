const express = require('express');
const router = express.Router();
const SchoolClass = require('../models/SchoolClass');

// GET /classes - public list of classes for signup dropdown and filters
router.get('/', async (req, res, next) => {
  try {
    const classes = await SchoolClass.find().sort({ order: 1, name: 1 });
    res.json({ classes });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
