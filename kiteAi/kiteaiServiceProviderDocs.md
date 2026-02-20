# Kite Agent Passport — Service Provider Guide (Complete Reference)

> **Purpose:** A comprehensive guide for service providers to accept Kite Agent Passport payments from AI agents via the x402 protocol and facilitators.
> **Audience:** API service providers, backend developers integrating x402 payments
> **Protocol:** x402 (HTTP 402-based payment protocol)
> **Payment Scheme:** `gokite-aa` (Kite Account Abstraction)
> **Network:** `kite-testnet` (testnet) / Kite mainnet (production)

---

## 1. Overview

By integrating with Kite Agent Passport as a service provider, your service will be able to:

- Accept payments from AI agents on behalf of users
- Receive guaranteed, pre-authorized payments via the x402 protocol
- Access the growing market of agentic applications
- Work seamlessly with any x402-compatible facilitator

---

## 2. Prerequisites

Before you begin, ensure you have:

| Requirement | Description |
|---|---|
| API-callable service | A service that can be called via HTTP API |
| HTTP 402 understanding | Familiarity with HTTP 402 Payment Required responses |
| Service wallet address | A wallet address on Kite L1 testnet |

### 2.1 What You Do NOT Need to Build

| Component | Reason |
|---|---|
| Payment infrastructure | Kite facilitators handle on-chain execution |
| Wallet management | End users manage their own wallets via Kite Passport |
| Session / delegation systems | Kite Passport handles user authorizations |
| Redemption APIs | Payments go directly to your wallet address |

**Your only responsibility is implementing the x402 protocol to request and verify payments.**

---

## 3. Payment Flow Overview

### 3.1 Step-by-Step Flow

| Step | Actor | Action |
|---|---|---|
| 1 | Agent → Your Service | Agent calls your service API |
| 2 | Your Service → Agent | Your service returns **HTTP 402 Payment Required** with payment details |
| 3 | Agent → Kite MCP | Agent obtains a signed payment authorization from the user (via Kite MCP tools) |
| 4 | Agent → Your Service | Agent retries the request with the `X-Payment` header containing the signed payment token |
| 5 | Your Service → Facilitator | You verify the payment token and call the facilitator to execute the on-chain transfer |
| 6 | Facilitator → Blockchain | Facilitator executes the on-chain transfer to your payee address |
| 7 | Your Service → Agent | You deliver the service response after confirming payment |

### 3.2 Who Pays

In the current Kite Agent Passport flow:

- **End users** have their own Kite Passports with wallet balances
- Users authorize payments through their AI agents
- Users maintain their own sessions and spending rules
- **You (the service provider) receive payments directly to your wallet**

This is different from models where developers pay on behalf of users. In the Kite ecosystem, users control their own funds.

---

## 4. Sample Service: Weather API

Kite provides a reference Weather API to demonstrate the x402 protocol in action.

### 4.1 Sample Request (Without Payment)

```bash
curl https://x402.dev.gokite.ai/api/weather?location=San%20Francisco
```

### 4.2 Sample 402 Response

When called without a valid payment, the service returns HTTP 402 with the following JSON:

```json
{
  "error": "X-PAYMENT header is required",
  "accepts": [{
    "scheme": "gokite-aa",
    "network": "kite-testnet",
    "maxAmountRequired": "1000000000000000000",
    "resource": "https://localhost:8099/api/weather",
    "description": "Weather API - Public endpoint with query params",
    "mimeType": "application/json",
    "outputSchema": {
      "input": {
        "discoverable": true,
        "method": "GET",
        "queryParams": {
          "location": {
            "description": "City name or coordinates",
            "required": true,
            "type": "string"
          },
          "units": {
            "default": "metric",
            "enum": ["metric", "imperial"],
            "type": "string"
          }
        },
        "type": "http"
      },
      "output": {
        "properties": {
          "conditions": { "description": "Weather conditions", "type": "string" },
          "humidity": { "description": "Humidity percentage", "type": "number" },
          "temperature": { "description": "Current temperature", "type": "number" }
        },
        "required": ["temperature", "conditions"],
        "type": "object"
      }
    },
    "payTo": "0x4A50DCA63d541372ad36E5A36F1D542d51164F19",
    "maxTimeoutSeconds": 300,
    "asset": "0x0fF5393387ad2f9f691FD6Fd28e07E3969e27e63",
    "extra": null,
    "merchantName": "Weather Service"
  }],
  "x402Version": 1
}
```

### 4.3 Key 402 Response Fields

