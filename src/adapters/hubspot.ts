const BASE = "https://api.hubapi.com";
const headers = { Authorization: `Bearer ${process.env.HUBSPOT_TOKEN}`, "Content-Type": "application/json" };

export async function searchContactByEmail(email: string) {
  console.error(`[ReviewGate Debug] Querying HubSpot for email: ${email}`);
  
  const res = await fetch(`${BASE}/crm/v3/objects/contacts/${email}?idProperty=email&properties=email,firstname,lastname`, {
    method: "GET",
    headers,
  });

  console.error(`[ReviewGate Debug] HubSpot API HTTP Status: ${res.status}`);
  
  if (res.status === 404) {
    console.error(`[ReviewGate Debug] Contact explicitly not found (404) by HubSpot.`);
    return { results: [] }; 
  }
  
  const data = await res.json();
  console.error(`[ReviewGate Debug] HubSpot Raw Response: ${JSON.stringify(data)}`);
  
  return { results: [data] }; 
}

export async function getAssociatedDeals(contactId: string) {
  const res = await fetch(`${BASE}/crm/v3/objects/contacts/${contactId}/associations/deals`, { headers });
  console.error(`[ReviewGate Debug] HubSpot API HTTP Status: ${res.status}`);
  return res.json();
}

export async function associateNoteWithDeal(noteId: string, dealId: string) {
  const res = await fetch(`${BASE}/crm/v4/objects/notes/${noteId}/associations/deals/${dealId}`, {
    method: "PUT",
    headers,
  });
  return res.json();
}