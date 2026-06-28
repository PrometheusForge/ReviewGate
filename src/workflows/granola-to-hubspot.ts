// src/workflows/granola-to-hubspot.ts
import { searchContactByEmail, getAssociatedDeals } from '../adapters/hubspot.ts';
import { generateMatch, buildMatchPrompt } from '../adapters/ai.ts';
import { createClient } from '@supabase/supabase-js';
import { MockGranolaProvider } from "../adapters/granola.ts";
import { postForApproval } from "../approval/postForApproval.ts";

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!);

export async function runMatchWorkflow(noteId: string, dealId: string) {
  const provider = new MockGranolaProvider();
  const note = await provider.getNote(noteId);
  
  // Simulated AI match payload
  const draft = {
    noteId: note.id,
    dealId: dealId,
    confidence: 0.95,
    rationale: `Found strong topic overlap in meeting: ${note.title}`
  };

  // Push to Slack (Requires Phase 3 Slack bot and Supabase to be configured)
  await postForApproval("Meeting Association", "associateNoteWithDeal", { noteId }, draft);
  
  return draft;
}

// Helper for the MCP Server: Drafts a match for a single note, but does NOT execute side effects
export async function draftSingleNoteMatch(noteId: string) {
    const provider = new MockGranolaProvider();
    const note = await provider.getNote(noteId); // Fixed: Use the correct provider instance method instead of undefined function

    if (!note) throw new Error(`Note ${noteId} not found.`);

    // Convert transcript object array into a single searchable string block for the regex engine
    const fullTranscriptText = note.transcript.map(line => line.text).join(" ");
    
    // Extract emails cleanly from the string text
    const emails = fullTranscriptText.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/gi) || [];
    
    // Gather CRM Context
    let candidates = [];
    if (emails[0]) {
        const contact = await searchContactByEmail(emails[0]);
        if (contact.results?.length > 0) {
            const deals = await getAssociatedDeals(contact.results[0].id);
            candidates = deals.results || [];
        }
    }

    // Generate and return the draft
    const prompt = buildMatchPrompt(note.summary, candidates);
    return await generateMatch(prompt); 
}