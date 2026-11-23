const express = require('express');
const router = express.Router();
const User = require('../models/User');
const SchoolClass = require('../models/SchoolClass');
const QuestionBank = require('../models/QuestionBank');
const Question = require('../models/Question');
const Attempt = require('../models/Attempt');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { MAIN_ADMIN_EMAIL } = require('../config/mainAdmin');
const { parseAndValidateQuestionsCsv } = require('../utils/csvParser');

// Apply authentication and admin role verification to all admin routes
router.use(authenticate, requireAdmin);

// ==========================================
// 1. Users Management
// ==========================================

// GET /admin/users?search=&role=
router.get('/users', async (req, res, next) => {
  try {
    const { search, role } = req.query;
    const filter = {};

    if (role && ['student', 'admin'].includes(role)) {
      filter.role = role;
    }

    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      filter.$or = [{ name: regex }, { email: regex }];
    }

    const users = await User.find(filter)
      .populate('classId')
      .sort({ createdAt: -1 });

    const formattedUsers = users.map(u => {
      const isMain = u.email.toLowerCase() === MAIN_ADMIN_EMAIL.toLowerCase();
      return {
        id: u._id,
        _id: u._id,
        name: u.name,
        email: u.email,
        role: isMain ? 'admin' : u.role,
        classId: u.classId?._id || null,
        className: u.classId?.name || null,
        isMainAdmin: isMain,
        createdAt: u.createdAt
      };
    });

    res.json({ users: formattedUsers });
  } catch (err) {
    next(err);
  }
});

// PATCH /admin/users/:id { role?, classId? }
router.patch('/users/:id', async (req, res, next) => {
  try {
    const targetUser = await User.findById(req.params.id);
    if (!targetUser) {
      return res.status(404).json({ message: 'User not found.' });
    }

    // Rule: The main admin can't be changed, demoted, or deleted
    if (targetUser.email.toLowerCase() === MAIN_ADMIN_EMAIL.toLowerCase()) {
      return res.status(400).json({ message: 'The main admin cannot be modified.' });
    }

    const { role, classId } = req.body;

    // Rule: Nobody can remove their own admin role
    if (targetUser._id.toString() === req.user._id.toString()) {
      if (role && role !== 'admin') {
        return res.status(400).json({ message: 'You cannot remove your own admin role.' });
      }
    }

    if (role !== undefined) {
      if (!['student', 'admin'].includes(role)) {
        return res.status(400).json({ message: 'Role must be either "student" or "admin".' });
      }
      targetUser.role = role;
    }

    if (classId !== undefined) {
      if (classId === null || classId === '') {
        targetUser.classId = null;
      } else {
        const schoolClass = await SchoolClass.findById(classId);
        if (!schoolClass) {
          return res.status(400).json({ message: 'Specified class does not exist.' });
        }
        targetUser.classId = schoolClass._id;
      }
    }

    await targetUser.save();
    await targetUser.populate('classId');

    res.json({
      user: {
        id: targetUser._id,
        _id: targetUser._id,
        name: targetUser.name,
        email: targetUser.email,
        role: targetUser.role,
        classId: targetUser.classId?._id || null,
        className: targetUser.classId?.name || null,
        isMainAdmin: false
      }
    });
  } catch (err) {
    next(err);
  }
});

// ==========================================
// 2. Classes Management
// ==========================================

// GET /admin/classes
router.get('/classes', async (req, res, next) => {
  try {
    const classes = await SchoolClass.find().sort({ order: 1, name: 1 });
    res.json({ classes });
  } catch (err) {
    next(err);
  }
});

// POST /admin/classes { name }
router.post('/classes', async (req, res, next) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Class name is required.' });
    }

    const trimmedName = name.trim();
    const existing = await SchoolClass.findOne({
      name: { $regex: new RegExp(`^${trimmedName}$`, 'i') }
    });

    if (existing) {
      return res.status(409).json({ message: 'A class with this name already exists.' });
    }

    const highestOrder = await SchoolClass.findOne().sort({ order: -1 });
    const order = highestOrder ? highestOrder.order + 1 : 1;

    const newClass = await SchoolClass.create({
      name: trimmedName,
      order
    });

    res.status(201).json({ class: newClass });
  } catch (err) {
    next(err);
  }
});

