const { google } = require('googleapis');

// Initialize OAuth2 client
const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
);

// Scopes required for calendar access
const SCOPES = ['https://www.googleapis.com/auth/calendar'];

module.exports = {
    oauth2Client,
    SCOPES
};
