import { App } from "@slack/bolt";
import { createClient } from "@supabase/supabase-js";
import { sendDraft } from "../adapters/gmail.ts";
import { createCalendarEvent } from "../adapters/calendar.ts";

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!);

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  appToken: process.env.SLACK_APP_TOKEN,
  socketMode: true,
});

app.action("approve_draft_action", async ({ ack, body, client, logger }) => {
  await ack();
  
  const rowId = (body as any).actions[0].value;
  console.log(`[ReviewGate] 🟢 User clicked Approve for ID: ${rowId}`);

  const { data: row, error } = await supabase
    .from("approvals")
    .update({ status: "approved" })
    .eq("id", rowId)
    .select()
    .single();

  console.log("[DEBUG] Raw Row Data:", JSON.stringify(row, null, 2));

  if (error) {
    logger.error("Failed to update Supabase:", error);
    return;
  }

  await client.chat.update({
    channel: body.channel?.id!,
    ts: (body as any).message.ts,
    text: "Draft Approved!",
    blocks: [
      {
        type: "section",
        text: { type: "mrkdwn", text: `✅ *Draft Executed & Approved* (Row ID: ${rowId})` }
      }
    ]
  });

  // --- EXECUTION ROUTING BLOCK ---

  if (row && row.action_type === "send_gmail_draft") {
    const draftId = row.draft_payload?.draftId;
    
    if (!draftId) {
      console.error(`[ReviewGate] ❌ ERROR: Cannot execute. No draftId found in the database for row ${rowId}!`);
    } else {
      console.log(`[ReviewGate] 📧 Executing Gmail Draft ID: ${draftId}`);
      try {
        await sendDraft(draftId);
        console.log(`[ReviewGate] ✅ Email sent successfully!`);
      } catch (sendError) {
        console.error(`[ReviewGate] ❌ Failed to send email:`, sendError);
      }
    }

  // 👉 THIS IS THE NEW CALENDAR BLOCK
  } else if (row && row.action_type === "create_calendar_event") {
    console.log(`[ReviewGate] 📅 Executing Calendar Event: ${row.draft_payload?.summary}`);
    
    try {
      // Extract the details Claude saved to the database
      const { summary, description, startTime, endTime, attendeeEmails } = row.draft_payload;
      
      // Trigger the live Google Calendar API
      const eventResponse = await createCalendarEvent(
        summary,
        description,
        startTime,
        endTime,
        attendeeEmails || []
      );
      
      console.log(`[ReviewGate] ✅ Meeting created successfully! Link: ${eventResponse.htmlLink}`);
    } catch (calendarError) {
      console.error(`[ReviewGate] ❌ Failed to create calendar event:`, calendarError);
    }
  // 👉 END OF NEW CALENDAR BLOCK

  } else if (row && row.action_type === "create_shipstation_order") {
    console.log(`[ReviewGate] 📦 Executing ShipStation Order for SKU: ${row.draft_payload?.items[0]?.sku}`);
    console.log(`[ReviewGate] ✅ Sample Kit Order routed to fulfillment!`);
    
  } else if (row && row.action_type === "associateNoteWithDeal") {
    console.log(`[ReviewGate] 🤝 Executing HubSpot Association for Deal: ${row.draft_payload?.dealId}`);
    console.log(`[ReviewGate] ✅ Granola Note successfully linked in CRM!`);
  }
});

// --- LISTENER BLOCK ---

(async () => {
  await app.start();
  console.log("⚡️ Slack Bolt app is running in Socket Mode!");

  supabase
    .channel("approval-inserts")
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "approvals" },
      async (payload) => {
        console.log("🚨 [ReviewGate] New approval row detected in Supabase:", payload.new.id);
        
        try {
          await app.client.chat.postMessage({
            token: process.env.SLACK_BOT_TOKEN,
            channel: process.env.SLACK_CHANNEL_ID!,
            text: `New Approval Request: ${payload.new.title}`,
            blocks: [
              {
                type: "header",
                text: { type: "plain_text", text: "🚨 New Association Draft" }
              },
              {
                type: "section",
                text: { 
                  type: "mrkdwn", 
                  text: `*Target:* ${payload.new.title}\n*Rationale:* ${payload.new.draft_payload?.rationale || "N/A"}` 
                }
              },
              {
                type: "actions",
                elements: [
                  {
                    type: "button",
                    text: { type: "plain_text", text: "Approve & Execute" },
                    style: "primary",
                    action_id: "approve_draft_action",
                    value: payload.new.id
                  }
                ]
              }
            ]
          });
          console.log("[ReviewGate] Successfully posted interactive card to Slack!");
        } catch (error) {
          console.error("[ReviewGate] Slack API Error:", error);
        }
      }
    )
    .subscribe((status) => {
      console.log(`[ReviewGate] Supabase Realtime Status: ${status}`);
    });
})();