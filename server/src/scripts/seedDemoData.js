require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const SchoolClass = require('../models/SchoolClass');
const QuestionBank = require('../models/QuestionBank');
const Question = require('../models/Question');
const User = require('../models/User');
const Attempt = require('../models/Attempt');
const { evaluateAttempt } = require('../utils/scoring');

async function seedDemoData() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      console.error('MONGODB_URI is required.');
      process.exit(1);
    }

    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB Atlas for demo data seeding.');

    const class8 = await SchoolClass.findOne({ name: 'Class 8' });
    const class10 = await SchoolClass.findOne({ name: 'Class 10' });

    if (!class8 || !class10) {
      console.error('Classes not found. Run main seed first.');
      process.exit(1);
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('password123', salt);

    // 1. Create/Verify Demo Student in Class 8
    let student1 = await User.findOne({ email: 'student@university.edu' });
    if (!student1) {
      student1 = await User.create({
        name: 'Jane Student',
        email: 'student@university.edu',
        passwordHash,
        role: 'student',
        classId: class8._id
      });
      console.log('Created demo student: student@university.edu (Class 8)');
    } else {
      console.log('Demo student student@university.edu already exists.');
    }

    // 2. Create/Verify Demo Student in Class 10
    let student2 = await User.findOne({ email: 'alex.smith@university.edu' });
    if (!student2) {
      student2 = await User.create({
        name: 'Alex Smith',
        email: 'alex.smith@university.edu',
        passwordHash,
        role: 'student',
        classId: class10._id
      });
      console.log('Created demo student: alex.smith@university.edu (Class 10)');
    } else {
      console.log('Demo student alex.smith@university.edu already exists.');
    }

    // 3. Create Sample Completed Attempts for Rich Analytics & History
    const mathBank = await QuestionBank.findOne({ classId: class8._id, subject: 'Mathematics' });
    const scienceBank = await QuestionBank.findOne({ classId: class8._id, subject: 'Science' });
    const englishBank = await QuestionBank.findOne({ classId: class10._id, subject: 'English' });

    // Attempt 1: High Score (9/10) - Manual submission
    if (mathBank) {
      const existingAttempt = await Attempt.findOne({ user: student1._id, bank: mathBank._id });
      if (!existingAttempt) {
        const questions = await Question.find({ bankId: mathBank._id, archived: false }).limit(10);
        if (questions.length === 10) {
          const snapshot = questions.map(q => ({
            questionId: q._id,
            text: q.text,
            options: q.options,
            correctIndex: q.correctIndex,
            explanation: q.explanation || ''
          }));

          // 9 correct, 1 wrong
          const answers = snapshot.map((q, idx) => ({
            questionId: q.questionId,
            selectedIndex: idx === 9 ? (q.correctIndex + 1) % 4 : q.correctIndex
          }));

          const startedAt = new Date(Date.now() - 2 * 3600 * 1000); // 2 hours ago
          const submittedAt = new Date(startedAt.getTime() + 480 * 1000); // 8 minutes later

          const { score, total } = evaluateAttempt({ questions: snapshot, answers });

          await Attempt.create({
            user: student1._id,
            bank: mathBank._id,
            questions: snapshot,
            answers,
            startedAt,
            deadline: new Date(startedAt.getTime() + 600 * 1000),
            submittedAt,
            durationSeconds: 480,
            score,
            total,
            status: 'submitted',
            endReason: 'manual',
            violationCount: 0,
            violations: []
          });
          console.log('Created sample attempt 1: 9/10 on Class 8 Mathematics (Manual)');
        }
      }
    }

    // Attempt 2: Medium Score (7/10) - Time up
    if (scienceBank) {
      const existingAttempt = await Attempt.findOne({ user: student1._id, bank: scienceBank._id });
      if (!existingAttempt) {
        const questions = await Question.find({ bankId: scienceBank._id, archived: false }).limit(10);
        if (questions.length === 10) {
          const snapshot = questions.map(q => ({
            questionId: q._id,
            text: q.text,
            options: q.options,
            correctIndex: q.correctIndex,
            explanation: q.explanation || ''
          }));

          // 7 correct, 3 wrong
          const answers = snapshot.map((q, idx) => ({
            questionId: q.questionId,
            selectedIndex: idx >= 7 ? (q.correctIndex + 1) % 4 : q.correctIndex
          }));

          const startedAt = new Date(Date.now() - 24 * 3600 * 1000); // Yesterday
          const submittedAt = new Date(startedAt.getTime() + 602 * 1000); // 10 minutes 2s (time up)

          const { score, total } = evaluateAttempt({ questions: snapshot, answers });

          await Attempt.create({
            user: student1._id,
            bank: scienceBank._id,
            questions: snapshot,
            answers,
            startedAt,
            deadline: new Date(startedAt.getTime() + 600 * 1000),
            submittedAt,
            durationSeconds: 600,
            score,
            total,
            status: 'submitted',
            endReason: 'time_up',
            violationCount: 0,
            violations: []
          });
          console.log('Created sample attempt 2: 7/10 on Class 8 Science (Time Up)');
        }
      }
    }

    // Attempt 3: Tab switch violation ending (8/10)
    if (englishBank) {
      const existingAttempt = await Attempt.findOne({ user: student2._id, bank: englishBank._id });
      if (!existingAttempt) {
        const questions = await Question.find({ bankId: englishBank._id, archived: false }).limit(10);
        if (questions.length === 10) {
          const snapshot = questions.map(q => ({
            questionId: q._id,
            text: q.text,
            options: q.options,
            correctIndex: q.correctIndex,
            explanation: q.explanation || ''
          }));

          // 8 correct, 2 wrong
          const answers = snapshot.map((q, idx) => ({
            questionId: q.questionId,
            selectedIndex: idx >= 8 ? (q.correctIndex + 1) % 4 : q.correctIndex
          }));

          const startedAt = new Date(Date.now() - 5 * 3600 * 1000); // 5 hours ago
          const submittedAt = new Date(startedAt.getTime() + 320 * 1000); // 5 minutes in

          const { score, total } = evaluateAttempt({ questions: snapshot, answers });

          await Attempt.create({
            user: student2._id,
            bank: englishBank._id,
            questions: snapshot,
            answers,
            startedAt,
            deadline: new Date(startedAt.getTime() + 600 * 1000),
            submittedAt,
            durationSeconds: 320,
            score,
            total,
            status: 'submitted',
            endReason: 'tab_switch',
            violationCount: 6,
            violations: [
              { type: 'tab_switch', at: new Date(startedAt.getTime() + 60 * 1000) },
              { type: 'tab_switch', at: new Date(startedAt.getTime() + 120 * 1000) },
              { type: 'tab_switch', at: new Date(startedAt.getTime() + 180 * 1000) },
              { type: 'tab_switch', at: new Date(startedAt.getTime() + 240 * 1000) },
              { type: 'tab_switch', at: new Date(startedAt.getTime() + 300 * 1000) },
              { type: 'tab_switch', at: submittedAt }
            ]
          });
          console.log('Created sample attempt 3: 8/10 on Class 10 English (Tab switch auto-submit)');
        }
      }
    }

    console.log('Demo data population finished successfully!');
    await mongoose.connection.close();
    process.exit(0);
  } catch (err) {
    console.error('Error seeding demo data:', err);
    process.exit(1);
  }
}

seedDemoData();