| Field | Type | Description | Example Value |
|---|---|---|---|
| `scheme` | string | Payment scheme to use | `"gokite-aa"` |
| `network` | string | Target blockchain network | `"kite-testnet"` |
| `maxAmountRequired` | string | Maximum payment amount in wei | `"1000000000000000000"` (= 1 token) |
| `asset` | string | Token contract address | `"0x0fF5393387ad2f9f691FD6Fd28e07E3969e27e63"` |
| `payTo` | string | Your service wallet address (payee) | `"0x4A50DCA63d541372ad36E5A36F1D542d51164F19"` |
| `maxTimeoutSeconds` | number | Payment timeout in seconds | `300` |
| `merchantName` | string | Your service display name | `"Weather Service"` |
| `resource` | string | The API endpoint resource URL | `"https://localhost:8099/api/weather"` |
| `description` | string | Human-readable service description | `"Weather API - Public endpoint with query params"` |
| `mimeType` | string | Response content type | `"application/json"` |
| `outputSchema` | object | API input/output specification | (see full JSON above) |
| `extra` | any | Optional extra data | `null` |
| `x402Version` | number | x402 protocol version (top-level) | `1` |

### 4.4 Understanding `outputSchema`

The `outputSchema` field describes your API's input and output so that AI agents can understand how to call your service and what to expect in return.

#### Input Schema

```json
{
  "discoverable": true,
  "method": "GET",
  "queryParams": {
    "location": { "description": "City name or coordinates", "required": true, "type": "string" },
    "units": { "default": "metric", "enum": ["metric", "imperial"], "type": "string" }
  },
  "type": "http"
}
```

| Field | Description |
|---|---|
| `discoverable` | Whether the service is publicly discoverable |
| `method` | HTTP method (GET, POST, etc.) |
| `queryParams` | Query parameter definitions with types and descriptions |
| `type` | Protocol type (`"http"`) |

#### Output Schema

```json
{
  "properties": {
    "conditions": { "description": "Weather conditions", "type": "string" },
    "humidity": { "description": "Humidity percentage", "type": "number" },
    "temperature": { "description": "Current temperature", "type": "number" }
  },
  "required": ["temperature", "conditions"],
  "type": "object"
}
```

| Field | Description |
|---|---|
| `properties` | Fields returned by the service with types and descriptions |
| `required` | Mandatory fields in the response |
| `type` | Response structure type (`"object"`) |

---

## 5. Kite Testnet Payment Token

For services to support Kite Testnet, you **must** use the following payment token:

| Property | Value |
|---|---|
| **Token Address** | `0x0fF5393387ad2f9f691FD6Fd28e07E3969e27e63` |
| **Token Name** | Test USDT (testnet stablecoin) |
| **Network** | Kite L1 Testnet |
| **Block Explorer** | https://testnet.kitescan.ai/token/0x0fF5393387ad2f9f691FD6Fd28e07E3969e27e63 |

This is the testnet stablecoin used for payments on Kite L1 Testnet. Use this exact address in your 402 response's `asset` field.

---

## 6. Kite Facilitator Support

Kite Agent Passport fully supports the x402 protocol and works with any x402-compatible facilitator.

### 6.1 Recommended: x402 Pieverse Facilitator

| Property | Value |
|---|---|
| **Service** | x402 Pieverse Facilitator |
| **Version** | 2.0.0 |
| **Base URL** | `https://facilitator.pieverse.io` |
| **Documentation** | https://facilitator.pieverse.io/ |

### 6.2 Kite Testnet Facilitator Address

```
0x12343e649e6b2b2b77649DFAb88f103c02F3C78b
```

### 6.3 Facilitator API Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/v2/verify` | POST | Verify payment signature |
| `/v2/settle` | POST | Settle payment (execute on-chain transfer) |

The facilitator handles the on-chain execution of payments. Once a payment is authorized, the facilitator executes the `transferWithAuthorization` call and transfers funds directly to your specified payee address.

### 6.4 Demo Facilitators (Reference Implementations)

Kite provides demo facilitators to clarify what is needed to support Kite payments:

| Resource | URL |
|---|---|
| **Demo Repository** | https://github.com/gokite-ai/x402 |

These reference implementations demonstrate how to enable x402 facilitation with Kite. Service providers can use these demos to understand the facilitator requirements and integration patterns.

---

## 7. Implementing x402 Support (4-Step Guide)

**Kite provides facilitator support for x402 payments. Implementing the x402 protocol on your service is YOUR responsibility.** This includes:

- Returning 402 Payment Required responses with the correct JSON format
- Verifying payment tokens when received from agents
- Managing your service wallet and received funds

### Step 1: Return 402 Payment Required Response

When your service receives a request without a valid payment, return a 402 status with payment details.

