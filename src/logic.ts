import type { Hono } from "hono";

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";

interface CompanyData {
  domain: string;
  name: string | null;
  description: string | null;
  logo: string | null;
  favicon: string | null;
  social: {
    linkedin: string | null;
    twitter: string | null;
    facebook: string | null;
    github: string | null;
    instagram: string | null;
    youtube: string | null;
  };
  contact: {
    emails: string[];
    phones: string[];
    address: string | null;
  };
  tech_stack: { name: string; category: string }[];
  meta: {
    title: string | null;
    og_title: string | null;
    og_image: string | null;
    og_type: string | null;
    language: string | null;
  };
  pages_scanned: string[];
  scan_time_ms: number;
}

async function fetchPage(url: string): Promise<{ html: string; ok: boolean }> {
  try {
    const resp = await fetch(url, {
      headers: { "User-Agent": UA },
      signal: AbortSignal.timeout(8_000),
      redirect: "follow",
    });
    if (!resp.ok) return { html: "", ok: false };
    const html = await resp.text();
    return { html, ok: true };
  } catch {
    return { html: "", ok: false };
  }
}

function extractMeta(html: string, attr: string): string | null {
  // Try name= and property= variants
  for (const prefix of ["name", "property"]) {
    const re = new RegExp(`<meta\\s+(?:[^>]*?${prefix}=["']${attr}["'][^>]*?content=["']([^"']+)["']|[^>]*?content=["']([^"']+)["'][^>]*?${prefix}=["']${attr}["'])`, "i");
    const m = html.match(re);
    if (m) return m[1] || m[2] || null;
  }
  return null;
}

function extractTitle(html: string): string | null {
  const m = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return m ? m[1].trim() : null;
}

function extractCompanyName(html: string): string | null {
  // Try og:site_name first
  const siteName = extractMeta(html, "og:site_name");
  if (siteName) return siteName;

  // Try application-name
  const appName = extractMeta(html, "application-name");
  if (appName) return appName;

  // Try schema.org Organization name
  const schemaMatch = html.match(/"@type"\s*:\s*"Organization"[^}]*?"name"\s*:\s*"([^"]+)"/i);
  if (schemaMatch) return schemaMatch[1];

  // Fallback: clean the <title>
  const title = extractTitle(html);
  if (title) {
    // Remove common suffixes like " | Company", " - Company", " — Home"
    const cleaned = title.split(/\s*[|\-–—]\s*/)[0].trim();
    if (cleaned.length > 1 && cleaned.length < 80) return cleaned;
  }
  return null;
}

function extractDescription(html: string): string | null {
  return extractMeta(html, "description") || extractMeta(html, "og:description") || null;
}

function extractEmails(html: string): string[] {
  const set = new Set<string>();
  // mailto: links
  const mailtoMatches = html.matchAll(/mailto:([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})/gi);
  for (const m of mailtoMatches) set.add(m[1].toLowerCase());
  // Emails in visible text (but filter out common false positives)
  const textEmails = html.matchAll(/\b([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})\b/g);
  for (const m of textEmails) {
    const email = m[1].toLowerCase();
    if (!email.endsWith(".png") && !email.endsWith(".jpg") && !email.endsWith(".js") && !email.endsWith(".css")) {
      set.add(email);
    }
  }
  return [...set].slice(0, 10);
}

function extractPhones(html: string): string[] {
  const set = new Set<string>();
  const telMatches = html.matchAll(/tel:([+\d\s\-().]+)/gi);
  for (const m of telMatches) {
    const phone = m[1].replace(/\s+/g, " ").trim();
    if (phone.length >= 7) set.add(phone);
  }
  return [...set].slice(0, 5);
}

function extractSocials(html: string) {
  const find = (pattern: RegExp): string | null => {
    const m = html.match(pattern);
    return m ? m[0] : null;
  };
  return {
    linkedin: find(/https?:\/\/(www\.)?linkedin\.com\/(company|in)\/[a-zA-Z0-9_\-]+\/?/i),
    twitter: find(/https?:\/\/(www\.)?(twitter\.com|x\.com)\/[a-zA-Z0-9_]+\/?/i),
    facebook: find(/https?:\/\/(www\.)?facebook\.com\/[a-zA-Z0-9._\-]+\/?/i),
    github: find(/https?:\/\/(www\.)?github\.com\/[a-zA-Z0-9_\-]+\/?/i),
    instagram: find(/https?:\/\/(www\.)?instagram\.com\/[a-zA-Z0-9._]+\/?/i),
    youtube: find(/https?:\/\/(www\.)?youtube\.com\/(c\/|channel\/|@)[a-zA-Z0-9_\-]+\/?/i),
  };
}

