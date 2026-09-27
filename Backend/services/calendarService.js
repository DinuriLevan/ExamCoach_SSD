const { google } = require('googleapis');
const { oauth2Client, SCOPES } = require('../config/googleCalendar');

/**
 * Generate OAuth URL for user authorization
 */
const getAuthUrl = () => {
    return oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
        prompt: 'consent' // Force consent screen to get refresh token
    });
};

/**
 * Exchange authorization code for tokens
 */
const getTokensFromCode = async (code) => {
    try {
        const { tokens } = await oauth2Client.getToken(code);
        return tokens;
    } catch (error) {
        console.error('Error getting tokens:', error);
        throw new Error('Failed to exchange authorization code for tokens');
    }
};

/**
 * Set credentials for OAuth client
 */
const setCredentials = (tokens) => {
    oauth2Client.setCredentials(tokens);
};

/**
 * Refresh access token using refresh token
 */
const refreshAccessToken = async (refreshToken) => {
    try {
        oauth2Client.setCredentials({
            refresh_token: refreshToken
        });
        const { credentials } = await oauth2Client.refreshAccessToken();
        return credentials;
    } catch (error) {
        console.error('Error refreshing token:', error);
        throw new Error('Failed to refresh access token');
    }
};

/**
 * Create exam event on Google Calendar
 */
const createExamEvent = async (tokens, examData) => {
    try {
        setCredentials(tokens);
        const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

        const event = {
            summary: `📚 Exam: ${examData.subject}`,
            description: `Exam for ${examData.subject}\n\nPrepared via ExamCoach Study Plan`,
            start: {
                dateTime: examData.examDate,
                timeZone: 'Asia/Kolkata'
            },
            end: {
                dateTime: new Date(new Date(examData.examDate).getTime() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours duration
                timeZone: 'Asia/Kolkata'
            },
            reminders: {
                useDefault: false,
                overrides: [
                    { method: 'popup', minutes: 24 * 60 }, // 1 day before
                    { method: 'popup', minutes: 7 * 24 * 60 }, // 1 week before
                    { method: 'popup', minutes: 60 } // 1 hour before
                ]
            },
            colorId: '11' // Red color for exams
        };

        const response = await calendar.events.insert({
            calendarId: 'primary',
            resource: event
        });

        return response.data;
    } catch (error) {
        console.error('Error creating exam event:', error);
        throw new Error('Failed to create exam event on Google Calendar');
    }
};

/**
 * Create study session block on Google Calendar
 */
const createStudySessionBlock = async (tokens, sessionData) => {
    try {
        setCredentials(tokens);
        const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

        const event = {
            summary: `📖 Study: ${sessionData.subject}`,
            description: `Study session for ${sessionData.subject}\n\nDuration: ${sessionData.duration} hours\n\nCreated via ExamCoach Study Plan`,
            start: {
                dateTime: sessionData.startTime,
                timeZone: 'Asia/Kolkata'
            },
            end: {
                dateTime: sessionData.endTime,
                timeZone: 'Asia/Kolkata'
            },
            reminders: {
                useDefault: false,
                overrides: [
                    { method: 'popup', minutes: 15 } // 15 minutes before
                ]
            },
            colorId: '9' // Blue color for study sessions
        };

        const response = await calendar.events.insert({
            calendarId: 'primary',
            resource: event
        });

        return response.data;
    } catch (error) {
        console.error('Error creating study session:', error);
        throw new Error('Failed to create study session on Google Calendar');
    }
};

/**
 * Create multiple study sessions for a study plan
 */
const createStudyPlanEvents = async (tokens, studyPlan) => {
    try {
        const createdEvents = [];

        // Create exam events for each subject
        for (const subject of studyPlan.subjects) {
            if (subject.examDate) {
                const examEvent = await createExamEvent(tokens, {
                    subject: subject.name,
                    examDate: subject.examDate
                });
                createdEvents.push(examEvent);
            }
        }

        return createdEvents;
    } catch (error) {
        console.error('Error creating study plan events:', error);
        throw error;
    }
};

/**
 * Delete events from Google Calendar by search query
 */
const deleteStudyPlanEvents = async (tokens, studyPlan) => {
    try {
        setCredentials(tokens);
        const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

        const deletedEvents = [];

        console.log('[Calendar] Starting deletion of study plan events...');

        // Delete exam events for each subject
        for (const subject of studyPlan.subjects) {
            try {
                console.log(`[Calendar] Searching for events: Exam: ${subject.name}`);
                
                // Get the exam date to narrow search
                const examDate = new Date(subject.examDate);
                const dayBefore = new Date(examDate);
                dayBefore.setDate(dayBefore.getDate() - 1);
                const dayAfter = new Date(examDate);
                dayAfter.setDate(dayAfter.getDate() + 2);
                
                // List all events around the exam date
                const response = await calendar.events.list({
                    calendarId: 'primary',
                    timeMin: dayBefore.toISOString(),
                    timeMax: dayAfter.toISOString(),
                    singleEvents: true,
                    orderBy: 'startTime'
                });

                const events = response.data.items || [];
                console.log(`[Calendar] Found ${events.length} events around ${subject.name} exam date`);
                
                // Delete matching events
                for (const event of events) {
                    if (event.summary && event.summary.includes(subject.name) && event.summary.includes('Exam')) {
                        console.log(`[Calendar] Deleting event: ${event.summary} (ID: ${event.id})`);
                        await calendar.events.delete({
                            calendarId: 'primary',
                            eventId: event.id
                        });
                        deletedEvents.push(event.id);
                        console.log(`[Calendar] Successfully deleted event: ${event.summary}`);
                    }
                }
            } catch (error) {
                console.error(`[Calendar] Error deleting events for ${subject.name}:`, error.message);
                // Continue with other subjects even if one fails
            }
        }

        console.log(`[Calendar] Deleted ${deletedEvents.length} events total`);
        return deletedEvents;
    } catch (error) {
        console.error('[Calendar] Error deleting study plan events:', error);
        throw error;
    }
};

module.exports = {
    getAuthUrl,
    getTokensFromCode,
    setCredentials,
    refreshAccessToken,
    createExamEvent,
    createStudySessionBlock,
    createStudyPlanEvents,
    deleteStudyPlanEvents
};
