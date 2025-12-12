# Google Calendar Integration - Usage Guide

Your organization app now integrates with Google Calendar to automatically track time spent on different activities!

## How It Works

The app pulls events from your Google Calendar, categorizes them based on prefixes in the event titles, and displays time analytics by category.

## Getting Started

### 1. Connect Your Google Calendar

1. Start your app: `npm start`
2. Open http://localhost:3000 in your browser
3. Click the **Analytics** tab
4. Click **Connect Google Calendar**
5. Sign in with your Google account
6. Grant permission to read your calendar
7. You'll be redirected back to your app

### 2. Name Your Calendar Events

To categorize your events, use these prefixes in your Google Calendar event titles:

#### Available Categories:

- **PLAY:** - Personal hobbies and recreation
  - Example: `PLAY: Rock climbing at the gym`
  - Example: `PLAY: Video games with friends`

- **STAND UP PRODUCTION:** - Stand-up performance and practice
  - Example: `STAND UP PRODUCTION: Open mic night`
  - Example: `STAND UP PRODUCTION: Comedy showcase`

- **STAND UP WRITING:** - Comedy writing and material development
  - Example: `STAND UP WRITING: Workshop new material`
  - Example: `STAND UP WRITING: Write 5 new jokes`

- **TECHNICAL/PROFESSIONAL:** - Tech projects and professional development
  - Example: `TECHNICAL/PROFESSIONAL: Learn React hooks`
  - Example: `TECHNICAL/PROFESSIONAL: Side project coding`

- **COMMUNICATION:** - Social activities and communication
  - Example: `COMMUNICATION: Coffee with Sarah`
  - Example: `COMMUNICATION: Weekly team call`

- **CHORES:** - Household tasks and errands
  - Example: `CHORES: Grocery shopping`
  - Example: `CHORES: Laundry and cleaning`

#### Important Notes:
- The category name must be **exact** (case doesn't matter)
- Use a **colon (:)** or **dash (-)** to separate the category from the description
- Events without a recognized prefix will be marked as "Uncategorized"

### 3. Sync Your Calendar

1. Go to the **Analytics** tab
2. Click the **Sync Calendar** button
3. The app will pull the last 30 days and next 30 days of events
4. Sync whenever you want to update your analytics with the latest calendar data

### 4. View Your Time Analytics

After syncing, you'll see:

1. **Time Spent by Category** - Shows total hours and event count for each category
2. **Last Sync Time** - When your calendar was last updated
3. **Synced Events in Calendar** - Your Google Calendar events appear in the Time Blocking Calendar tab

## Features

### Analytics Dashboard
- See how much time you're spending on each category
- Track event counts per category
- Identify which areas get the most/least time

### Calendar View
- **Calendar Tab** shows both:
  - Manual time blocks (editable)
  - Synced Google Calendar events (read-only, darker border)
- Color-coded by category
- Week/month/day views available

### Smart Categorization
- Automatic parsing of event titles
- Matches category prefixes to your goal categories
- Future-ready for learning from your corrections

## Tips for Best Results

1. **Be Consistent**: Use the same category prefixes for all your events
2. **Use Specific Descriptions**: `PLAY: Rock climbing` is better than just `PLAY: Activity`
3. **Schedule Everything**: The more you track in Google Calendar, the better your analytics
4. **Sync Regularly**: Click "Sync Calendar" daily or weekly to keep your analytics up to date
5. **Review Weekly**: Check the Analytics tab regularly to see your time distribution

## Example Calendar Setup

Here's a sample week you might create in Google Calendar:

**Monday:**
- 9:00 AM - 12:00 PM: `TECHNICAL/PROFESSIONAL: Code review and planning`
- 7:00 PM - 8:30 PM: `STAND UP WRITING: Write new material`

**Tuesday:**
- 6:00 PM - 8:00 PM: `STAND UP PRODUCTION: Open mic practice`

**Wednesday:**
- 10:00 AM - 11:00 AM: `CHORES: Grocery shopping`
- 8:00 PM - 9:00 PM: `COMMUNICATION: Call with Mom`

**Thursday:**
- 7:00 PM - 9:00 PM: `PLAY: Board game night`

**Friday:**
- 5:00 PM - 6:30 PM: `TECHNICAL/PROFESSIONAL: Learning new framework`

**Saturday:**
- 2:00 PM - 4:00 PM: `STAND UP PRODUCTION: Comedy show performance`
- 7:00 PM - 10:00 PM: `PLAY: Concert`

**Sunday:**
- 10:00 AM - 11:00 AM: `CHORES: Weekly cleaning`
- 3:00 PM - 5:00 PM: `STAND UP WRITING: Review and edit material`

After syncing, your analytics would show:
- **Technical/Professional**: 3.5 hours (2 events)
- **Stand Up Production**: 4.5 hours (2 events)
- **Stand Up Writing**: 3.5 hours (2 events)
- **Play**: 5 hours (2 events)
- **Communication**: 1 hour (1 event)
- **Chores**: 2 hours (2 events)

## Troubleshooting

### Events Not Showing Up
- Make sure you've synced (click Sync Calendar button)
- Check that events are within the last/next 30 days
- Verify your Google Calendar has events

### Events Are Uncategorized
- Check the category prefix spelling
- Make sure you're using a colon (:) or dash (-) after the category
- Category names must match exactly (though case doesn't matter)

### Calendar Won't Connect
- Make sure you've set up the Google Calendar API (see GOOGLE_CALENDAR_SETUP.md)
- Check that your `.env` file has the correct credentials
- Try disconnecting and reconnecting

### Sync Fails
- Check your internet connection
- Try disconnecting and reconnecting your calendar
- Check the browser console for error messages

## Privacy & Security

- **Read-Only Access**: The app can only READ your calendar, not modify it
- **Local Storage**: Calendar tokens are stored locally in `data/google-tokens.json`
- **No Cloud Sync**: All data stays on your computer
- **Revoke Access**: You can disconnect anytime or revoke access at https://myaccount.google.com/permissions

## Next Steps

1. Connect your Google Calendar
2. Update your existing calendar events with category prefixes
3. Create new events using the naming convention
4. Sync and view your time analytics
5. Use the insights to balance your time across categories

---

**Questions or Issues?**
Check the main README.md or GOOGLE_CALENDAR_SETUP.md for more information.

**Happy tracking!** 📅
