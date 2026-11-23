const mongoose = require('mongoose');

const questionBankSchema = new mongoose.Schema({
  classId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SchoolClass',
    required: [true, 'Class ID is required']
  },
  subject: {
    type: String,
    required: [true, 'Subject is required'],
    trim: true
  },
  name: {
    type: String,
    required: [true, 'Bank name is required'],
    trim: true
  },
  archived: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Unique on classId plus subject
questionBankSchema.index({ classId: 1, subject: 1 }, { unique: true });

module.exports = mongoose.model('QuestionBank', questionBankSchema);