```json
{
  "error": "X-PAYMENT header is required",
  "accepts": [{
    "scheme": "gokite-aa",
    "network": "kite-testnet",
    "maxAmountRequired": "1000000000000000000",
    "resource": "https://your-service.com/api/endpoint",
    "description": "Your API - Description of your service",
    "mimeType": "application/json",
    "outputSchema": {
      "input": {
        "discoverable": true,
        "method": "GET",
        "queryParams": {
          "param1": {
            "description": "Parameter description",
            "required": true,
            "type": "string"
          }
        },
        "type": "http"
      },
      "output": {
        "properties": {
          "result": { "description": "Result description", "type": "string" }
        },
        "required": ["result"],
        "type": "object"
      }
    },
    "payTo": "0xYourServiceWalletAddress",
    "maxTimeoutSeconds": 300,
    "asset": "0x0fF5393387ad2f9f691FD6Fd28e07E3969e27e63",
    "extra": null,
    "merchantName": "Your Service Name"
  }],
  "x402Version": 1
}
```

**Checklist for your 402 response:**

- [ ] HTTP status code is `402`
- [ ] `scheme` is `"gokite-aa"`
- [ ] `network` is `"kite-testnet"` (testnet) or the appropriate mainnet value
- [ ] `asset` is the correct token contract address (`0x0fF5393387ad2f9f691FD6Fd28e07E3969e27e63` for testnet)
- [ ] `payTo` is your service's wallet address
- [ ] `maxAmountRequired` is the payment amount in wei (string)
- [ ] `outputSchema` accurately describes your API's input and output
- [ ] `x402Version` is `1`

### Step 2: Receive and Verify Payment Token

When the agent retries the request with the `X-PAYMENT` header, extract and verify it:

```bash
# Example request with payment
curl -H "X-PAYMENT: eyJhdXRob3JpemF0aW9uIjp7..." \
  https://your-service.com/api/endpoint
```

**Key details:**

- The `X-PAYMENT` header contains a **base64-encoded JSON object** with the payment authorization and signature
- You must decode and verify this token before delivering your service
- Use the facilitator's `/v2/verify` endpoint to validate the payment

### Step 3: Settle Payment via Facilitator

Call the facilitator's `/v2/settle` endpoint to execute the on-chain transfer:

```bash
curl -X POST https://facilitator.pieverse.io/v2/settle \
  -H "Content-Type: application/json" \
  -d '{
    "authorization": {...},
    "signature": "0x...",
    "network": "kite-testnet"
  }'
```

**Settle request fields:**

| Field | Type | Description |
|---|---|---|
| `authorization` | object | The authorization object extracted from the decoded X-PAYMENT token |
| `signature` | string | The signature extracted from the decoded X-PAYMENT token |
| `network` | string | The network identifier (e.g., `"kite-testnet"`) |

### Step 4: Deliver Your Service

After confirming payment settlement from the facilitator response, return your service's actual response to the agent.

### Payment Settlement Notes

- Payments are executed **on-chain** by the facilitator directly to your payee address
- Since you control the wallet address, you can transfer received tokens to any target address at any time
- No additional redemption APIs are needed — funds go directly to your wallet

---

## 8. Complete Implementation Flow (Pseudocode)

```javascript
async function handleRequest(req, res) {
  // 1. Check for X-PAYMENT header
  const paymentToken = req.headers['x-payment'];

  if (!paymentToken) {
    // 2. Return 402 Payment Required
    return res.status(402).json({
      error: "X-PAYMENT header is required",
      accepts: [{
        scheme: "gokite-aa",
        network: "kite-testnet",
        maxAmountRequired: "1000000000000000000",
        resource: "https://your-service.com/api/endpoint",
        description: "Your API - Description",
        mimeType: "application/json",
        outputSchema: { /* your input/output schema */ },
        payTo: "0xYourServiceWalletAddress",
        maxTimeoutSeconds: 300,
        asset: "0x0fF5393387ad2f9f691FD6Fd28e07E3969e27e63",
        extra: null,
        merchantName: "Your Service Name"
      }],
      x402Version: 1
    });
  }

  // 3. Decode the X-PAYMENT token (base64-encoded JSON)
  const decoded = JSON.parse(Buffer.from(paymentToken, 'base64').toString());
  const { authorization, signature } = decoded;

  // 4. Verify payment via facilitator
  const verifyRes = await fetch('https://facilitator.pieverse.io/v2/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ authorization, signature, network: 'kite-testnet' })
  });

  if (!verifyRes.ok) {
    return res.status(402).json({ error: "Payment verification failed" });
  }

  // 5. Settle payment via facilitator (execute on-chain)
  const settleRes = await fetch('https://facilitator.pieverse.io/v2/settle', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ authorization, signature, network: 'kite-testnet' })
  });

  if (!settleRes.ok) {
    return res.status(500).json({ error: "Payment settlement failed" });
  }

  // 6. Deliver your service
  const serviceResult = await performYourService(req);
  return res.status(200).json(serviceResult);
}
```

