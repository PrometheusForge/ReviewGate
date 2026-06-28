import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createDraft } from "../adapters/gmail.ts";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { searchContactByEmail, getAssociatedDeals } from "../adapters/hubspot.ts";
import { runMatchWorkflow } from "../workflows/granola-to-hubspot.ts";
import { draftSampleKitOrder } from "../adapters/shipstation.ts";
import { postForApproval } from "../approval/postForApproval.ts";
import { MockGranolaProvider } from "../adapters/granola.ts";

const server = new McpServer({ name: "reviewgate", version: "0.1.0" });

server.tool(
  "search_hubspot_contact",
  "Look up a HubSpot contact by email (read-only)",
  { email: z.string().email() },
  async ({ email }) => {
    try {
      const result = await searchContactByEmail(email);
      return { content: [{ type: "text", text: JSON.stringify(result) }] };
    } catch (error: any) {
      return { content: [{ type: "text", text: `HubSpot API Error: ${error.message}` }], isError: true };
    }
  }
);

server.tool(
  "get_associated_deals",
  "Get the deal IDs and details associated with a specific HubSpot contact ID",
  { contactId: z.string() },
  async ({ contactId }) => ({ content: [{ type: "text", text: JSON.stringify(await getAssociatedDeals(contactId)) }] })
);

server.tool(
  "propose_meeting_association",
  "Draft a match between a Granola meeting note and a HubSpot deal",
  { noteId: z.string(), dealId: z.string() },
  async ({ noteId, dealId }) => {
    const draft = await runMatchWorkflow(noteId, dealId);
    return { content: [{ type: "text", text: `Drafted and sent to Slack for human approval: ${JSON.stringify(draft)}` }] };
  }
);

server.tool(
  "propose_sample_kit",
  "Draft a shipping order for a physical sample kit. Requires human approval.",
  { dealId: z.string(), sku: z.string(), address: z.string() },
  async ({ dealId, sku, address }) => {
    const draft = await draftSampleKitOrder(dealId, sku, address);
    
    await postForApproval("Sample Kit Order", "create_shipstation_order", { dealId }, draft);
    
    return { content: [{ type: "text", text: `Drafted sample kit and sent to Slack for approval: ${JSON.stringify(draft)}` }] };
  }
);

server.tool(
  "propose_email_draft",
  "Draft an email to a client. Creates a live draft in Gmail and queues it in Slack for approval. Does NOT send the email.",
  { 
    to: z.string().email(), 
    subject: z.string(), 
    body: z.string() 
  },
  async ({ to, subject, body }) => {
    const draftResponse = await createDraft(to, subject, body);
    
    const actualDraftId = draftResponse.data.id;
    
    await postForApproval(
      `Email Follow-up: ${to}`, 
      "send_gmail_draft", 
      { to, subject }, 
      { draftId: actualDraftId, body }
    );
    
    return { 
      content: [{ 
        type: "text", 
        text: `Draft created successfully in Gmail (ID: ${actualDraftId}) and sent to Slack for human approval.` 
      }] 
    };
  }
);

server.tool(
  "read_granola_note",
  "Read the full details and transcript of a Granola meeting note.",
  { noteId: z.string() },
  async ({ noteId }) => {
    const provider = new MockGranolaProvider();
    const note = await provider.getNote(noteId);
    return { content: [{ type: "text", text: JSON.stringify(note) }] };
  }
);

server.tool(
  "propose_calendar_event",
  "Propose a Google Calendar meeting. Pushes the meeting details to Slack for human approval. Does NOT create the event immediately.",
  { 
    summary: z.string().describe("The title of the meeting"), 
    description: z.string().describe("The agenda or details of the meeting"), 
    startTime: z.string().describe("ISO string format for start time (e.g., '2026-06-28T09:00:00')"),
    endTime: z.string().describe("ISO string format for end time (e.g., '2026-06-28T10:00:00')"),
    attendeeEmails: z.array(z.string().email()).describe("List of emails to invite")
  },
  async ({ summary, description, startTime, endTime, attendeeEmails }) => {
    
    // Push the raw meeting data straight to the Slack gateway for approval
    await postForApproval(
      `Meeting Request: ${summary}`, 
      "create_calendar_event", 
      { summary, startTime }, // Metadata for the Slack card
      { summary, description, startTime, endTime, attendeeEmails } // Full payload for execution
    );
    
    return { 
      content: [{ 
        type: "text", 
        text: `Calendar event "${summary}" successfully queued in Slack for human approval.` 
      }] 
    };
  }
);

async function startServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("ReviewGate MCP Server running on stdio");
}

startServer();