import type { ApiConfig } from "./shared";

export const API_CONFIG: ApiConfig = {
  name: "company-enrichment",
  slug: "company-enrichment",
  description: "Company enrichment from any domain. Firmographics, socials, tech stack, contact info, address. Built for sales prospecting and CRM.",
  version: "1.0.0",
  routes: [
    {
      method: "GET",
      path: "/api/enrich",
      price: "$0.01",
      description: "Enrich a company from its domain name",
      toolName: "company_enrich_from_domain",
      toolDescription: `Enrich an organization's profile by domain. Alternative to Apollo org-enrich at 5x lower cost. Returns structured JSON with firmographic data, socials, tech stack, and contact info scraped from the website.

1. name (string) -- company name
2. description (string) -- company description / tagline
3. socials (object) -- LinkedIn, Twitter, Facebook, GitHub, Instagram URLs
4. techStack (array) -- detected CMS, frameworks, analytics tools
5. contactEmail (string) -- primary contact email from mailto: links
6. phone (string) -- phone number from tel: links
7. address (string) -- physical address from schema.org structured data
8. industry (string) -- detected industry vertical
9. logo (string) -- logo URL if found

Example output: {"name":"Stripe","description":"Financial infrastructure for the internet","socials":{"linkedin":"https://linkedin.com/company/stripe","twitter":"https://twitter.com/stripe"},"contactEmail":"info@stripe.com","techStack":["React","Next.js","Cloudflare"],"address":"354 Oyster Point Blvd, South San Francisco, CA"}

Use this BEFORE sales outreach, CRM enrichment, competitive research, or account-based marketing. Essential for qualifying leads and enriching organization profiles from just a domain. Drop-in replacement for Apollo company enrichment.

Do NOT use for tech stack only -- use website_detect_tech_stack instead. Do NOT use for SEO data -- use seo_audit_page instead. Do NOT use for person data -- use person_enrich_from_email instead. Do NOT use for domain WHOIS/DNS -- use domain_lookup_intelligence instead.`,
      inputSchema: {
        type: "object",
        properties: {
          domain: { type: "string", description: "Domain to enrich (e.g. stripe.com, shopify.com)" },
        },
        required: ["domain"],
      },
      outputSchema: {
        type: "object",
        properties: {
          domain: { type: "string", description: "Domain enriched" },
          name: { type: "string", description: "Company name" },
          description: { type: "string", description: "Company description / tagline" },
          logo: { type: "string", description: "Logo URL" },
          favicon: { type: "string", description: "Favicon URL" },
          social: {
            type: "object",
            description: "Social media profiles",
            properties: {
              linkedin: { type: "string" },
              twitter: { type: "string" },
              facebook: { type: "string" },
              github: { type: "string" },
              instagram: { type: "string" },
            },
          },
          contact: {
            type: "object",
            description: "Contact information",
            properties: {
              emails: { type: "array", items: { type: "string" } },
              phones: { type: "array", items: { type: "string" } },
              address: { type: "string" },
            },
          },
          tech_stack: { type: "array", items: { type: "string" }, description: "Detected technologies" },
          meta: {
            type: "object",
            description: "Page meta information",
            properties: {
              title: { type: "string" },
              og_title: { type: "string" },
              og_image: { type: "string" },
              language: { type: "string" },
            },
          },
          pages_scanned: { type: "array", items: { type: "string" }, description: "Pages scanned during enrichment" },
          scan_time_ms: { type: "number", description: "Scan duration in milliseconds" },
        },
        required: ["domain", "name"],
      },
    },
  ],
};