function extractAddress(html: string): string | null {
  // Try schema.org PostalAddress
  const addressMatch = html.match(/"@type"\s*:\s*"PostalAddress"[^}]*?"streetAddress"\s*:\s*"([^"]+)"/i);
  if (addressMatch) return addressMatch[1];

  // Try full address from schema
  const fullAddr = html.match(/"address"\s*:\s*\{[^}]*?"streetAddress"\s*:\s*"([^"]+)"[^}]*?"addressLocality"\s*:\s*"([^"]+)"[^}]*?"addressRegion"\s*:\s*"([^"]*)"[^}]*?"postalCode"\s*:\s*"([^"]*)"/i);
  if (fullAddr) return `${fullAddr[1]}, ${fullAddr[2]}, ${fullAddr[3]} ${fullAddr[4]}`.trim();

  // Try simpler schema address string
  const simpleAddr = html.match(/"address"\s*:\s*"([^"]{10,200})"/i);
  if (simpleAddr) return simpleAddr[1];

  return null;
}

function extractLogo(html: string, baseUrl: string): string | null {
  // og:image
  const ogImage = extractMeta(html, "og:image");
  if (ogImage) return resolveUrl(ogImage, baseUrl);

  // schema.org logo
  const schemaLogo = html.match(/"logo"\s*:\s*(?:\{[^}]*?"url"\s*:\s*"([^"]+)"|"([^"]+)")/i);
  if (schemaLogo) return resolveUrl(schemaLogo[1] || schemaLogo[2], baseUrl);

  return null;
}

