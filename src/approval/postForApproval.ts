// src/approval/postForApproval.ts
import { createClient } from "@supabase/supabase-js";

// Initialize the client right here where it is being used
const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!);

export async function postForApproval(title: string, actionType: string, metadata: any, draftPayload: any) {
  console.error(`[ReviewGate Debug] Attempting to save draft to Supabase: ${title}`);
  
  // 1. Insert the draft into the database
  const { data, error } = await supabase
    .from("approvals") 
    .insert([{
      title,
      action_type: actionType,
      metadata,
      draft_payload: draftPayload,
      status: "pending"
    }])
    .select()
    .single();

  if (error) {
    console.error("[ReviewGate Debug] Supabase Insert Error:", error);
    throw new Error(`Supabase error: ${error.message}`);
  }

  console.error(`[ReviewGate Debug] Successfully saved to Supabase with ID: ${data.id}`);
  
  // 2. The Slack Socket Mode bot (running in your terminal) will detect this new row 
  // or you can add a direct Slack Webhook fetch call here if configured.
  
  return data;
}