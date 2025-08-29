const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data', 'storage.json');

app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

async function loadData() {
  try {
    const data = await fs.readFile(DATA_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return {
      goals: [],
      timeBlocks: [],
      weeklyPlans: [],
      categories: [
        { id: 'play', name: 'Play', color: '#FF6B6B' },
        { id: 'stand-up-production', name: 'Stand Up Production', color: '#4ECDC4' },
        { id: 'stand-up-writing', name: 'Stand Up Writing', color: '#45B7D1' },
        { id: 'technical-professional', name: 'Technical/Professional', color: '#96CEB4' },
        { id: 'communication', name: 'Communication', color: '#FFEAA7' },
        { id: 'chores', name: 'Chores', color: '#DDA0DD' }
      ],
      analytics: {
        productivityPatterns: {
          byTimeOfDay: {},
          byCategory: {}
        },
        suggestions: []
      }
    };
  }
}

async function saveData(data) {
  await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2));
}

app.get('/api/goals', async (req, res) => {
  try {
    const data = await loadData();
    res.json(data.goals);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load goals' });
  }
});

app.post('/api/goals', async (req, res) => {
  try {
    const data = await loadData();
    const newGoal = {
      id: Date.now().toString(),
      ...req.body,
      createdAt: new Date().toISOString(),
      completedAt: null,
      progress: 0
    };
    data.goals.push(newGoal);
    await saveData(data);
    res.json(newGoal);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create goal' });
  }
});

app.put('/api/goals/:id', async (req, res) => {
  try {
    const data = await loadData();
    const goalIndex = data.goals.findIndex(g => g.id === req.params.id);
    if (goalIndex === -1) {
      return res.status(404).json({ error: 'Goal not found' });
    }
    data.goals[goalIndex] = { ...data.goals[goalIndex], ...req.body };
    await saveData(data);
    res.json(data.goals[goalIndex]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update goal' });
  }
});

app.get('/api/timeblocks', async (req, res) => {
  try {
    const data = await loadData();
    res.json(data.timeBlocks);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load time blocks' });
  }
});

app.post('/api/timeblocks', async (req, res) => {
  try {
    const data = await loadData();
    const newTimeBlock = {
      id: Date.now().toString(),
      ...req.body
    };
    data.timeBlocks.push(newTimeBlock);
    await saveData(data);
    res.json(newTimeBlock);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create time block' });
  }
});

app.get('/api/analytics', async (req, res) => {
  try {
    const data = await loadData();
    res.json(data.analytics);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load analytics' });
  }
});

app.get('/api/categories', async (req, res) => {
  try {
    const data = await loadData();
    res.json(data.categories || []);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load categories' });
  }
});

app.post('/api/categories', async (req, res) => {
  try {
    const data = await loadData();
    if (!data.categories) data.categories = [];
    
    const newCategory = {
      id: req.body.name.toLowerCase().replace(/\s+/g, '-'),
      name: req.body.name,
      color: req.body.color || '#007AFF'
    };
    
    data.categories.push(newCategory);
    await saveData(data);
    res.json(newCategory);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create category' });
  }
});

app.listen(PORT, () => {
  console.log(`Organization app running on http://localhost:${PORT}`);
});