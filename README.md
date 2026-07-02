# Company Enrichment API

[![MCP Server](https://img.shields.io/badge/MCP-server-blue)](https://company-enrichment.api.klymax402.com/mcp)
[![x402](https://img.shields.io/badge/payments-x402-6E56CF)](https://x402.org)
[![License: MIT](https://img.shields.io/badge/license-MIT-green)](LICENSE)

Company enrichment from any domain. Firmographics, socials, tech stack, contact info, address. Built for sales prospecting and CRM. Pay-per-call via [x402](https://x402.org) (USDC on Base L2) -- no API key, no signup, no rate-limit wall.

Part of the [klymax402](https://klymax402.com) marketplace -- 100 x402 micropayment APIs for AI agents, one wallet, USDC on Base.

## Quickstart -- MCP

Add to your MCP client config (Claude Desktop, Cursor, ElizaOS, etc.):

```json
{
  "mcpServers": {
    "company-enrichment": {
      "url": "https://company-enrichment.api.klymax402.com/mcp"
    }
  }
}
```

## Quickstart -- HTTP (x402)

```bash
curl "https://company-enrichment.api.klymax402.com/api/enrich?domain=..."
# -> 402 Payment Required, with an x402 payment challenge in the response body
```

Any x402-aware client ([`@x402/fetch`](https://www.npmjs.com/package/@x402/fetch), [`x402-agent-tools`](https://www.npmjs.com/package/x402-agent-tools), ATXP) handles the 402 -> sign -> retry cycle automatically.

## Tools

| Tool | Method | Path | Price | Description |
|---|---|---|---|---|
| `company_enrich_from_domain` | GET | `/api/enrich` | $0.01 | Enrich a company from its domain name |

### `company_enrich_from_domain`

Enrich an organization's profile by domain. Alternative to Apollo org-enrich at 5x lower cost. Returns structured JSON with firmographic data, socials, tech stack, and contact info scraped from the website.

**Parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `domain` | string | yes | Domain to enrich (e.g. stripe.com, shopify.com) |

Example response:

```json
{"name":"Stripe","description":"Financial infrastructure for the internet","socials":{"linkedin":"https://linkedin.com/company/stripe","twitter":"https://twitter.com/stripe"},"contactEmail":"info@stripe.com","techStack":["React","Next.js","Cloudflare"],"address":"354 Oyster Point Blvd, South San Francisco, CA"}
```

**When to use**: sales outreach, CRM enrichment, competitive research, or account-based marketing. Essential for qualifying leads and enriching organization profiles from just a domain. Drop-in replacement for Apollo company enrichment.

**Not for**: tech stack only (use `website_detect_tech_stack`), SEO data (use `seo_audit_page`), person data (use `person_enrich_from_email`), domain WHOIS/DNS (use `domain_lookup_intelligence`).

## Example agent prompts

- "Enrich an organization's profile by domain"

## Payment

- Protocol: [x402](https://x402.org) -- HTTP-native pay-per-call, no signup, no API key
- Network: Base L2 (`eip155:8453`)
- Asset: USDC
- Facilitator: Coinbase CDP (primary), PayAI (fallback)
- Also reachable via [ATXP](https://atxp.ai) (OAuth-wrapped x402, RFC 9728 protected-resource metadata)

## Part of klymax402

100 x402 micropayment APIs for AI agents -- one wallet, USDC on Base, zero signup.

- Catalog: https://klymax402.com/llms.txt
- Full API reference: https://klymax402.com/llms-full.txt
- Live stats: https://klymax402.com/stats

## License

MIT
