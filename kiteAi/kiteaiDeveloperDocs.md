# Kite Agent Passport — Developer Guide (Complete Reference)

> **Purpose:** A comprehensive guide for developers building AI agent applications to implement secure payments through Kite Agent Passport.
> **Audience:** AI agent developers, MCP integration developers
> **Protocol:** x402 (HTTP 402-based payment protocol)
> **Authentication:** OAuth + MCP (Model Context Protocol)

---

## 1. Overview

Kite Agent Passport is a system that enables AI agents to make secure payments to service providers. The core mechanism is the **x402 protocol**: when a service returns an HTTP 402 (Payment Required) response, the agent uses Kite MCP tools to authorize the payment and retry the request with a signed payment header.

---

## 2. Developer Work Modes

Kite Agent Passport supports three developer work modes, each with different levels of integration.

### 2.1 Mode 1: Client Agent with MCP ✅ (Fully Supported)

- **Status:** Fully Supported
- **Description:** You build an AI client application that supports MCP integration. End users register their own Kite Passport accounts and configure them into your application via MCP.
- **Integration Path:** MCP (Model Context Protocol) + OAuth
- **Sample Agents:** Cursor (IDE), Claude Desktop
- **User Responsibilities:**
  - Register their own Kite Passport account
  - Create an Agent in the Kite Portal (self-service UI)
  - Configure the MCP connection in the developer's application
  - Authorize payment sessions with their own wallet

### 2.2 Mode 2: Developer as End User 🚧 (Coming Soon)

- **Status:** Coming Soon
- **Description:** You create a client agent and register your own Kite Passport. Your customers use x402 services **without needing their own Kite Passport**. You pay for services on behalf of customers and charge them through your own billing (e.g., subscription fees).
- **Key Point:** This is the **only mode** where end users do NOT need a Kite Passport. You (the developer) are the sole Kite Passport holder and pay for all customer usage.
- **Integration Path:** SDK/API (in development)
- **Sample Use Cases:** Aggregator apps, SaaS platforms that want to bundle service costs into pricing

### 2.3 Mode 3: Deep Platform Integration 🚧 (Coming Soon)

- **Status:** Coming Soon
- **Description:** You build a full-featured application that manages the complete Kite Passport lifecycle programmatically for your customers. Unlike Mode 1 where users self-serve through the Portal, you control the entire setup via APIs.
- **How It Works:**
  1. **Create Client Agent via API** — Programmatically create an agent for the user
  2. **Create Session via API** — Set up a session with spending rules via API
  3. **Register Session On-Chain via SDK** — Register the session on the blockchain using a blockchain SDK
  4. **Connect to MCP + OAuth** — After setup, users connect via MCP with OAuth authentication
  5. **Configuration Complete** — Users can now make payments through your managed infrastructure
- **Key Points:**
  - End users still need to register their own Kite Passport accounts and maintain wallet balance
  - You manage the technical infrastructure (agent creation, session setup, on-chain registration)
  - Users benefit from a seamless, configured experience without manual Portal setup
  - You do NOT pay on behalf of users — they control their own funds
- **Integration Path:** Complete REST API + Blockchain SDK (in development)
- **Sample Use Cases:** Enterprise platforms, white-label agent marketplaces, apps requiring programmatic session management, managed service providers

---

## 3. Building with Mode 1 (In Detail)

### 3.1 What You Need to Build

In Mode 1, your AI application must support the following:

- **MCP (Model Context Protocol) connections**
- A UI for users to **add/manage external MCP server configurations** (such as Kite)
- **Routing payment requests** to MCP tools provided by Kite
- **OAuth authentication handling** when connecting MCP servers

### 3.2 Prerequisites

Your application must have the following capabilities before integration:

| Requirement | Description |
|---|---|
| MCP client support | Ability to communicate with external servers via the MCP protocol |
| OAuth handling capability | Ability to handle the OAuth authentication flow for MCP connections |
| MCP server configuration UI | An interface where users can add and manage MCP server settings |

---

## 4. How It Works

### 4.1 User Flow (Mode 1)

#### Phase 1: Setup
1. User visits the **Kite Portal** and creates a Kite Passport
2. User creates an **Agent** in the Portal (receives an Agent ID)
3. User copies the **MCP configuration** from the Portal

#### Phase 2: Configuration
4. User adds the **Kite MCP configuration** to your application
5. User **authenticates via OAuth** when prompted
6. If no session exists, user **creates a session with spending limits**

