const express = require('express');
const router = express.Router();
const QuestionBank = require('../models/QuestionBank');
const Question = require('../models/Question');
const Attempt = require('../models/Attempt');
const { authenticate } = require('../middleware/auth');

// GET /banks - list available banks for the authenticated student's class
router.get('/', authenticate, async (req, res, next) => {
  try {
    const userClassId = req.user.classId?._id || req.user.classId;

    if (!userClassId) {
      return res.json({ banks: [] });
    }

    const banks = await QuestionBank.find({
      classId: userClassId,
      archived: false
    }).sort({ subject: 1 });

    const banksWithStats = await Promise.all(
      banks.map(async (bank) => {
        const questionCount = await Question.countDocuments({
          bankId: bank._id,
          archived: false
        });

        const bestAttempt = await Attempt.findOne({
          user: req.user._id,
          bank: bank._id,
          status: { $in: ['submitted', 'timed_out'] }
        }).sort({ score: -1, percentage: -1 });

        return {
          id: bank._id,
          _id: bank._id,
          name: bank.name,
          subject: bank.subject,
          questionCount,
          bestScore: bestAttempt ? bestAttempt.score : null,
          bestPercentage: bestAttempt && bestAttempt.total > 0
            ? Math.round((bestAttempt.score / bestAttempt.total) * 100)
            : null
        };
      })
    );

    res.json({ banks: banksWithStats });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
