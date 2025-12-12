const fs = require('fs');
const data = JSON.parse(fs.readFileSync('data/storage.json', 'utf8'));
const events = data.syncedEvents || [];

// Categories mapping with user's updated categories
const categories = {
  'work': [],
  'play': [],
  'UCLA': [],
  'exercise': [],
  'social': [],
  'WiS production': [],
  'stand-up production': [],
  'family': [],
  'job search': [],
  'personal writing': [],
  'personal development': [],
  'errands/chores': [],
  'miscellaneous': []
};

const timeByCategory = {
  'work': 0,
  'play': 0,
  'UCLA': 0,
  'exercise': 0,
  'social': 0,
  'WiS production': 0,
  'stand-up production': 0,
  'family': 0,
  'job search': 0,
  'personal writing': 0,
  'personal development': 0,
  'errands/chores': 0,
  'miscellaneous': 0
};

// Categorization function with updated rules
function categorizeEvent(title) {
  const lower = title.toLowerCase();

  // Exercise
  if (lower.includes('saturday stairs') || lower.includes('november project') ||
      lower.includes('hike') || lower.includes('yoga') || lower.includes('sculpt') ||
      lower.includes('vinyasa') || lower.includes('run') ||
      lower.includes('walk to') || lower.includes('walk from') ||
      lower.includes('weflowhard') || lower.includes('fitness:')) {
    return 'exercise';
  }

  // Stand-up production
  if (lower.includes('coffee with david lee') || lower.includes('stand up') ||
      lower.includes('hoopla') || lower.includes('open mic') ||
      lower.includes('hype mic') || lower.includes('comedy')) {
    return 'stand-up production';
  }

  // Social
  if (lower.includes('joel') || lower.includes('date') ||
      lower.includes('dinner with kendall') || lower.includes('hang with') ||
      lower.includes('church') || lower.includes('hannah') ||
      lower.includes('alison') || lower.includes('philharmonic') ||
      lower.includes('wicked') || lower.includes('harry potter') ||
      lower.includes('funny games')) {
    return 'social';
  }

  // WiS production
  if (lower.includes('meet simone') || lower.includes('business plan') ||
      lower.includes('wis') || lower.includes('post on linkedin') ||
      lower.includes('women in stem')) {
    return 'WiS production';
  }

  // UCLA (including watch items)
  if (lower.includes('ucla') || lower.includes('watch tms') ||
      lower.includes('watch veep') || lower.includes('abbott elementary') ||
      lower.includes('tv')) {
    return 'UCLA';
  }

  // Family
  if (lower.includes('travel') || lower.includes('flight') ||
      lower.includes('thanksgiving') || lower.includes('family time') ||
      lower.includes('get nails done') || lower.includes('mm weekly') ||
      lower.includes('fort lauderdale') || lower.includes('fll') ||
      lower.includes('pool/sauna') || lower.includes('black friday') ||
      lower.includes('drive rachel') || lower.includes('drive allie') ||
      lower.includes('talk to mom')) {
    return 'family';
  }

  // Job search
  if (lower.includes('update linkedin') || lower.includes('job app') ||
      lower.includes('resume') || lower.includes('job search') ||
      lower.includes('kustomer') || lower.includes('pro dev') && lower.includes('tyler')) {
    return 'job search';
  }

  // Personal writing
  if (lower.includes('blog writing') || lower.includes('write: blog') ||
      lower.includes('write') && !lower.includes('ucla')) {
    return 'personal writing';
  }

  // Personal development
  if (lower.includes('journal')) {
    return 'personal development';
  }

  // Errands/chores
  if (lower.includes('grocery') || lower.includes('trader joe') ||
      lower.includes('food pantry') || lower.includes('shopping') && !lower.includes('gift') ||
      lower.includes('laundry') || lower.includes('clean room') ||
      lower.includes('bargain basket')) {
    return 'errands/chores';
  }

  // Play
  if (lower.includes('play:') || lower.includes('marten') ||
      lower.includes('susan') || lower.includes('coaching session')) {
    return 'play';
  }

  // Work (remaining work items)
  if ((lower.includes('work') && !lower.includes('walk')) ||
      (lower.includes('meeting') && !lower.includes('play')) ||
      lower.includes('touchpoint') || lower.includes('sync') ||
      lower.includes('workshop')) {
    return 'work';
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
console.log('\n=== UPDATED TIME ANALYSIS BY CATEGORY ===\n');
Object.keys(timeByCategory).sort((a, b) => timeByCategory[b] - timeByCategory[a]).forEach(cat => {
  if (timeByCategory[cat] > 0) {
    const percentage = ((timeByCategory[cat] / totalHours) * 100).toFixed(1);
    console.log(`${cat.toUpperCase()}: ${timeByCategory[cat].toFixed(2)} hours (${categories[cat].length} events) - ${percentage}%`);
  }
});

console.log(`\nTOTAL: ${totalHours.toFixed(2)} hours across ${events.filter(e => !e.allDay).length} events`);

console.log('\n\n=== REMAINING MISCELLANEOUS ITEMS ===\n');
if (categories['miscellaneous'].length > 0) {
  categories['miscellaneous'].forEach((item, i) => {
    console.log(`${i+1}. "${item.title}" (${item.hours} hours)`);
  });
} else {
  console.log('No miscellaneous items - everything is categorized!');
}

// Show work items specifically
console.log('\n\n=== WORK CATEGORY BREAKDOWN ===\n');
if (categories['work'].length > 0) {
  const workTitles = {};
  categories['work'].forEach(item => {
    if (!workTitles[item.title]) {
      workTitles[item.title] = { count: 0, totalHours: 0 };
    }
    workTitles[item.title].count++;
    workTitles[item.title].totalHours += parseFloat(item.hours);
  });

  Object.entries(workTitles).forEach(([title, data], i) => {
    console.log(`${i+1}. "${title}" - ${data.totalHours.toFixed(2)}h (${data.count} events)`);
  });
}
