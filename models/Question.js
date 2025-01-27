import mongoose from 'mongoose';

const questionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    platform: {
      type: String,
      required: true,
      enum: ['leetcode', 'codeforces', 'gfg', 'codingninjas']
    },
    url: {
      type: String,
      required: true
    },
    difficulty: {
      type: String,
      required: true
    },
    rating: {
      type: Number,
      required: function () {
        return this.platform === 'codeforces';
      }
    },
    notes: {
      type: String,
      default: ''
    },
    topics: {
      type: [{ type: String }],
      required: true
    },
    needsRevision: {
      type: Boolean,
      default: false
    },
    timeSpent: {
      type: String,
      enum: [
        '5min',
        '10min',
        '15min',
        '20min',
        '25min',
        '30min',
        '35min',
        '40min',
        '45min',
        '50min',
        '55min',
        '60min'
      ]
    }
  },
  // { timestamps: true }
);

export default mongoose.model('Question', questionSchema);