// PATCH /admin/classes/:id { name }
router.patch('/classes/:id', async (req, res, next) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Class name cannot be empty.' });
    }

    const trimmedName = name.trim();
    const targetClass = await SchoolClass.findById(req.params.id);
    if (!targetClass) {
      return res.status(404).json({ message: 'Class not found.' });
    }

    // Check unique name constraint
    const duplicate = await SchoolClass.findOne({
      _id: { $ne: targetClass._id },
      name: { $regex: new RegExp(`^${trimmedName}$`, 'i') }
    });

    if (duplicate) {
      return res.status(409).json({ message: 'A class with this name already exists.' });
    }

    targetClass.name = trimmedName;
    await targetClass.save();

    res.json({ class: targetClass });
  } catch (err) {
    next(err);
  }
});

// ==========================================
// 3. Question Banks Management
// ==========================================

// GET /admin/banks?classId=
router.get('/banks', async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.classId) {
      filter.classId = req.query.classId;
    }

    const banks = await QuestionBank.find(filter)
      .populate('classId')
      .sort({ createdAt: -1 });

    const banksWithCounts = await Promise.all(
      banks.map(async (b) => {
        const questionCount = await Question.countDocuments({
          bankId: b._id,
          archived: false
        });

        return {
          id: b._id,
          _id: b._id,
          classId: b.classId?._id || b.classId,
          className: b.classId?.name || '',
          subject: b.subject,
          name: b.name,
          questionCount,
          archived: b.archived,
          createdAt: b.createdAt
        };
      })
    );

    res.json({ banks: banksWithCounts });
  } catch (err) {
    next(err);
  }
});

// POST /admin/banks { classId, subject }
router.post('/banks', async (req, res, next) => {
  try {
    const { classId, subject } = req.body;

    if (!classId || !subject || !subject.trim()) {
      return res.status(400).json({ message: 'classId and subject are required.' });
    }

    const schoolClass = await SchoolClass.findById(classId);
    if (!schoolClass) {
      return res.status(404).json({ message: 'Selected class does not exist.' });
    }

    const trimmedSubject = subject.trim();
    // Unique on classId plus subject
    const existingBank = await QuestionBank.findOne({
      classId: schoolClass._id,
      subject: { $regex: new RegExp(`^${trimmedSubject}$`, 'i') }
    });

    if (existingBank) {
      return res.status(409).json({ message: `A question bank for ${schoolClass.name} · ${trimmedSubject} already exists.` });
    }

    const bankName = `${schoolClass.name} · ${trimmedSubject}`;
    const newBank = await QuestionBank.create({
      classId: schoolClass._id,
      subject: trimmedSubject,
      name: bankName,
      archived: false
    });

    res.status(201).json({
      bank: {
        id: newBank._id,
        _id: newBank._id,
        classId: schoolClass._id,
        className: schoolClass.name,
        subject: newBank.subject,
        name: newBank.name,
        questionCount: 0,
        archived: newBank.archived,
        createdAt: newBank.createdAt
      }
    });
  } catch (err) {
    next(err);
  }
});

// PATCH /admin/banks/:id { subject?, archived? }
router.patch('/banks/:id', async (req, res, next) => {
  try {
    const bank = await QuestionBank.findById(req.params.id).populate('classId');
    if (!bank) {
      return res.status(404).json({ message: 'Question bank not found.' });
    }

    const { subject, archived } = req.body;

    if (subject !== undefined && subject.trim()) {
      const trimmedSubject = subject.trim();
      // Check duplicate
      const duplicate = await QuestionBank.findOne({
        _id: { $ne: bank._id },
        classId: bank.classId._id,
        subject: { $regex: new RegExp(`^${trimmedSubject}$`, 'i') }
      });

      if (duplicate) {
        return res.status(409).json({ message: `A bank for ${bank.classId.name} · ${trimmedSubject} already exists.` });
      }

      bank.subject = trimmedSubject;
      bank.name = `${bank.classId.name} · ${trimmedSubject}`;
    }

    if (archived !== undefined) {
      bank.archived = Boolean(archived);
    }

    await bank.save();

    const questionCount = await Question.countDocuments({ bankId: bank._id, archived: false });

    res.json({
      bank: {
        id: bank._id,
        _id: bank._id,
        classId: bank.classId._id,
        className: bank.classId.name,
        subject: bank.subject,
        name: bank.name,
        questionCount,
        archived: bank.archived
      }
    });
  } catch (err) {
    next(err);
  }
});