#### Phase 3: Payment
7. Your agent calls an **x402 service** that requires payment
8. The service returns **HTTP 402 Payment Required**
9. Your agent calls **Kite MCP tools** to get payment authorization
10. **Payment is executed** within the user's authorized session

> **Note:** This is the Mode 1 (self-serve) flow. In Mode 3, you would handle agent creation, session setup, and on-chain registration via APIs/SDK before the user connects via MCP.

---

## 5. MCP Server Configuration

Users configure the Kite MCP server in your application with the following settings:

```json
{
  "kite-passport-mcp": {
    "url": "https://neo.dev.gokite.ai/v1/mcp"
  }
}
```

> **Note:** The MCP URL may include an Agent ID or authentication token, which the user obtains from the Kite Portal.

---

## 6. MCP Tools Reference

The Kite MCP server provides **two primary tools** for payment operations.

### 6.1 Tool: `get_payer_addr`

Retrieves the user's Account Abstraction (AA) wallet address.

- **Input:** None (no parameters required)
- **Output:**

| Field | Type | Description |
|---|---|---|
| `payer_addr` | string | User's AA wallet address |

**Code Example:**

```javascript
const result = await mcpClient.callTool('get_payer_addr', {});
// Returns: { "payer_addr": "0x742d35Cc..." }
```

### 6.2 Tool: `approve_payment`

Creates a signed X-Payment payload for the X402 protocol.

- **Input:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `payer_addr` | string | Yes | User's AA wallet address |
| `payee_addr` | string | Yes | Service provider's wallet address |
| `amount` | string | Yes | Payment amount in token units |
| `token_type` | string | Yes | Token identifier (e.g., `"USDC"`) |
| `merchant_name` | string | No | Optional merchant name |

- **Output:** A signed payload for the `X-Payment` HTTP header (the `x_payment` field within the authorization object)

**Code Example:**

```javascript
const result = await mcpClient.callTool('approve_payment', {
  payer_addr: "0x742d35Cc...",
  payee_addr: "0x209693Bc...",
  amount: "100",
  token_type: "USDC"
});

// Returns authorization object with x_payment field for header
```

---

## 7. Complete Payment Flow Example

Below is the full code example for calling an x402 service and handling the payment:

```javascript
async function callX402Service(serviceUrl, requestData) {
  // 1. Call the service (may return 402 Payment Required)
  let response = await fetch(serviceUrl, {
    method: 'POST',
    body: JSON.stringify(requestData)
  });

  // 2. Handle 402 response
  if (response.status === 402) {
    const paymentInfo = await response.json();
    
    // 3. Get payer address
    const payer = await mcpClient.callTool('get_payer_addr', {});
    
    // 4. Approve payment
    const auth = await mcpClient.callTool('approve_payment', {
      payer_addr: payer.payer_addr,
      payee_addr: paymentInfo.payee_addr,
      amount: paymentInfo.amount,
      token_type: paymentInfo.token_type
    });

    // 5. Retry with payment header
    response = await fetch(serviceUrl, {
      method: 'POST',
      headers: { 'X-Payment': auth.x_payment },
      body: JSON.stringify(requestData)
    });
  }

  return await response.json();
}
```

### 7.1 Payment Flow Step-by-Step Summary

| Step | Action | Description |
|---|---|---|
| 1 | `fetch(serviceUrl, ...)` | Initial request to the x402 service |
| 2 | Check `response.status === 402` | Determine if the service requires payment |
| 3 | `mcpClient.callTool('get_payer_addr', {})` | Retrieve the user's AA wallet address |
| 4 | `mcpClient.callTool('approve_payment', {...})` | Generate a signed payload with payment details |
| 5 | `fetch(serviceUrl, { headers: { 'X-Payment': auth.x_payment } })` | Retry the service call with the signed payment header |

---

## 8. Session Management

### 8.1 Key Concepts

| Concept | Description |
|---|---|
| **Agent ID** | A unique identifier created in the Kite Portal |
| **Session** | A time-bounded authorization with spending limits |
| **OAuth** | Authentication mechanism for MCP server connections |

### 8.2 Session Behavior Rules

- Each agent can have **at most one active session** at a time.
- Sessions have **budget limits** and **expiration times**.
- When a session expires, users must **re-authenticate and create a new session**.
- Users can **invalidate sessions** from the Kite Portal.