---

## 9. Key Addresses & Configuration Summary

| Item | Value |
|---|---|
| **Payment Scheme** | `gokite-aa` |
| **Testnet Network** | `kite-testnet` |
| **Testnet Token (Test USDT)** | `0x0fF5393387ad2f9f691FD6Fd28e07E3969e27e63` |
| **Testnet Facilitator Address** | `0x12343e649e6b2b2b77649DFAb88f103c02F3C78b` |
| **Pieverse Facilitator Base URL** | `https://facilitator.pieverse.io` |
| **Verify Endpoint** | `POST https://facilitator.pieverse.io/v2/verify` |
| **Settle Endpoint** | `POST https://facilitator.pieverse.io/v2/settle` |
| **Sample Weather API** | `https://x402.dev.gokite.ai/api/weather` |
| **x402 Protocol Version** | `1` |

---

## 10. Testing Your Integration

### 10.1 Test Setup

1. Set up a test user account in the [Kite Portal](https://x402-portal-eight.vercel.app/)
2. Fund the test account with testnet tokens from the [faucet](https://faucet.gokite.ai/)
3. Create a test agent and configure MCP in an AI client (e.g., Claude Desktop)
4. Have the AI client call your service
5. Verify your service returns the correct 402 response format
6. Confirm payment is processed and your service delivers the response

### 10.2 Test Scenarios

| Scenario | Expected Behavior |
|---|---|
| Request without `X-PAYMENT` header | Returns HTTP 402 with correct JSON payment details |
| Request with valid `X-PAYMENT` header | Payment verified → settled → service response delivered |
| Request with invalid/expired payment token | Payment verification fails → returns error |
| Request with insufficient funds | Facilitator reports insufficient balance |
| Facilitator settlement failure | Returns 500 with appropriate error message |

---

## 11. External Resources & Links

| Resource | URL |
|---|---|
| **x402 Protocol Specification** | https://docs.x402.org/introduction |
| **Pieverse Facilitator Docs** | https://facilitator.pieverse.io/ |
| **x402 Reference Implementation** | https://github.com/gokite-ai/x402 |
| **Kite Portal** | https://x402-portal-eight.vercel.app/ |
| **Testnet Faucet** | https://faucet.gokite.ai/ |
| **Testnet Token Explorer** | https://testnet.kitescan.ai/token/0x0fF5393387ad2f9f691FD6Fd28e07E3969e27e63 |
| **Developer Guide** | https://docs.gokite.ai/kite-agent-passport/developer-guide |
| **End User Guide** | https://docs.gokite.ai/kite-agent-passport/end-user-guide |
| **Testnet Notice** | https://docs.gokite.ai/kite-agent-passport/testnet-notice |
| **Issue Reporting** | https://github.com/gokite-ai/developer-docs/issues/new/choose |

---

## 12. Service Provider Development Checklist

### 402 Response Implementation
- [ ] Service returns HTTP 402 when no valid `X-PAYMENT` header is present
- [ ] `scheme` is set to `"gokite-aa"`
- [ ] `network` is set to `"kite-testnet"` (or appropriate mainnet value)
- [ ] `asset` is the correct token address: `0x0fF5393387ad2f9f691FD6Fd28e07E3969e27e63`
- [ ] `payTo` is set to your service's wallet address
- [ ] `maxAmountRequired` is correctly specified in wei (string format)
- [ ] `outputSchema` accurately describes API input parameters and output fields
- [ ] `merchantName` is set to your service's display name
- [ ] `x402Version` is `1`

### Payment Verification & Settlement
- [ ] `X-PAYMENT` header extraction implemented
- [ ] Base64 decoding of the payment token implemented
- [ ] `/v2/verify` call to Pieverse facilitator implemented
- [ ] `/v2/settle` call to Pieverse facilitator implemented
- [ ] Error handling for verification failure implemented
- [ ] Error handling for settlement failure implemented

### Wallet & Funds
- [ ] Service wallet address created on Kite L1 testnet
- [ ] Wallet address correctly set in the `payTo` field of 402 responses
- [ ] Ability to manage and transfer received tokens confirmed

### End-to-End Testing
- [ ] Test user account created in Kite Portal
- [ ] Test account funded with testnet tokens from faucet
- [ ] Test agent created and MCP configured in an AI client
- [ ] Full flow tested: request → 402 → payment → settle → service response
- [ ] Edge cases tested: no payment, invalid token, expired token, insufficient funds