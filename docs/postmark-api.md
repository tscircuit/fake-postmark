# Postmark API – Essential Features (May 2025)

> A developer-oriented overview of everything you need to know to start **sending, receiving, tracking, and managing email** with Postmark’s REST API.

---

## Table of Contents

- [Postmark API – Essential Features (May 2025)](#postmark-api--essential-features-may-2025)
  - [Table of Contents](#table-of-contents)
  - [Core Concepts](#core-concepts)
  - [Authentication \& Security](#authentication--security)
  - [Email Sending API](#email-sending-api)
    - [Endpoints](#endpoints)
  - [Template \& Layout API](#template--layout-api)
  - [Message Streams](#message-streams)
  - [Inbound Email Processing](#inbound-email-processing)
  - [Webhooks](#webhooks)
  - [Bounce \& Suppression Management](#bounce--suppression-management)
  - [Domain \& DNS Management](#domain--dns-management)
  - [Statistics \& Message Search](#statistics--message-search)
  - [Rate Limits, Errors \& Retries](#rate-limits-errors--retries)
  - [Official Libraries \& SDKs](#official-libraries--sdks)
  - [Recent Additions \& Road-map Highlights](#recent-additions--road-map-highlights)
  - [Best Practices Checklist](#best-practices-checklist)
    - [Quick-Reference Endpoint Map](#quick-reference-endpoint-map)
  - [Final Notes](#final-notes)

---

## Core Concepts

Postmark separates email traffic by **Servers** (logical containers) and by **Message Streams** inside each server. Three stream types exist:

| Type              | Purpose                                                      | SMTP Host / API Header                             |
| ----------------- | ------------------------------------------------------------ | -------------------------------------------------- |
| **Transactional** | Receipts, password resets, notices                           | `smtp.postmarkapp.com` / `"outbound"`              |
| **Broadcast**     | Bulk or marketing messages (requires unsubscribe management) | `smtp-broadcasts.postmarkapp.com` / `"broadcasts"` |
| **Inbound**       | Parsing mail you receive                                     | N/A – webhooks only                                |

Broadcast streams enforce unsubscribe handling, while transactional and inbound streams default to none.&#x20;

---

## Authentication & Security

- **Server API token** (`X-Postmark-Server-Token`) – scopes calls to a single server.
- **Account API token** – manage servers, domains, users.
- **SMTP tokens** – alternative credentials tied to a single message stream.
  All endpoints require HTTPS/TLS; tokens are passed only in **HTTP headers**, never in the query string. ([postmarkapp.com][1])

---

## Email Sending API

### Endpoints

| Endpoint       | Method | Notes                                                 |
| -------------- | ------ | ----------------------------------------------------- |
| `/email`       | `POST` | Send **one** message.                                 |
| `/email/batch` | `POST` | Up to **500** messages or **50 MB** payload per call. |

```jsonc
POST /email
Headers:
  Content-Type: application/json
  X-Postmark-Server-Token: YOUR_SERVER_TOKEN
Body:
{
  "From": "invoice@example.com",
  "To": "customer@example.com",
  "Subject": "Your receipt",
  "HtmlBody": "<h1>Thanks!</h1>",
  "MessageStream": "outbound",
  "Tag": "invoice",
  "Metadata": { "order-id": 1234 },
  "Attachments": [
    { "Name": "receipt.pdf", "Content": "BASE64==", "ContentType": "application/pdf" }
  ]
}
```

Special features:

- **Tags** & **Metadata** for searching and analytics.
- **CC/BCC**, **Reply-To**, and inline CID attachments.
- Set `TrackOpens` / `TrackLinks`.

---

## Template & Layout API

Manage up to **100 templates per server** (create, list, edit, delete, validate) and send with either a **template ID** or **alias**.

```jsonc
POST /email/withTemplate
{
  "TemplateAlias": "welcome-email",
  "TemplateModel": {
    "name": "Seve",
    "cta_link": "https://example.com/login"
  },
  "MessageStream": "outbound"
}
```

Layout templates let you wrap multiple standard templates with shared headers, footers, and CSS. ([postmarkapp.com][2], [postmarkapp.com][3])

---

## Message Streams

- Include `MessageStream` field (API) or `X-PM-Message-Stream` header (SMTP) to route mail.
- **Broadcast** streams add automatic unsubscribe links and distinct SMTP host.
- Create, archive, or configure streams through the **Message Streams API**.&#x20;

---

## Inbound Email Processing

- Point an MX record (or sub-address) at Postmark and choose an **Inbound stream**.
- Postmark parses the raw MIME and POSTs JSON to your **Inbound webhook** with fields like `FromFull`, `Subject`, `HtmlBody`, `Attachments`.
- The raw message is retrievable later via the **Messages API** for auditing.&#x20;

---

## Webhooks

| Webhook             | Payload Highlights                       | Retry Schedule\*                                              |
| ------------------- | ---------------------------------------- | ------------------------------------------------------------- |
| Bounce              | `MessageID`, `BounceType`, `Description` | 1 min → 5 min → 10 min ×3 → 15 min → 30 min → 1 h → 2 h → 6 h |
| Spam Complaint      | same as Bounce plus `CanActivate`        | same                                                          |
| Delivery            | `DeliveredAt`, `Details`                 | 1 min → 5 min → 15 min                                        |
| Open / Click        | `Recipient`, `Client`, `Platform`, `Geo` | 1 min → 5 min → 15 min                                        |
| Subscription Change | list/unsubscribe events                  | 1 min → 5 min → 15 min                                        |
| Inbound             | parsed email & attachments               | same as Bounce                                                |

\* Retries stop on the first `HTTP 200`; a `403` permanently suppresses further attempts.&#x20;

---

## Bounce & Suppression Management

- **Bounce API** – query, reactivate, or dump the full bounce message.
- **Bounce classifications** (HardBounce, SoftBounce, AutoResponder, Transient, SpamNotification, etc.) help automate workflows.
- Reactivating clears the address from the suppression list.&#x20;

---

## Domain & DNS Management

The **Domains API** lets you add, verify, list, and delete sender domains.

```jsonc
GET /domains/{id}
Response → {
  "Name": "example.com",
  "DKIMVerified": true,
  "DKIMHost": "201804021337pm._domainkey",
  "DKIMTextValue": "k=rsa; p=MIGfMA0G...",
  "ReturnPathDomainVerified": true
}
```

Key points:

- Postmark generates a 1024-bit (or stronger) **DKIM** record and optional SPF.
- You may request a **new DKIM** key or set a **custom Return-Path**.
- Verifying DKIM & DMARC is essential for Gmail/Yahoo 2024 sender requirements.&#x20;

---

## Statistics & Message Search

- Per-stream metrics: sent, delivered, opened, clicked, bounced, spam complaints.
- **Outbound & Inbound Message Search** endpoints support filtering by date range, tag, metadata, and recipient.
- Drill into a single message (`/messages/outbound/{id}`) to inspect headers, tracking events, and raw MIME. ([postmarkapp.com][4], [docs.celigo.com][5])

---

## Rate Limits, Errors & Retries

- **HTTP 200** OK for success; **422** for validation issues; **401/403** for auth; **500** on Postmark side.
- Sending rate is governed by account reputation; typical limit is **10 messages / second** for new accounts and scales with volume.
- Webhooks follow the progressive back-off schedule shown earlier; sending endpoints do **not** auto-retry—you must handle 4xx/5xx codes gracefully.&#x20;

---

## Official Libraries & SDKs

Postmark maintains and supports SDKs for **Node.js, Python, Ruby, PHP, .NET, Go, Java, Elixir** and more. Community libraries exist for most other stacks; always pin to the latest major version for full template & webhook support. ([stackoverflow.com][6])

---

## Recent Additions & Road-map Highlights

- **Broadcast Message Streams (2024)** – purpose-built bulk sending with unsubscribe enforcement, separate SMTP host, and new API endpoints.
- **SMTP Tokens** – per-stream credentials for fine-grained access control.
- **Enhanced DMARC Monitoring API** – pull aggregate reports programmatically.
- Planned Q4 2025: **GraphQL BETA** for message search and analytics (announced on roadmap blog).&#x20;

---

## Best Practices Checklist

- [x] Use **separate message streams** for transactional vs. bulk.
- [x] Verify DKIM, SPF, DMARC **before** going live.
- [x] Tag messages logically (e.g., `invoice`, `password-reset`).
- [x] Store the `MessageID` your app receives for end-to-end tracing.
- [x] Subscribe to **Bounce + Spam Complaint webhooks** to keep your lists clean.
- [x] Implement exponential back-off when you hit **422 or 500** errors.
- [x] Rotate **Server API tokens** regularly and restrict by IP where possible.

---

### Quick-Reference Endpoint Map

| Category        | Endpoint                                                      |
| --------------- | ------------------------------------------------------------- |
| Send Email      | `POST /email`, `POST /email/batch`                            |
| Templates       | `GET /templates`, `POST /templates`, `DELETE /templates/{id}` |
| Message Streams | `GET /message-streams`, `POST /message-streams`               |
| Webhooks        | `GET /webhooks`, `POST /webhooks`, `PUT /webhooks/{id}`       |
| Domains         | `GET /domains`, `POST /domains`, `DELETE /domains/{id}`       |
| Bounces         | `GET /bounces`, `PUT /bounces/{id}/activate`                  |
| Stats           | `GET /stats/outbound`, `GET /stats/inbound`                   |

_(Replace path placeholders with actual IDs; full request/response schemas in official docs.)_

---

## Final Notes

This document condenses the latest Postmark API capabilities as of **May 11 2025**. For edge-case parameters, deprecated fields, or future beta releases, always consult the live developer portal and changelog. Happy sending! 🎉

[1]: https://postmarkapp.com/developer/api/overview "Overview | Postmark Developer Documentation"
[2]: https://postmarkapp.com/developer/api/templates-api "Templates API | Postmark Developer Documentation"
[3]: https://postmarkapp.com/support/article/1174-managing-layouts-with-postmark-s-api "Managing Layouts with Postmark’s API"
[4]: https://postmarkapp.com/developer "Introduction | Postmark Developer Documentation"
[5]: https://docs.celigo.com/hc/en-us/articles/16387659579419-Available-Postmark-APIs "Available Postmark APIs – Celigo Help Center"
[6]: https://stackoverflow.com/questions/32081626/postmark-send-email-with-template "node.js - Postmark: Send email with template - Stack Overflow"
