import { google } from "googleapis";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const credentialsPath = path.join(__dirname, "../../credentials.json");
const tokenPath = path.join(__dirname, "../../token.json");

let gmailClient: any = null;

function getGmailClient() {
  if (gmailClient) return gmailClient;
  
  try {
    const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
    const { client_secret, client_id, redirect_uris } = credentials.installed || credentials.web;
    const auth = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

    const token = JSON.parse(fs.readFileSync(tokenPath, 'utf8'));
    auth.setCredentials(token);

    gmailClient = google.gmail({ version: 'v1', auth });
    return gmailClient;
  } catch (error: any) {
    console.error("[ReviewGate] Gmail Auth Error:", error.message);
    throw new Error(`Gmail setup failed. Please ensure credentials.json and token.json are in the root folder. Error: ${error.message}`);
  }
}

function encodeRfc822(to: string, subject: string, body: string) {
  const message = `To: ${to}\nSubject: ${subject}\n\n${body}`;
  return Buffer.from(message).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function createDraft(to: string, subject: string, body: string) {
  const gmail = getGmailClient();
  return gmail.users.drafts.create({
    userId: "me",
    requestBody: { message: { raw: encodeRfc822(to, subject, body) } },
  });
}

export async function sendDraft(draftId: string) {
  const gmail = getGmailClient();
  return gmail.users.drafts.send({ userId: "me", requestBody: { id: draftId } });
}