import { authenticate } from '@google-cloud/local-auth';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CREDENTIALS_PATH = path.join(__dirname, 'credentials.json');
const TOKEN_PATH = path.join(__dirname, 'token.json');

async function run() {
  console.log("Opening browser for Google Auth...");
  const client = await authenticate({
    scopes: [
      'https://www.googleapis.com/auth/gmail.compose', 
      'https://www.googleapis.com/auth/gmail.modify',
      'https://www.googleapis.com/auth/calendar.events'
    ],
    keyfilePath: CREDENTIALS_PATH,
  });
  
  if (client.credentials) {
    await fs.writeFile(TOKEN_PATH, JSON.stringify(client.credentials));
    console.log("✅ Token successfully saved to token.json! You can close this terminal.");
  }
}

run();