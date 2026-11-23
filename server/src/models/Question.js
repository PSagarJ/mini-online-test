const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  bankId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'QuestionBank',
    required: [true, 'Question Bank ID is required']
  },
  text: {
    type: String,
    required: [true, 'Question text is required'],
    trim: true
  },
  options: {
    type: [String],
    required: true,
    validate: {
      validator: function(val) {
        if (!Array.isArray(val) || val.length !== 4) return false;
        // Exactly 4 distinct non-empty strings
        const trimmed = val.map(opt => String(opt).trim());
        if (trimmed.some(opt => opt.length === 0)) return false;
        const set = new Set(trimmed);
        return set.size === 4;
      },
      message: 'Question must have exactly 4 distinct non-empty options'
    }
  },
  correctIndex: {
    type: Number,
    required: [true, 'Correct index is required'],
    min: 0,
    max: 3
  },
  explanation: {
    type: String,
    default: '',
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

module.exports = mongoose.model('Question', questionSchema);
