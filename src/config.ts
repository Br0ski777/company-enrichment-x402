import type { ApiConfig } from "./shared";

export const API_CONFIG: ApiConfig = {
  name: "company-enrichment",
  slug: "company-enrichment",
  description: "Get company firmographics from any domain. Name, description, socials, tech stack, contact info, address.",
  version: "1.0.0",
  routes: [
    {
      method: "GET",
      path: "/api/enrich",
      price: "$0.01",
      description: "Enrich a company from its domain name",
      toolName: "company_enrich_from_domain",
      toolDescription: "Use this when you need company information from a domain name. Fetches the website and extracts firmographic data: company name, description, social links (LinkedIn, Twitter, Facebook, GitHub), tech stack (CMS, frameworks, analytics), contact email (mailto: links), phone number (tel: links), physical address (from schema.org structured data). Also scrapes /about and /contact pages for additional data. Returns structured JSON with all found fields. Ideal for lead enrichment, sales prospecting, CRM data augmentation, competitive research, account-based marketing. Do NOT use for tech stack only — use website_detect_tech_stack. Do NOT use for SEO data — use seo_audit_page. Do NOT use for person data — use person_enrich_from_email.",
      inputSchema: {
        type: "object",
        properties: {
          domain: { type: "string", description: "Domain to enrich (e.g. stripe.com, shopify.com)" },
        },
        required: ["domain"],
      },
    },
  ],
};
