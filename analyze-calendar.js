const fs = require('fs');
const data = JSON.parse(fs.readFileSync('data/storage.json', 'utf8'));
const events = data.syncedEvents || [];

// Categories mapping
const categories = {
  'work': [],
  'play': [],
  'UCLA': [],
  'exercise': [],
  'social': [],
  'business planning': [],
  'comedy': [],
  'miscellaneous': []
};

const timeByCategory = {
  'work': 0,
  'play': 0,
  'UCLA': 0,
  'exercise': 0,
  'social': 0,
  'business planning': 0,
  'comedy': 0,
  'miscellaneous': 0
};

// Categorization keywords
function categorizeEvent(title) {
  const lower = title.toLowerCase();

  // Work (but not walk)
  if ((lower.includes('work') && !lower.includes('walk')) ||
      (lower.includes('meeting') && !lower.includes('play')) ||
      lower.includes('touchpoint') || lower.includes('sync') ||
      lower.includes('job app') || lower.includes('resume') ||
      lower.includes('kustomer')) {
    return 'work';
  }

  // Play
  if (lower.includes('play:') || lower.includes('marten') || lower.includes('susan')) {
    return 'play';
  }

  // UCLA
  if (lower.includes('ucla')) {
    return 'UCLA';
  }

  // Exercise
  if (lower.includes('yoga') || lower.includes('sculpt') || lower.includes('vinyasa') ||
      lower.includes('run') || lower.includes('walk to') || lower.includes('walk from') ||
      lower.includes('weflowhard')) {
    return 'exercise';
  }

  // Social
  if (lower.includes('hang with') || lower.includes('coffee with') ||
      lower.includes('church') || lower.includes('hannah') ||
      lower.includes('alison') || lower.includes('david lee')) {
    return 'social';
  }

  // Business planning
  if (lower.includes('business plan') || lower.includes('wis')) {
    return 'business planning';
  }

  // Comedy
  if (lower.includes('stand up') || lower.includes('hoopla') ||
      lower.includes('open mic') || lower.includes('comedy')) {
    return 'comedy';
  }

  return 'miscellaneous';
}

// Process events
events.forEach(event => {
  if (event.allDay) return; // Skip all-day events

  const category = categorizeEvent(event.title);
  const start = new Date(event.startTime);
  const end = new Date(event.endTime);
  const hours = (end - start) / (1000 * 60 * 60);

  categories[category].push({
    title: event.title,
    start: event.startTime,
    hours: hours.toFixed(2)
  });

  timeByCategory[category] += hours;
});

// Calculate total hours
const totalHours = Object.values(timeByCategory).reduce((a, b) => a + b, 0);

// Output results
console.log('\n=== TIME ANALYSIS BY CATEGORY ===\n');
Object.keys(timeByCategory).sort((a, b) => timeByCategory[b] - timeByCategory[a]).forEach(cat => {
  if (timeByCategory[cat] > 0) {
    const percentage = ((timeByCategory[cat] / totalHours) * 100).toFixed(1);
    console.log(`${cat.toUpperCase()}: ${timeByCategory[cat].toFixed(2)} hours (${categories[cat].length} events) - ${percentage}%`);
  }
});

console.log(`\nTOTAL: ${totalHours.toFixed(2)} hours across ${events.filter(e => !e.allDay).length} events`);

console.log('\n\n=== MISCELLANEOUS ITEMS TO REVIEW ===\n');
if (categories['miscellaneous'].length > 0) {
  categories['miscellaneous'].forEach((item, i) => {
    console.log(`${i+1}. "${item.title}" (${item.hours} hours)`);
  });
} else {
  console.log('No miscellaneous items!');
}

// Show sample events from each category
console.log('\n\n=== SAMPLE EVENTS BY CATEGORY ===\n');
Object.keys(categories).forEach(cat => {
  if (categories[cat].length > 0 && cat !== 'miscellaneous') {
    console.log(`\n${cat.toUpperCase()} (showing first 5):`);
    categories[cat].slice(0, 5).forEach(item => {
      console.log(`  - ${item.title} (${item.hours}h)`);
    });
  }
});
