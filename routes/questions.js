import express from 'express';
import Question from '../models/Question.js';
import auth from '../middleware/auth.js';
import mongoose from 'mongoose';
import User from '../models/User.js';
const router = express.Router();


router.get('/', auth, async (req, res) => {
  try {
    const questions = await Question.find({ user: req.userId });
    res.json(questions);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching questions' });
  }
});

router.get('/user', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({
      username: user.username,
      email: user.email,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching user details' });
  }
});


router.get('/byTopic', auth, async (req, res) => {
  try {
    const { topics } = req.query; // Extracting the topic from the query
    const userId = req.userId; 

    if (!topics) {
      return res.status(400).json({ error: 'Topic is required' });
    }

    
    const questions = await Question.find({
      user: userId,
      topics: { $in: [topics] },  
    });

    res.status(200).json(questions);
  } catch (error) {
    console.error('Error fetching questions by topic:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});





// Route to get user's progress
router.get('/progress', auth, async (req, res) => {
  try {
    // Aggregate progress data grouped by topics
    const progressData = await Question.aggregate([
      { $match: { user:  new mongoose.Types.ObjectId(req.userId) } },
      { $unwind: '$topics' },
      { 
        $group: {
          _id: '$topics',
          totalQuestions: { $sum: 1 },
          needsRevisionCount: {
            $sum: { $cond: [{ $eq: ['$needsRevision', true] }, 1, 0] }
          }
        }
      },
      {
        $project: {
          topic: '$_id',
          totalQuestions: 1,
          needsRevisionCount: 1,
          _id: 0
        }
      }
    ]);

    res.status(200).json(progressData);
  } catch (error) {
    console.error('Error fetching progress data:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});






router.get('/byRating', auth, async (req, res) => {
  const { minRating } = req.query;
  const userId = req.userId;  
  try {
    if (!minRating || isNaN(minRating)) {
      return res.status(400).json({ message: 'Invalid or missing rating' });
    }

    const filter = { rating: { $gte: Number(minRating) } };

    console.log(`Filtering questions with rating >= ${minRating}`);

    const questions = await Question.find({
      user:userId,
      platform: 'codeforces',
      ...filter
    }).populate('user', 'username email');

    console.log('Filtered questions:', questions);

    if (questions.length === 0) {
      return res.status(404).json({ message: 'No questions found with the given rating' });
    }

    res.status(200).json(questions);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching filtered questions by rating' });
  }
});


router.get('/byDifficulty', auth, async (req, res) => {
  const { difficulty } = req.query;
  const userId = req.userId;  
  try {
    if (!difficulty || !['easy', 'medium', 'hard'].includes(difficulty)) {
      return res.status(400).json({ message: 'Invalid or missing difficulty' });
    }


    const questions = await Question.find({
      difficulty,
      user: userId,  
      $or: [ 
        { rating: 0 }             
      ]
    }).populate('user', 'username email');

    res.status(200).json(questions);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching questions by difficulty and null or 0 rating' });
  }
});





router.get('/byTimeSpent', auth, async (req, res) => {
  try {
    const { maxTime } = req.query;
    const userId = req.userId;  
    if (!maxTime) {
      return res.status(400).json({ error: 'Time is required as a query parameter.' });
    }

    const validTimes = [
      '5min', '10min', '15min', '20min', '25min', '30min',
      '35min', '40min', '45min', '50min', '55min', '60min'
    ];

    console.log('Received maxTime:', `"${maxTime}"`);
    console.log('Received maxTime:', userId);

    if (!validTimes.includes(maxTime)) {
      return res.status(400).json({
        error: `Invalid time value. Must be one of: ${validTimes.join(', ')}`,
      });
    }

    // Determine the valid time range starting from maxTime
    const validRange = validTimes.slice(validTimes.indexOf(maxTime));
    console.log('Valid range:', validRange);

    const filteredQuestions = await Question.find({
      user:userId,
      timeSpent: { $in: validRange },
    });

    res.json(filteredQuestions);
  } catch (error) {
    console.error('Error fetching questions:', error);
    res.status(500).json({ error: 'Server error. Could not fetch questions.' });
  }
});




// Add a new question
router.post('/', auth, async (req, res) => {
  try {
    const question = new Question({
      ...req.body,
      user: req.userId
    });
    await question.save();
    res.status(201).json(question);
  } catch (error) {
    res.status(500).json({ message: 'Error creating question' });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const question = await Question.findOneAndDelete({
      _id: req.params.id,
      user: req.userId
    });
    if (!question) {
      return res.status(404).json({ message: 'Question not found' });
    }
    res.json({ message: 'Question deleted successfully' });
  } catch (error){
    res.status(500).json({ message: 'Error deleting question' });
  }
});

// Update a question
router.patch('/:id', auth, async (req, res) => {
  try {
    const question = await Question.findOneAndUpdate(
      { _id: req.params.id, user: req.userId},
      req.body,
      { new: true }     
    );                             
    if (!question) {  
      return res.status(404).json({ message: 'Question not found' });
    }
    res.json(question);
  } catch (error) { 
    res.status(500).json({ message: 'Error updating question' });
  }
});

// Search questions by notes
router.get('/search', auth, async (req, res) => {
  try {
    const { query } = req.query;
    const questions = await Question.find({
      user: req.userId,
      notes: { $regex: query, $options: 'i' }
    });
    res.json(questions);
  } catch (error) {
    res.status(500).json({ message: 'Error searching questions' });
  }
});

export default router;