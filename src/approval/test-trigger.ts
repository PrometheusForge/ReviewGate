import 'dotenv/config';
import { App } from '@slack/bolt';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);
const app = new App({ 
    token: process.env.SLACK_BOT_TOKEN,
    appToken: process.env.SLACK_APP_TOKEN,
    socketMode: true 
});

async function runTest() {
    console.log("Inserting test draft into Supabase...");
    
    // 1. Create a fake pending approval in the database
    const { data: row, error } = await supabase.from("pending_approvals")
        .insert({
            workflow: "Test Match Workflow",
            tool_name: "associateNoteWithDeal", // Matches your bot.ts logic
            input_payload: { noteId: "mock-note-123" },
            ai_draft: { noteId: "mock-note-123", dealId: "mock-deal-456", rationale: "AI is 99% confident." }
        }).select().single();

    if (error || !row) {
        return console.error("❌ Database Error:", error);
    }

    console.log("Database updated! Sending card to Slack...");

    // 2. Post the interactive message to Slack
    const msg = await app.client.chat.postMessage({
        channel: "C0BD5FV32G6",
        text: "New AI Draft for Approval",
        blocks: [
            { 
                type: "section", 
                text: { type: "mrkdwn", text: `*Test Match Workflow*\n\`\`\`${JSON.stringify(row.ai_draft, null, 2)}\`\`\`` } 
            },
            { 
                type: "actions", 
                elements: [
                    { 
                        type: "button", 
                        text: { type: "plain_text", text: "Approve" }, 
                        style: "primary", 
                        action_id: "approve_draft", 
                        value: row.id // This ID connects the button to the Supabase row
                    }
                ]
            },
        ],
    });

    // 3. Save the Slack message timestamp back to Supabase so the bot can update it later
    await supabase.from("pending_approvals").update({ slack_message_ts: msg.ts }).eq("id", row.id);
    
    console.log("✅ Test card sent! Check your Slack channel.");
}

runTest();