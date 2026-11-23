const mongoose = require('mongoose');

const attemptQuestionSnapshotSchema = new mongoose.Schema({
  questionId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  text: {
    type: String,
    required: true
  },
  options: {
    type: [String],
    required: true
  },
  correctIndex: {
    type: Number,
    required: true
  },
  explanation: {
    type: String,
    default: ''
  }
}, { _id: false });

const answerSchema = new mongoose.Schema({
  questionId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  selectedIndex: {
    type: Number,
    min: 0,
    max: 3,
    default: null
  }
}, { _id: false });

const violationSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['tab_switch', 'window_switch', 'reload_or_close', 'navigation'],
    required: true
  },
  at: {
    type: Date,
    default: Date.now
  }
}, { _id: false });

const attemptSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  bank: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'QuestionBank',
    required: true
  },
  questions: {
    type: [attemptQuestionSnapshotSchema],
    required: true,
    validate: [val => val.length === 10, 'Attempt must snapshot exactly 10 questions']
  },
  answers: {
    type: [answerSchema],
    default: []
  },
  startedAt: {
    type: Date,
    default: Date.now
  },
  deadline: {
    type: Date,
    required: true
  },
  submittedAt: {
    type: Date,
    default: null
  },
  durationSeconds: {
    type: Number,
    default: 0
  },
  score: {
    type: Number,
    default: 0
  },
  total: {
    type: Number,
    default: 10
  },
  status: {
    type: String,
    enum: ['in_progress', 'submitted', 'timed_out'],
    default: 'in_progress'
  },
  endReason: {
    type: String,
    enum: [null, 'manual', 'time_up', 'tab_switch', 'window_switch', 'reload_or_close', 'navigation', 'deadline_passed'],
    default: null
  },
  violationCount: {
    type: Number,
    default: 0
  },
  violations: {
    type: [violationSchema],
    default: []
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Attempt', attemptSchema);