// ==========================================
// 4. Questions Management
// ==========================================

// GET /admin/banks/:id/questions?search=&status=active|archived|all
router.get('/banks/:id/questions', async (req, res, next) => {
  try {
    const bank = await QuestionBank.findById(req.params.id);
    if (!bank) {
      return res.status(404).json({ message: 'Question bank not found.' });
    }

    const { search, status } = req.query;
    const filter = { bankId: bank._id };

    if (status === 'active') {
      filter.archived = false;
    } else if (status === 'archived') {
      filter.archived = true;
    }
    // 'all' includes both active and archived

    if (search && search.trim()) {
      filter.text = new RegExp(search.trim(), 'i');
    }

    const questions = await Question.find(filter).sort({ createdAt: -1 });

    res.json({
      bank: {
        id: bank._id,
        _id: bank._id,
        name: bank.name,
        subject: bank.subject,
        archived: bank.archived
      },
      questions: questions.map(q => ({
        id: q._id,
        _id: q._id,
        bankId: q.bankId,
        text: q.text,
        options: q.options,
        correctIndex: q.correctIndex,
        explanation: q.explanation || '',
        archived: q.archived,
        createdAt: q.createdAt
      }))
    });
  } catch (err) {
    next(err);
  }
});

// POST /admin/banks/:id/questions { text, options, correctIndex, explanation? }
router.post('/banks/:id/questions', async (req, res, next) => {
  try {
    const bank = await QuestionBank.findById(req.params.id);
    if (!bank) {
      return res.status(404).json({ message: 'Question bank not found.' });
    }

    const { text, options, correctIndex, explanation } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ message: 'Question text is required.' });
    }

    if (!Array.isArray(options) || options.length !== 4) {
      return res.status(400).json({ message: 'Question must have exactly 4 options.' });
    }

    const trimmedOptions = options.map(opt => String(opt || '').trim());
    if (trimmedOptions.some(opt => opt.length === 0)) {
      return res.status(400).json({ message: 'All four options must be non-empty.' });
    }

    const distinct = new Set(trimmedOptions);
    if (distinct.size !== 4) {
      return res.status(400).json({ message: 'All four options must be distinct.' });
    }

    const numericIndex = Number(correctIndex);
    if (isNaN(numericIndex) || numericIndex < 0 || numericIndex > 3) {
      return res.status(400).json({ message: 'Correct option index must be between 0 and 3.' });
    }

    const newQuestion = await Question.create({
      bankId: bank._id,
      text: text.trim(),
      options: trimmedOptions,
      correctIndex: numericIndex,
      explanation: explanation ? explanation.trim() : '',
      archived: false
    });

    res.status(201).json({
      question: {
        id: newQuestion._id,
        _id: newQuestion._id,
        bankId: newQuestion.bankId,
        text: newQuestion.text,
        options: newQuestion.options,
        correctIndex: newQuestion.correctIndex,
        explanation: newQuestion.explanation,
        archived: newQuestion.archived,
        createdAt: newQuestion.createdAt
      }
    });
  } catch (err) {
    next(err);
  }
});

// PUT /admin/questions/:id -> edits a question
router.put('/questions/:id', async (req, res, next) => {
  try {
    const question = await Question.findById(req.params.id);
    if (!question) {
      return res.status(404).json({ message: 'Question not found.' });
    }

    const { text, options, correctIndex, explanation } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ message: 'Question text cannot be empty.' });
    }

    if (!Array.isArray(options) || options.length !== 4) {
      return res.status(400).json({ message: 'Question must have exactly 4 options.' });
    }

    const trimmedOptions = options.map(opt => String(opt || '').trim());
    if (trimmedOptions.some(opt => opt.length === 0)) {
      return res.status(400).json({ message: 'All four options must be non-empty.' });
    }

    if (new Set(trimmedOptions).size !== 4) {
      return res.status(400).json({ message: 'All four options must be distinct.' });
    }

    const numericIndex = Number(correctIndex);
    if (isNaN(numericIndex) || numericIndex < 0 || numericIndex > 3) {
      return res.status(400).json({ message: 'Correct option index must be 0 to 3.' });
    }

    question.text = text.trim();
    question.options = trimmedOptions;
    question.correctIndex = numericIndex;
    question.explanation = explanation !== undefined ? explanation.trim() : question.explanation;

    await question.save();

    res.json({
      question: {
        id: question._id,
        _id: question._id,
        bankId: question.bankId,
        text: question.text,
        options: question.options,
        correctIndex: question.correctIndex,
        explanation: question.explanation,
        archived: question.archived
      }
    });
  } catch (err) {
    next(err);
  }
});