### 8.3 Error Handling

| Error | Cause | Solution |
|---|---|---|
| `session_creation_required` | No valid session exists | User must complete the OAuth flow and create a session |
| `SessionExpired` | Session time limit reached | Re-authenticate and create a new session |
| `InsufficientBudget` | Payment exceeds session limits | Create a new session with higher limits |
| `Unauthorized` | OAuth token expired | Re-initiate the OAuth flow |

---

## 9. Security Best Practices

1. **Store MCP configurations securely** — Never log API keys or tokens.
2. **Validate the OAuth state parameter** — Prevent CSRF attacks.
3. **Handle session expiration gracefully** — Prompt users to re-authenticate.
4. **Do not cache sensitive data** — Payer addresses and auth data should always be fetched fresh.

---

## 10. Testing Your Integration

### 10.1 Testnet Setup

1. Create a test account at the Kite Portal (testnet instance)
2. Get test tokens from the faucet
3. Create a test agent in the Portal
4. Configure the test MCP in your application

### 10.2 Test Scenarios

| Scenario | Expected Behavior |
|---|---|
| First-time connection | OAuth flow → Session creation → Tools available |
| Payment with valid session | Payment executes successfully |
| Payment without session | Error returned, user prompted to authenticate |
| Session expiration | Re-authentication required |

---

## 11. Troubleshooting

| Issue | Solution |
|---|---|
| `"Agent not found"` | Verify Agent ID in the Kite Portal |
| `"Session creation required"` | Complete the OAuth flow in your app |
| `"Unauthorized"` | Re-connect the MCP server |
| `"Payment failed"` | Verify the service supports the x402 protocol |

---

## 12. External Resources & Links

| Resource | URL |
|---|---|
| **Kite Portal** | https://x402-portal-eight.vercel.app/ |
| **MCP Protocol Specification** | https://modelcontextprotocol.io/ |
| **x402 Demo Facilitators** | https://github.com/gokite-ai/x402 |
| **Testnet Notice** | https://docs.gokite.ai/kite-agent-passport/testnet-notice |
| **End User Guide** | https://docs.gokite.ai/kite-agent-passport/end-user-guide |
| **Service Provider Guide** | https://docs.gokite.ai/kite-agent-passport/service-provider-guide |
| **Issue Reporting** | https://github.com/gokite-ai/developer-docs/issues/new/choose |

---

## 13. Mode Comparison Summary

| Item | Mode 1 (MCP) ✅ | Mode 2 (Dev as User) 🚧 | Mode 3 (Deep Integration) 🚧 |
|---|---|---|---|
| **Status** | Fully Supported | Coming Soon | Coming Soon |
| **End User Kite Passport Required** | ✅ Yes | ❌ No | ✅ Yes |
| **Who Pays** | End User | Developer | End User |
| **Agent Creation** | User via Portal | Developer directly | Developer via API |
| **Session Creation** | User via OAuth | Developer manages | Developer via API |
| **On-Chain Registration** | Automatic (Portal) | Developer manages | Developer via SDK |
| **Integration Path** | MCP + OAuth | SDK/API | REST API + Blockchain SDK |
| **Target Use Cases** | Cursor, Claude Desktop, etc. | SaaS, Aggregators | Enterprise, White-label |

---

## 14. Development Checklist

### Environment Setup
- [ ] MCP client library configured and ready
- [ ] OAuth authentication flow implemented
- [ ] MCP server configuration UI implemented

### Kite Integration
- [ ] Kite MCP server URL configured: `https://neo.dev.gokite.ai/v1/mcp`
- [ ] `get_payer_addr` tool call implemented
- [ ] `approve_payment` tool call implemented
- [ ] HTTP 402 response detection and payment flow wired up

### Session Management
- [ ] Re-authentication flow on session expiration implemented
- [ ] `InsufficientBudget` error handling implemented
- [ ] `Unauthorized` (OAuth token expiry) handling implemented

### Security
- [ ] Secure storage of MCP configurations verified
- [ ] OAuth state parameter validation implemented
- [ ] Sensitive data caching prevention verified
- [ ] API key / token logging prevention verified

### Testing
- [ ] Testnet account and test tokens prepared
- [ ] First connection → OAuth → session creation flow tested
- [ ] Successful payment with valid session tested
- [ ] No session / expired session / budget exceeded error flows tested
- [ ] Full E2E payment flow with x402 service tested