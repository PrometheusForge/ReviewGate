import { google } from "googleapis";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const credentialsPath = path.join(__dirname, "../../credentials.json");
const tokenPath = path.join(__dirname, "../../token.json");

let calendarClient: any = null;

// Lazy initialization: Only read the files when the calendar tool is actually executed
function getCalendarClient() {
  if (calendarClient) return calendarClient;
  
  try {
    const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
    const { client_secret, client_id, redirect_uris } = credentials.installed || credentials.web;
    const auth = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

    const token = JSON.parse(fs.readFileSync(tokenPath, 'utf8'));
    auth.setCredentials(token);

    calendarClient = google.calendar({ version: 'v3', auth });
    return calendarClient;
  } catch (error: any) {
    console.error("[ReviewGate] Calendar Auth Error:", error.message);
    throw new Error(`Calendar setup failed. Please ensure credentials.json and token.json are in the root folder. Error: ${error.message}`);
  }
}

/**
 * Creates a new event in the primary Google Calendar.
 * 
 * @param summary Title of the meeting.
 * @param description Details or agenda for the meeting.
 * @param startTime ISO string format (e.g., '2026-06-28T09:00:00')
 * @param endTime ISO string format (e.g., '2026-06-28T10:00:00')
 * @param attendeeEmails Array of email addresses to invite.
 */
export async function createCalendarEvent(
  summary: string, 
  description: string, 
  startTime: string, 
  endTime: string, 
  attendeeEmails: string[] = []
) {
  const calendar = getCalendarClient();
  
  const event = {
    summary: summary,
    description: description,
    start: {
      dateTime: startTime,
      timeZone: 'Africa/Lagos', // Automatically locks to your local timezone
    },
    end: {
      dateTime: endTime,
      timeZone: 'Africa/Lagos',
    },
    attendees: attendeeEmails.map(email => ({ email })),
  };

  try {
    const response = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: event,
      sendUpdates: 'all', // This tells Google to automatically email the invites to the attendees
    });
    return response.data;
  } catch (error: any) {
    console.error("[ReviewGate] Failed to create calendar event:", error.message);
    throw error;
  }
}