# Google Calendar API Setup Guide

This guide will walk you through setting up Google Calendar integration for your Organization App.

## Prerequisites
- A Google account
- Access to Google Cloud Console

## Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click the project dropdown at the top of the page
3. Click "New Project"
4. Enter project name: `Organization App` (or your preferred name)
5. Click "Create"
6. Wait for the project to be created, then select it from the project dropdown

## Step 2: Enable Google Calendar API

1. In your project, go to the navigation menu (☰)
2. Navigate to **APIs & Services** → **Library**
3. In the search bar, type `Google Calendar API`
4. Click on **Google Calendar API** from the results
5. Click the **Enable** button
6. Wait for the API to be enabled

## Step 3: Configure OAuth Consent Screen

1. Go to **APIs & Services** → **OAuth consent screen**
2. Select **External** user type (unless you have a Google Workspace)
3. Click **Create**
4. Fill in the required fields:
   - **App name**: Organization App
   - **User support email**: Your email address
   - **Developer contact information**: Your email address
5. Click **Save and Continue**
6. On the **Scopes** page, click **Add or Remove Scopes**
7. Search for and select:
   - `https://www.googleapis.com/auth/calendar.readonly`
   - `https://www.googleapis.com/auth/calendar.events.readonly`
8. Click **Update** then **Save and Continue**
9. On the **Test users** page, add your Google email address
10. Click **Save and Continue**
11. Review and click **Back to Dashboard**

## Step 4: Create OAuth Credentials

1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** at the top
3. Select **OAuth client ID**
4. Choose **Web application** as the application type
5. Enter a name: `Organization App Web Client`
6. Under **Authorized redirect URIs**, click **Add URI**
7. Enter: `http://localhost:3000/api/auth/google/callback`
8. Click **Create**
9. A modal will appear with your **Client ID** and **Client Secret**
10. Click **Download JSON** to save the credentials file
11. Keep this information secure - you'll need it for the next step

## Step 5: Save Your Credentials

You'll need to create a `.env` file in your app directory with the following:

```
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback
```

Replace `your_client_id_here` and `your_client_secret_here` with the values from Step 4.

**IMPORTANT**: Add `.env` to your `.gitignore` file to prevent committing credentials to version control.

## Step 6: Category Naming Convention

To categorize your calendar events, use the following prefixes in your Google Calendar event titles:

### Available Categories:
- `PLAY:` - Personal hobbies and recreation
- `STAND UP PRODUCTION:` - Stand-up performance and practice
- `STAND UP WRITING:` - Comedy writing and material development
- `TECHNICAL/PROFESSIONAL:` - Tech projects and professional development
- `COMMUNICATION:` - Social activities and communication
- `CHORES:` - Household tasks and errands

### Examples:
- `PLAY: Rock climbing at the gym`
- `STAND UP PRODUCTION: Open mic night`
- `STAND UP WRITING: Workshop new material`
- `TECHNICAL/PROFESSIONAL: Learn React hooks`
- `COMMUNICATION: Coffee with Sarah`
- `CHORES: Grocery shopping`

### Notes:
- The category prefix must match exactly (case-insensitive)
- Use a colon (`:`) to separate the category from the event description
- Events without a recognized category prefix will be marked as "Uncategorized"
- You can edit the category mapping later in the app

## Step 7: Next Steps

Once you have your credentials:
1. Save them in a `.env` file in your project root
2. The app will be updated to include:
   - A "Connect Google Calendar" button in settings
   - Manual sync button to pull your calendar events
   - Automatic periodic sync (configurable)
   - Time tracking analytics by category
   - Calendar events displayed in your Time Blocking Calendar

## Troubleshooting

### "Access blocked: Authorization Error"
- Make sure your email is added as a test user in the OAuth consent screen
- Verify the app is in "Testing" mode (not published)

### "Redirect URI mismatch"
- Ensure `http://localhost:3000/api/auth/google/callback` is exactly as entered in your OAuth client
- Check that your app is running on port 3000

### Calendar events not syncing
- Verify you granted calendar permissions during OAuth
- Check that your calendar is set to the correct Google account
- Ensure your calendar events follow the naming convention

## Security Notes

- **Never commit your `.env` file** to version control
- **Keep your Client Secret secure** - treat it like a password
- The app will only request **read-only** access to your calendar
- You can revoke access anytime at https://myaccount.google.com/permissions

## Additional Resources

- [Google Calendar API Documentation](https://developers.google.com/calendar/api/guides/overview)
- [OAuth 2.0 for Web Server Applications](https://developers.google.com/identity/protocols/oauth2/web-server)
- [Google Cloud Console](https://console.cloud.google.com/)

---

**Created**: November 8, 2025
**Last Updated**: November 8, 2025