function extractFavicon(html: string, baseUrl: string): string | null {
  const m = html.match(/<link[^>]*rel=["'](?:shortcut )?icon["'][^>]*href=["']([^"']+)["']/i)
    || html.match(/<link[^>]*href=["']([^"']+)["'][^>]*rel=["'](?:shortcut )?icon["']/i);
  if (m) return resolveUrl(m[1], baseUrl);
  return `${baseUrl}/favicon.ico`;
}

function resolveUrl(url: string, base: string): string {
  if (url.startsWith("http")) return url;
  if (url.startsWith("//")) return `https:${url}`;
  if (url.startsWith("/")) return `${base}${url}`;
  return `${base}/${url}`;
}

function detectTech(html: string): { name: string; category: string }[] {
  const techs: { name: string; category: string }[] = [];
  const seen = new Set<string>();

  const rules: [RegExp, string, string][] = [
    [/wp-content|wp-includes/i, "WordPress", "CMS"],
    [/cdn\.shopify\.com|Shopify\.theme/i, "Shopify", "CMS"],
    [/wix\.com|_wix_browser_sess/i, "Wix", "CMS"],
    [/squarespace/i, "Squarespace", "CMS"],
    [/webflow|assets\.website-files\.com/i, "Webflow", "CMS"],
    [/Drupal\.settings/i, "Drupal", "CMS"],
    [/__NEXT_DATA__|_next\//i, "Next.js", "JS Framework"],
    [/__REACT|data-reactroot|react-dom/i, "React", "JS Framework"],
    [/data-v-[a-f0-9]|vue\.min\.js/i, "Vue.js", "JS Framework"],
    [/__NUXT__|_nuxt\//i, "Nuxt", "JS Framework"],
    [/ng-version|ng-app/i, "Angular", "JS Framework"],
    [/___gatsby/i, "Gatsby", "JS Framework"],
    [/tailwindcss/i, "Tailwind CSS", "CSS"],
    [/bootstrap\.min/i, "Bootstrap", "CSS"],
    [/gtag\(|google-analytics\.com|G-[A-Z0-9]{4,}/i, "Google Analytics", "Analytics"],
    [/googletagmanager\.com/i, "Google Tag Manager", "Analytics"],
    [/fbq\(|connect\.facebook\.net/i, "Facebook Pixel", "Analytics"],
    [/static\.hotjar\.com/i, "Hotjar", "Analytics"],
    [/cdn\.segment\.com/i, "Segment", "Analytics"],
    [/plausible\.io/i, "Plausible", "Analytics"],
    [/js\.stripe\.com/i, "Stripe", "Payment"],
    [/widget\.intercom\.io/i, "Intercom", "Customer Support"],
    [/client\.crisp\.chat/i, "Crisp", "Customer Support"],
    [/js\.hs-scripts\.com|hbspt/i, "HubSpot", "Marketing"],
    [/jquery\.min\.js/i, "jQuery", "JavaScript Library"],
    [/google\.com\/recaptcha/i, "reCAPTCHA", "Security"],
    [/browser\.sentry-cdn\.com/i, "Sentry", "Error Tracking"],
  ];

  for (const [regex, name, category] of rules) {
    if (!seen.has(name) && regex.test(html)) {
      seen.add(name);
      techs.push({ name, category });
    }
  }
  return techs;
}

function extractLanguage(html: string): string | null {
  const m = html.match(/<html[^>]*lang=["']([^"']+)["']/i);
  return m ? m[1] : null;
}

function mergeSocials(a: ReturnType<typeof extractSocials>, b: ReturnType<typeof extractSocials>) {
  return {
    linkedin: a.linkedin || b.linkedin,
    twitter: a.twitter || b.twitter,
    facebook: a.facebook || b.facebook,
    github: a.github || b.github,
    instagram: a.instagram || b.instagram,
    youtube: a.youtube || b.youtube,
  };
}

export function registerRoutes(app: Hono) {
  app.get("/api/enrich", async (c) => {
    const domain = c.req.query("domain");
    if (!domain) return c.json({ error: "Missing required parameter: domain" }, 400);

    // Clean domain
    const cleanDomain = domain.replace(/^https?:\/\//, "").replace(/\/.*$/, "").toLowerCase();
    if (!/^[a-z0-9]([a-z0-9\-]*[a-z0-9])?(\.[a-z]{2,})+$/.test(cleanDomain)) {
      return c.json({ error: "Invalid domain format" }, 400);
    }

    const baseUrl = `https://${cleanDomain}`;
    const startTime = Date.now();
    const pagesScanned: string[] = [];

    try {
      // Fetch homepage + /about + /contact in parallel
      const [homeResult, aboutResult, contactResult] = await Promise.all([
        fetchPage(baseUrl),
        fetchPage(`${baseUrl}/about`),
        fetchPage(`${baseUrl}/contact`),
      ]);

      if (!homeResult.ok) {
        return c.json({
          error: "Could not fetch website",
          domain: cleanDomain,
          scan_time_ms: Date.now() - startTime,
        }, 502);
      }

      const html = homeResult.html;
      pagesScanned.push("/");

      // Combine all HTML for extraction
      let allHtml = html;
      if (aboutResult.ok) { allHtml += "\n" + aboutResult.html; pagesScanned.push("/about"); }
      if (contactResult.ok) { allHtml += "\n" + contactResult.html; pagesScanned.push("/contact"); }

      // Extract from homepage (primary source for name/desc/meta)
      const name = extractCompanyName(html);
      const description = extractDescription(html);
      const logo = extractLogo(html, baseUrl);
      const favicon = extractFavicon(html, baseUrl);
      const language = extractLanguage(html);

      // Extract from all pages combined (more data)
      const social = aboutResult.ok
        ? mergeSocials(extractSocials(html), extractSocials(aboutResult.html))
        : extractSocials(html);
      if (contactResult.ok) {
        const contactSocials = extractSocials(contactResult.html);
        Object.assign(social, mergeSocials(social, contactSocials));
      }

      const emails = extractEmails(allHtml);
      const phones = extractPhones(allHtml);
      const address = extractAddress(allHtml);
      const techStack = detectTech(html);

      const result: CompanyData = {
        domain: cleanDomain,
        name,
        description,
        logo,
        favicon,
        social,
        contact: {
          emails,
          phones,
          address,
        },
        tech_stack: techStack,
        meta: {
          title: extractTitle(html),
          og_title: extractMeta(html, "og:title"),
          og_image: extractMeta(html, "og:image"),
          og_type: extractMeta(html, "og:type"),
          language,
        },
        pages_scanned: pagesScanned,
        scan_time_ms: Date.now() - startTime,
      };

      return c.json(result);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Enrichment failed";
      return c.json({
        error: msg.includes("abort") ? "Request timed out" : msg,
        domain: cleanDomain,
        scan_time_ms: Date.now() - startTime,
      }, 500);
    }
  });
}
