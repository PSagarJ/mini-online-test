const express = require('express');
const router = express.Router();
const Attempt = require('../models/Attempt');
const QuestionBank = require('../models/QuestionBank');
const Question = require('../models/Question');
const { authenticate } = require('../middleware/auth');
const { checkAndExpireAttempt, expireUserActiveAttempts } = require('../utils/expiry');
const { evaluateAttempt } = require('../utils/scoring');
const { formatInProgressPayload, formatResultPayload } = require('../utils/formatters');

// Expiry middleware: before any attempt route, check and finalize expired attempts for the user
router.use(authenticate, async (req, res, next) => {
  try {
    await expireUserActiveAttempts(req.user._id);
    next();
  } catch (err) {
    next(err);
  }
});

// GET /attempts/active - returns active attempt or null
router.get('/active', async (req, res, next) => {
  try {
    const attempt = await Attempt.findOne({
      user: req.user._id,
      status: 'in_progress'
    }).populate('bank');

    if (!attempt) {
      return res.json({ attempt: null });
    }

    // Check expiry again in case it just crossed deadline + 15s
    const checked = await checkAndExpireAttempt(attempt);
    if (checked.status !== 'in_progress') {
      return res.json({ attempt: null });
    }

    res.json({
      attempt: formatInProgressPayload(checked, checked.bank?.name)
    });
  } catch (err) {
    next(err);
  }
});

// POST /attempts - start a new test or return existing in-progress
router.post('/', async (req, res, next) => {
  try {
    const { bankId } = req.body;

    if (!bankId) {
      return res.status(400).json({ message: 'bankId is required.' });
    }

    // Check if user has an existing in-progress attempt
    const existing = await Attempt.findOne({
      user: req.user._id,
      status: 'in_progress'
    }).populate('bank');

    if (existing) {
      const checked = await checkAndExpireAttempt(existing);
      if (checked.status === 'in_progress') {
        return res.status(200).json({
          attempt: formatInProgressPayload(checked, checked.bank?.name)
        });
      }
    }

    const bank = await QuestionBank.findById(bankId);
    if (!bank) {
      return res.status(404).json({ message: 'Question bank not found.' });
    }

    const userClassId = (req.user.classId?._id || req.user.classId)?.toString();
    const bankClassId = bank.classId.toString();

    // Check if bank is archived or not in user's class
    if (bank.archived || userClassId !== bankClassId) {
      return res.status(409).json({ message: 'This question bank is not available for your class.' });
    }

    // Fetch active questions
    const activeQuestions = await Question.find({
      bankId: bank._id,
      archived: false
    });

    if (activeQuestions.length < 10) {
      return res.status(409).json({
        message: 'Question bank does not have enough active questions to start a test (minimum 10 required).'
      });
    }

    // Pick 10 random active questions
    const shuffled = [...activeQuestions].sort(() => Math.random() - 0.5);
    const selectedQuestions = shuffled.slice(0, 10);

    const snapshot = selectedQuestions.map(q => ({
      questionId: q._id,
      text: q.text,
      options: q.options,
      correctIndex: q.correctIndex,
      explanation: q.explanation || ''
    }));

    const durationSeconds = parseInt(process.env.TEST_DURATION_SECONDS, 10) || 600;
    const startedAt = new Date();
    const deadline = new Date(startedAt.getTime() + durationSeconds * 1000);

    const newAttempt = await Attempt.create({
      user: req.user._id,
      bank: bank._id,
      questions: snapshot,
      answers: [],
      startedAt,
      deadline,
      durationSeconds: 0,
      score: 0,
      total: 10,
      status: 'in_progress',
      endReason: null,
      violationCount: 0,
      violations: []
    });

    res.status(201).json({
      attempt: formatInProgressPayload(newAttempt, bank.name)
    });
  } catch (err) {
    next(err);
  }
});

// GET /attempts - list user's attempts, newest first
router.get('/', async (req, res, next) => {
  try {
    const attempts = await Attempt.find({ user: req.user._id })
      .populate('bank')
      .sort({ startedAt: -1 });

    const summaryList = attempts.map(a => {
      const total = a.total || (a.questions ? a.questions.length : 10);
      const percentage = total > 0 ? Math.round((a.score / total) * 100) : 0;
      return {
        id: a._id,
        _id: a._id,
        bankName: a.bank?.name || 'Assessment',
        score: a.score,
        total,
        percentage,
        startedAt: a.startedAt,
        submittedAt: a.submittedAt,
        durationSeconds: a.durationSeconds,
        status: a.status,
        endReason: a.endReason,
        violationCount: a.violationCount || 0
      };
    });

    res.json({ attempts: summaryList });
  } catch (err) {
    next(err);
  }
});

// GET /attempts/:id - view specific attempt result or in-progress state
router.get('/:id', async (req, res, next) => {
  try {
    const attempt = await Attempt.findById(req.params.id).populate('bank');

    if (!attempt) {
      return res.status(404).json({ message: 'Attempt not found.' });
    }

    // Owner check: Return 403 for anyone else
    if (attempt.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Forbidden: You do not have access to this attempt.' });
    }

    const checked = await checkAndExpireAttempt(attempt);

    if (checked.status === 'in_progress') {
      return res.json({
        attempt: formatInProgressPayload(checked, checked.bank?.name)
      });
    }

    res.json({
      attempt: formatResultPayload(checked, checked.bank?.name)
    });
  } catch (err) {
    next(err);
  }
});