// PATCH /admin/questions/:id { archived }
router.patch('/questions/:id', async (req, res, next) => {
  try {
    const question = await Question.findById(req.params.id);
    if (!question) {
      return res.status(404).json({ message: 'Question not found.' });
    }

    const { archived } = req.body;
    if (archived !== undefined) {
      question.archived = Boolean(archived);
      await question.save();
    }

    res.json({
      question: {
        id: question._id,
        _id: question._id,
        archived: question.archived
      }
    });
  } catch (err) {
    next(err);
  }
});

// DELETE /admin/questions/:id -> 204. Deleting is allowed because attempts keep their own snapshot copy
router.delete('/questions/:id', async (req, res, next) => {
  try {
    const question = await Question.findById(req.params.id);
    if (!question) {
      return res.status(404).json({ message: 'Question not found.' });
    }

    await Question.findByIdAndDelete(req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// ==========================================
// 5. CSV Import
// ==========================================

// POST /admin/banks/:id/import { csv }
router.post('/banks/:id/import', async (req, res, next) => {
  try {
    const bank = await QuestionBank.findById(req.params.id);
    if (!bank) {
      return res.status(404).json({ message: 'Question bank not found.' });
    }

    const { csv } = req.body;
    if (!csv) {
      return res.status(400).json({
        message: 'No CSV content provided.',
        errors: [{ row: 1, message: 'CSV payload is missing.' }]
      });
    }

    // Validate and parse all rows
    const validationResult = parseAndValidateQuestionsCsv(csv);
    if (!validationResult.success) {
      // If any row is invalid, import nothing and return 400
      return res.status(400).json({
        message: validationResult.message,
        errors: validationResult.errors
      });
    }

    // All rows are valid! Prepare documents with bankId
    const questionDocs = validationResult.questions.map(q => ({
      ...q,
      bankId: bank._id
    }));

    await Question.insertMany(questionDocs);

    res.status(201).json({
      imported: questionDocs.length
    });
  } catch (err) {
    next(err);
  }
});

// ==========================================
// 6. Assessment Results Overview
// ==========================================

// GET /admin/results?classId=&bankId=
router.get('/results', async (req, res, next) => {
  try {
    const { classId, bankId } = req.query;
    const filter = {
      status: { $in: ['submitted', 'timed_out'] }
    };

    if (bankId) {
      filter.bank = bankId;
    }

    let attempts = await Attempt.find(filter)
      .populate('user')
      .populate({
        path: 'bank',
        populate: { path: 'classId' }
      })
      .sort({ submittedAt: -1, startedAt: -1 });

    // If classId filter is provided, filter attempts whose bank.classId or user.classId matches
    if (classId) {
      attempts = attempts.filter(att => {
        const bankClassId = att.bank?.classId?._id?.toString() || att.bank?.classId?.toString();
        const userClassId = att.user?.classId?._id?.toString() || att.user?.classId?.toString();
        return bankClassId === classId || userClassId === classId;
      });
    }

    const rows = attempts.map(att => {
      const total = att.total || (att.questions ? att.questions.length : 10);
      const percentage = total > 0 ? Math.round((att.score / total) * 100) : 0;
      const className = att.bank?.classId?.name || '—';

      return {
        id: att._id,
        _id: att._id,
        studentName: att.user?.name || 'Deleted User',
        email: att.user?.email || '—',
        class: className,
        bank: att.bank?.name || '—',
        score: att.score,
        total,
        percentage,
        submittedAt: att.submittedAt || att.startedAt,
        endReason: att.endReason,
        violationCount: att.violationCount || 0
      };
    });

    res.json({ rows });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
