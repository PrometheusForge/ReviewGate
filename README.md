# ReviewGate: Enterprise Human-in-the-Loop (HITL) AI Automation Gateway

![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Slack API](https://img.shields.io/badge/Slack-4A154B?style=for-the-badge&logo=slack&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)
![Google Cloud](https://img.shields.io/badge/Google_Cloud-4285F4?style=for-the-badge&logo=google-cloud&logoColor=white)

## 📌 Executive Summary
**ReviewGate** is a custom integration architecture designed to bridge the gap between autonomous AI agents—specifically **Anthropic's Claude**—and secure business operations. It utilizes the newly released Model Context Protocol (MCP) to allow Claude to draft operational actions, which are then routed to a secure Slack gateway for human approval before execution.

This ensures businesses can leverage the advanced reasoning and speed of Claude while maintaining absolute zero-trust control over client communications, calendar scheduling, CRM updates, and physical fulfillment.

<img width="725" height="942" alt="Screenshot 2026-08-02 134958" src="https://github.com/user-attachments/assets/590fa08c-e4d3-491e-a83e-ef52660ccaee" />

<img width="1676" height="642" alt="Screenshot 2026-06-26 134610" src="https://github.com/user-attachments/assets/4327d84b-57dd-4da3-b6cc-51059775c953" />

<img width="1805" height="688" alt="Screenshot 2026-06-28 055230" src="https://github.com/user-attachments/assets/4ccab14a-baea-4ffc-aaa3-f37b5eb51230" />

<img width="1046" height="557" alt="Screenshot 2026-06-28 181342" src="https://github.com/user-attachments/assets/fbe87d36-bac9-4228-aff4-940478d49f5b" />

<img width="707" height="946" alt="Screenshot 2026-08-02 134550" src="https://github.com/user-attachments/assets/41eb3021-69b3-4cc2-b2a1-fc081addbea0" />

## Core Architecture

1. **The AI Brain (Claude via MCP):** Claude acts as the autonomous reasoning engine. It processes natural language prompts, interacts with local context, and formats operational execution requests (e.g., drafting emails, proposing meetings, structuring CRM updates).
2. **The Security Database (Supabase):** Acts as the immutable ledger. All actions proposed by Claude are safely caged here in a `pending` state.
3. **The Human Gateway (Slack Bolt API):** Listens for new database entries and pushes interactive approval cards to a dedicated Slack channel. 
4. **The Execution Layer:** Upon clicking "Approve" in Slack, the system triggers live API calls (e.g., Google OAuth 2.0 for Gmail and Calendar) or fires webhooks out to orchestration platforms like n8n or Make for complex routing.

## System Design & Technical Highlights

This system is built for high scalability, asynchronous execution, and enterprise security.

* **Event-Driven WebSockets:** Utilizes Supabase Realtime (Postgres WAL) to push database mutations to the Slack Bolt app in milliseconds, ensuring zero UI latency.
* **Multi-Scope OAuth 2.0 Implementation:** Features a custom, hardcoded Google APIs adapter with secure token generation, offline access routing, and dynamic client instantiation for interacting natively with both the Gmail and Google Calendar APIs.
* **Decoupled Execution:** Highly sensitive actions are executed natively via backend TypeScript adapters, while peripheral actions are structured as JSON payloads and dispatched via HTTP webhooks to external orchestration tools.
* **Robust Error Handling:** Implements lazy initialization for file system reads and strict payload validation to prevent Node.js thread crashes on missing database IDs or network failures.

## Features

* **Zero-Rogue AI:** Claude physically cannot send an email, book a meeting, or alter a CRM without a human clicking "Approve" in Slack.
* **Live OAuth 2.0 Gmail Integration:** Drafts emails directly into a live inbox and executes sending natively via Google APIs.
* **Secure Automated Scheduling:** Claude parses meeting intents, drafts the agenda, and securely executes Google Calendar event creation and invite dispatch upon human approval.
* **Webhook Extensibility:** Easily routes approved JSON payloads to external workflow builders to trigger actions in HubSpot, ShipStation, GoHighLevel, or other platforms.
* **Real-time Synchronization:** Utilizes Supabase Realtime to push approval cards to Slack milliseconds after Claude proposes them.

## Local Development Setup

### Prerequisites
* Node.js (v18+)
* A Supabase Project
* A Slack App (with Socket Mode enabled)
* Google Cloud Console Project (with Gmail & Google Calendar APIs enabled)
* Claude Desktop (for the MCP Client)

## 2. Install Dependencies
### Clone the repository
git clone [https://github.com/your-username/reviewgate.git](https://github.com/your-username/reviewgate.git)
cd reviewgate