// PUT /attempts/:id/answers - debounced autosave of selections
router.put('/:id/answers', async (req, res, next) => {
  try {
    const attempt = await Attempt.findById(req.params.id);

    if (!attempt) {
      return res.status(404).json({ message: 'Attempt not found.' });
    }

    if (attempt.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Forbidden.' });
    }

    const checked = await checkAndExpireAttempt(attempt);
    if (checked.status !== 'in_progress') {
      return res.status(400).json({ message: 'Attempt is already finalized.' });
    }

    const { answers } = req.body;
    if (Array.isArray(answers)) {
      checked.answers = answers.map(a => ({
        questionId: a.questionId,
        selectedIndex: a.selectedIndex !== null && a.selectedIndex !== undefined ? Number(a.selectedIndex) : null
      }));
      await checked.save();
    }

    res.json({ success: true, answers: checked.answers });
  } catch (err) {
    next(err);
  }
});

// POST /attempts/:id/submit - submit and finalize attempt
router.post('/:id/submit', async (req, res, next) => {
  try {
    const attempt = await Attempt.findById(req.params.id).populate('bank');

    if (!attempt) {
      return res.status(404).json({ message: 'Attempt not found.' });
    }

    if (attempt.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Forbidden.' });
    }

    if (attempt.status !== 'in_progress') {
      return res.json({
        attempt: formatResultPayload(attempt, attempt.bank?.name)
      });
    }

    // Save final answers if provided
    const { answers } = req.body;
    if (Array.isArray(answers)) {
      attempt.answers = answers.map(a => ({
        questionId: a.questionId,
        selectedIndex: a.selectedIndex !== null && a.selectedIndex !== undefined ? Number(a.selectedIndex) : null
      }));
    }

    const now = new Date();
    const deadlineTime = new Date(attempt.deadline).getTime();
    const nowTime = now.getTime();
    const gracePeriodMs = 15 * 1000;

    let status = 'submitted';
    let endReason = 'manual';

    if (nowTime < deadlineTime) {
      status = 'submitted';
      endReason = 'manual';
    } else if (nowTime <= deadlineTime + gracePeriodMs) {
      status = 'submitted';
      endReason = 'time_up';
    } else {
      status = 'timed_out';
      endReason = 'deadline_passed';
    }

    const { score, total } = evaluateAttempt(attempt);
    attempt.status = status;
    attempt.endReason = endReason;
    attempt.score = score;
    attempt.total = total;
    attempt.submittedAt = now;
    attempt.durationSeconds = Math.max(0, Math.round((nowTime - new Date(attempt.startedAt).getTime()) / 1000));

    await attempt.save();

    res.json({
      attempt: formatResultPayload(attempt, attempt.bank?.name)
    });
  } catch (err) {
    next(err);
  }
});

// POST /attempts/:id/violations - record violation and auto-submit on 6th
router.post('/:id/violations', async (req, res, next) => {
  try {
    const attempt = await Attempt.findById(req.params.id).populate('bank');

    if (!attempt) {
      return res.status(404).json({ message: 'Attempt not found.' });
    }

    if (attempt.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Forbidden.' });
    }

    // Admins are exempt from tab-switch rules
    if (req.user.role === 'admin' || req.isMainAdmin) {
      return res.json({
        violationCount: 0,
        limit: 6,
        finalized: false
      });
    }

    if (attempt.status !== 'in_progress') {
      return res.json({
        violationCount: attempt.violationCount,
        limit: 6,
        finalized: true,
        attempt: formatResultPayload(attempt, attempt.bank?.name)
      });
    }

    const { type } = req.body;
    const validTypes = ['tab_switch', 'window_switch', 'reload_or_close', 'navigation'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ message: 'Invalid violation type.' });
    }

    const now = Date.now();

    // Deduplication rule: Server ignores a second violation for the same attempt within 1 second
    if (attempt.violations && attempt.violations.length > 0) {
      const lastViolation = attempt.violations[attempt.violations.length - 1];
      const lastTime = new Date(lastViolation.at).getTime();
      if (now - lastTime < 1000) {
        return res.json({
          violationCount: attempt.violationCount,
          limit: 6,
          finalized: false
        });
      }
    }

    attempt.violationCount = (attempt.violationCount || 0) + 1;
    attempt.violations.push({
      type,
      at: new Date(now)
    });

    // 6th violation submits the test automatically
    if (attempt.violationCount >= 6) {
      const { score, total } = evaluateAttempt(attempt);
      const submittedDate = new Date(now);
      attempt.status = 'submitted';
      attempt.endReason = type;
      attempt.score = score;
      attempt.total = total;
      attempt.submittedAt = submittedDate;
      attempt.durationSeconds = Math.max(0, Math.round((submittedDate.getTime() - new Date(attempt.startedAt).getTime()) / 1000));
      await attempt.save();

      return res.json({
        violationCount: 6,
        limit: 6,
        finalized: true,
        attempt: formatResultPayload(attempt, attempt.bank?.name)
      });
    }

    await attempt.save();

    res.json({
      violationCount: attempt.violationCount,
      limit: 6,
      finalized: false
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
