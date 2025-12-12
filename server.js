const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();
const { google } = require('googleapis');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data', 'storage.json');
const TOKENS_FILE = path.join(__dirname, 'data', 'google-tokens.json');

app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// Google OAuth2 Client Setup
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

// Load saved tokens if they exist
async function loadTokens() {
  try {
    const tokens = await fs.readFile(TOKENS_FILE, 'utf8');
    const parsedTokens = JSON.parse(tokens);
    oauth2Client.setCredentials(parsedTokens);
    return parsedTokens;
  } catch (error) {
    return null;
  }
}

async function saveTokens(tokens) {
  await fs.writeFile(TOKENS_FILE, JSON.stringify(tokens, null, 2));
  oauth2Client.setCredentials(tokens);
}

async function loadData() {
  try {
    const data = await fs.readFile(DATA_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    // If file doesn't exist, create it with default data
    if (error.code === 'ENOENT') {
      console.log('Data file not found. Creating with default data...');
      const defaultData = {
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
      await saveData(defaultData);
      return defaultData;
    }
    throw error;
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

app.put('/api/categories/:id', async (req, res) => {
  try {
    const data = await loadData();
    const categoryIndex = data.categories.findIndex(c => c.id === req.params.id);
    if (categoryIndex === -1) {
      return res.status(404).json({ error: 'Category not found' });
    }

    data.categories[categoryIndex] = {
      ...data.categories[categoryIndex],
      name: req.body.name,
      color: req.body.color
    };

    await saveData(data);
    res.json(data.categories[categoryIndex]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update category' });
  }
});

app.delete('/api/goals/:id', async (req, res) => {
  try {
    const data = await loadData();
    const goalIndex = data.goals.findIndex(g => g.id === req.params.id);
    if (goalIndex === -1) {
      return res.status(404).json({ error: 'Goal not found' });
    }
    data.goals.splice(goalIndex, 1);
    await saveData(data);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete goal' });
  }
});

app.delete('/api/timeblocks/:id', async (req, res) => {
  try {
    const data = await loadData();
    const blockIndex = data.timeBlocks.findIndex(b => b.id === req.params.id);
    if (blockIndex === -1) {
      return res.status(404).json({ error: 'Time block not found' });
    }
    data.timeBlocks.splice(blockIndex, 1);
    await saveData(data);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete time block' });
  }
});

// Google Calendar OAuth endpoints
app.get('/api/auth/google', (req, res) => {
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/calendar.readonly'],
    prompt: 'consent'
  });
  res.json({ authUrl });
});

app.get('/api/auth/google/callback', async (req, res) => {
  const { code } = req.query;

  try {
    const { tokens } = await oauth2Client.getToken(code);
    await saveTokens(tokens);
    res.redirect('/?calendar_connected=true');
  } catch (error) {
    console.error('Error getting tokens:', error);
    res.redirect('/?calendar_error=true');
  }
});

app.get('/api/auth/google/status', async (req, res) => {
  const tokens = await loadTokens();
  res.json({ connected: !!tokens });
});

app.post('/api/auth/google/disconnect', async (req, res) => {
  try {
    await fs.unlink(TOKENS_FILE);
    oauth2Client.setCredentials({});
    res.json({ success: true });
  } catch (error) {
    res.json({ success: true }); // File might not exist, that's ok
  }
});

// Category parser - extracts category from event title
function parseCategory(eventTitle, categories) {
  if (!eventTitle) return null;

  const lower = eventTitle.toLowerCase().trim();

  // Play
  if (lower.includes('play:') || lower.includes('marten') ||
      lower.includes('susan') || lower.includes('coaching session') ||
      lower.includes('character voice')) {
    return 'play';
  }

  // Work
  if (lower === 'work' ||
      (lower.includes('work') && !lower.includes('walk') && !lower.includes('workout') && !lower.includes('network')) ||
      (lower.includes('meeting') && !lower.includes('play')) ||
      lower.includes('touchpoint') || lower.includes('sync') ||
      lower.includes('workshop') || lower.includes('prep for 1:1')) {
    return 'technical-professional';
  }

  // Exercise
  if (lower.includes('workout') || lower.includes('saturday stairs') ||
      lower.includes('november project') || lower.includes('hike') ||
      lower.includes('yoga') || lower.includes('sculpt') || lower.includes('vinyasa') ||
      lower.includes('run club') || lower === 'run' ||
      lower.includes('walk to') || lower.includes('walk from') ||
      lower.includes('weflowhard') || lower.includes('fitness:') ||
      lower.includes('stretching')) {
    return 'exercise';
  }

  // Stand-up production/writing
  if (lower.includes('coffee with david lee') ||
      lower.includes('stand up') || lower.includes('standup') ||
      lower.includes('hoopla') || lower.includes('open mic') ||
      lower.includes('hype mic') || lower.includes('comedy')) {
    return 'stand-up-production';
  }

  // UCLA
  if (lower.includes('ucla') || lower.includes('watch tms') ||
      lower.includes('watch veep') || lower.includes('abbott elementary') ||
      lower.includes('tv')) {
    return 'ucla';
  }

  // Social
  if (lower.includes('joel') || lower.includes('date') ||
      lower.includes('dinner with kendall') || lower.includes('hang with') ||
      lower.includes('church') || lower.includes('hannah') ||
      lower.includes('alison') || lower.includes('philharmonic') ||
      lower.includes('wicked') || lower.includes('harry potter') ||
      lower.includes('funny games')) {
    return 'communication';
  }

  // WiS production / business planning
  if (lower.includes('meet simone') || lower.includes('business plan') ||
      lower.includes('wis') || lower.includes('post on linkedin') ||
      lower.includes('women in stem')) {
    return 'wis-production';
  }

  // Family
  if (lower.includes('travel') || lower.includes('flight') ||
      lower.includes('thanksgiving') || lower.includes('family time') ||
      lower.includes('get nails done') || lower.includes('mm weekly') ||
      lower.includes('fort lauderdale') || lower.includes('fll') ||
      lower.includes('pool/sauna') || lower.includes('black friday') ||
      lower.includes('drive rachel') || lower.includes('drive allie') ||
      lower.includes('talk to mom') || lower.includes('book flight')) {
    return 'family';
  }

  // Job search
  if (lower.includes('update linkedin') || lower.includes('job app') ||
      lower.includes('resume') || lower === 'job search' ||
      lower.includes('kustomer') || (lower.includes('pro dev') && lower.includes('tyler'))) {
    return 'job-search';
  }

  // Personal writing
  if (lower.includes('blog writing') || lower.includes('write: blog') ||
      lower.includes('blog post')) {
    return 'personal-writing';
  }

  // Personal development
  if (lower.includes('journal')) {
    return 'personal-development';
  }

  // Decision stress
  if (lower.includes('gift shopping') || lower.includes('plane ticket') ||
      lower.includes('buy plane') || lower.includes('re-think')) {
    return 'decision-stress';
  }

  // Errands/chores
  if (lower.includes('grocery') || lower.includes('trader joe') ||
      lower.includes('food pantry') || (lower.includes('shopping') && !lower.includes('gift')) ||
      lower.includes('laundry') || lower.includes('clean room') ||
      lower.includes('bargain basket') || lower.includes('lunch') ||
      lower.includes('breakfast') || (lower.includes('dinner') && !lower.includes('kendall')) ||
      lower.includes('cook') || lower.includes('meal') || lower.includes('make/eat') ||
      lower.includes('doctor') || lower.includes('tia ') || lower.includes('shower') ||
      lower.includes('appt') || lower.includes('nap')) {
    return 'chores';
  }

  // Additional social events
  if (lower.includes('hang with') || lower.includes('stephen') ||
      lower.includes('roommates') || lower.includes('date')) {
    return 'communication';
  }

  // Additional exercise
  if (lower.includes('walk') && !lower.includes('walk to') && !lower.includes('walk from')) {
    return 'exercise';
  }

  // Additional family/travel
  if (lower.includes('drive') && (lower.includes('airport') || lower.includes('allie') || lower.includes('rachel'))) {
    return 'family';
  }

  // Additional WiS
  if (lower.includes('women in stem') || lower.includes('simone')) {
    return 'wis-production';
  }

  // Additional writing
  if (lower === 'write' || (lower.includes('write') && !lower.includes('stand up'))) {
    return 'personal-writing';
  }

  // Additional social/entertainment (capitalize-insensitive)
  if (lower.includes('essay club') || lower.includes('meeting (')) {
    return 'communication';
  }

  // Professional development
  if (lower.includes('pro dev') || lower.includes('prep for 1:1') || lower.includes('draft passes')) {
    return 'technical-professional';
  }

  return null; // Uncategorized
}

// Sync Google Calendar events
app.post('/api/calendar/sync', async (req, res) => {
  try {
    const tokens = await loadTokens();
    if (!tokens) {
      return res.status(401).json({ error: 'Not authenticated with Google Calendar' });
    }

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    const data = await loadData();

    // Get events from the last 30 days and next 30 days
    const timeMin = new Date();
    timeMin.setDate(timeMin.getDate() - 30);
    const timeMax = new Date();
    timeMax.setDate(timeMax.getDate() + 30);

    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
    });

    const events = response.data.items || [];

    // Parse and store events (without categories - frontend will categorize)
    const categorizedEvents = events.map(event => {
      return {
        id: `google_${event.id}`,
        title: event.summary || 'Untitled Event',
        category: null, // Let frontend handle categorization
        startTime: event.start.dateTime || event.start.date,
        endTime: event.end.dateTime || event.end.date,
        source: 'google_calendar',
        allDay: !event.start.dateTime, // If no time, it's an all-day event
        originalEvent: event
      };
    });

    // Store synced events in data
    if (!data.syncedEvents) {
      data.syncedEvents = [];
    }

    // Remove old Google Calendar events and add new ones
    data.syncedEvents = data.syncedEvents.filter(e => e.source !== 'google_calendar');
    data.syncedEvents.push(...categorizedEvents);

    // Update last sync time
    data.lastCalendarSync = new Date().toISOString();

    await saveData(data);

    res.json({
      success: true,
      eventCount: categorizedEvents.length,
      lastSync: data.lastCalendarSync
    });
  } catch (error) {
    console.error('Calendar sync error:', error);
    res.status(500).json({ error: 'Failed to sync calendar', details: error.message });
  }
});

// Get synced calendar events
app.get('/api/calendar/events', async (req, res) => {
  try {
    const data = await loadData();
    res.json({
      events: data.syncedEvents || [],
      lastSync: data.lastCalendarSync || null
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load calendar events' });
  }
});

// Get time analytics by category
app.get('/api/analytics/time-by-category', async (req, res) => {
  try {
    const data = await loadData();
    const events = data.syncedEvents || [];

    // Calculate total hours by category
    const timeByCategory = {};

    events.forEach(event => {
      if (event.allDay) return; // Skip all-day events for time tracking

      const start = new Date(event.startTime);
      const end = new Date(event.endTime);
      const hours = (end - start) / (1000 * 60 * 60); // Convert ms to hours

      // Categorize event dynamically
      const categoryId = parseCategory(event.title, data.categories || []) || 'uncategorized';

      if (!timeByCategory[categoryId]) {
        timeByCategory[categoryId] = {
          hours: 0,
          eventCount: 0
        };
      }

      timeByCategory[categoryId].hours += hours;
      timeByCategory[categoryId].eventCount += 1;
    });

    res.json({ timeByCategory, lastSync: data.lastCalendarSync });
  } catch (error) {
    res.status(500).json({ error: 'Failed to calculate time analytics' });
  }
});

// Get weekly calendar analytics
app.get('/api/analytics/weekly', async (req, res) => {
  try {
    const { weekStart } = req.query;
    if (!weekStart) {
      return res.status(400).json({ error: 'weekStart parameter required (YYYY-MM-DD format)' });
    }

    const data = await loadData();
    const events = data.syncedEvents || [];

    // Parse the week start date
    const weekStartDate = new Date(weekStart);
    const weekEndDate = new Date(weekStart);
    weekEndDate.setDate(weekEndDate.getDate() + 7);

    // Filter events for this week
    const weekEvents = events.filter(event => {
      if (event.allDay) return false;
      const eventDate = new Date(event.startTime);
      return eventDate >= weekStartDate && eventDate < weekEndDate;
    });

    res.json({
      weekStart: weekStartDate.toISOString(),
      weekEnd: weekEndDate.toISOString(),
      events: weekEvents
    });
  } catch (error) {
    console.error('Weekly analytics error:', error);
    res.status(500).json({ error: 'Failed to get weekly analytics' });
  }
});

app.listen(PORT, () => {
  console.log(`Organization app running on http://localhost:${PORT}`);
  loadTokens(); // Load saved tokens on startup
});