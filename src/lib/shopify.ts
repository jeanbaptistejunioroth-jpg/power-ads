import "server-only";
import { lookup, type LookupAddress, type LookupOptions } from "node:dns";
import https from "node:https";
import { isIP } from "node:net";

// ─────────────────────────────────────────────────────────────
// Import d'un produit depuis une boutique Shopify, sans application ni autorisation :
// la plupart des boutiques publient leur catalogue en JSON (/products.json et
// /products/<handle>.json). Certaines le désactivent : le client remplit alors à la main.
// ─────────────────────────────────────────────────────────────

export type ImportedProduct = {
  name: string;
  url: string;
  description: string;
  price: string;
  images: string[];
};

export type ImportResult =
  | { kind: "product"; product: ImportedProduct }
  | { kind: "catalog"; store: string; products: ImportedProduct[] };

export class ImportError extends Error {
  constructor(public code: "invalid_url" | "not_shopify" | "not_found" | "blocked" | "unreachable") {
    super(code);
  }
}

const MAX_BYTES = 5 * 1024 * 1024;
const TIMEOUT_MS = 8000;

function isPrivateIp(ip: string) {
  if (ip.includes(":")) {
    const v = ip.toLowerCase();
    return (
      v === "::" || v === "::1" || /^(fc|fd|fe[89ab]|ff)/.test(v) ||
      v.startsWith("::ffff:") || v.startsWith("64:ff9b:") || v.startsWith("2001:db8:")
    );
  }
  const [a, b, c] = ip.split(".").map(Number);
  return (
    a === 0 || a === 10 || a === 127 || a >= 224 ||
    (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) || (a === 192 && b === 0 && (c === 0 || c === 2)) ||
    (a === 198 && (b === 18 || b === 19)) || (a === 198 && b === 51 && c === 100) || (a === 203 && b === 0 && c === 113)
  );
}

/** Refuse ce qui n'est pas une boutique publique en https sur le port standard. */
function assertPublicUrl(url: URL) {
  if (url.protocol !== "https:" || (url.port && url.port !== "443") || url.username || url.password) {
    throw new ImportError("invalid_url");
  }
  const host = url.hostname.toLowerCase();
  if (isIP(host) || host === "localhost" || host.endsWith(".local") || host.endsWith(".internal") || !host.includes(".")) {
    throw new ImportError("invalid_url");
  }
}

/**
 * Résolution DNS utilisée par la connexion elle-même : l'adresse vérifiée est celle à laquelle
 * on se connecte (pas de « DNS rebinding » entre la vérification et la requête).
 */
function publicOnlyLookup(
  hostname: string,
  options: LookupOptions,
  callback: (err: NodeJS.ErrnoException | null, address: string | LookupAddress[], family?: number) => void,
) {
  lookup(hostname, { ...options, all: true }, (err, addresses) => {
    if (err) return callback(err, "");
    if (!addresses.length || addresses.some((a) => isPrivateIp(a.address))) {
      return callback(new ImportError("invalid_url"), "");
    }
    if (options.all) callback(null, addresses);
    else callback(null, addresses[0].address, addresses[0].family);
  });
}

type RawResponse = { status: number; location: string | null; type: string; body: string };

/** GET https avec délai global et taille plafonnée pendant le téléchargement. */
function get(url: URL): Promise<RawResponse> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      fn();
    };
    const req = https.request(
      url,
      {
        method: "GET",
        lookup: publicOnlyLookup,
        headers: { accept: "application/json", "user-agent": "VIDSELLA product import (+https://vidsella.com)" },
      },
      (res) => {
        const status = res.statusCode ?? 0;
        const location = typeof res.headers.location === "string" ? res.headers.location : null;
        const type = String(res.headers["content-type"] ?? "");
        if (status !== 200 || Number(res.headers["content-length"] ?? 0) > MAX_BYTES) {
          res.resume();
          return finish(() => resolve({ status, location, type, body: "" }));
        }
        const chunks: Buffer[] = [];
        let size = 0;
        res.on("data", (chunk: Buffer) => {
          size += chunk.length;
          if (size > MAX_BYTES) req.destroy(new ImportError("unreachable"));
          else chunks.push(chunk);
        });
        res.on("end", () => finish(() => resolve({ status, location, type, body: Buffer.concat(chunks).toString("utf8") })));
        res.on("error", (e) => finish(() => reject(e)));
      },
    );
    const timer = setTimeout(() => req.destroy(new ImportError("unreachable")), TIMEOUT_MS);
    req.on("error", (e) => finish(() => reject(e)));
    req.end();
  });
}

async function fetchJson(start: URL): Promise<unknown> {
  let url = start;
  for (let hop = 0; hop < 4; hop++) {
    assertPublicUrl(url);
    let res: RawResponse;
    try {
      res = await get(url);
    } catch (e) {
      throw e instanceof ImportError ? e : new ImportError("unreachable");
    }
    if (res.status >= 300 && res.status < 400) {
      if (!res.location) throw new ImportError("unreachable");
      url = new URL(res.location, url);
      continue;
    }
    if (res.status === 404) throw new ImportError("not_found");
    if (res.status === 401 || res.status === 403 || res.status === 429) throw new ImportError("blocked");
    if (res.status !== 200 || !res.body) throw new ImportError("unreachable");
    if (!res.type.includes("json")) throw new ImportError("not_shopify");
    try {
      return JSON.parse(res.body);
    } catch {
      throw new ImportError("not_shopify");
    }
  }
  throw new ImportError("unreachable");
}

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", "#39": "'" };

export function htmlToText(html: string) {
  return html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6]|tr)>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<[^>]+>/g, "")
    .replace(/&(#?\w+);/g, (m, e: string) => ENTITIES[e] ?? (e.startsWith("#") ? String.fromCharCode(Number(e.slice(1)) || 32) : m))
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n\n")
    .trim();
}

type ShopifyProduct = {
  title?: string;
  handle?: string;
  body_html?: string | null;
  variants?: { price?: string | number }[];
  images?: { src?: string }[];
};

function normalize(p: ShopifyProduct, origin: string): ImportedProduct | null {
  if (!p?.title || !p.handle) return null;
  const images = (p.images ?? [])
    .map((i) => i.src)
    .filter((s): s is string => typeof s === "string" && s.startsWith("https://"))
    .map((s) => s.split("?")[0])
    .slice(0, 10);
  const price = p.variants?.[0]?.price;
  return {
    name: p.title.slice(0, 140),
    url: `${origin}/products/${p.handle}`,
    description: htmlToText(p.body_html ?? "").slice(0, 4000),
    price: price != null ? String(price) : "",
    images,
  };
}

/** Accepte « maboutique.com », une URL de boutique ou une URL de produit. */
export async function importFromShopify(input: string): Promise<ImportResult> {
  let raw = input.trim();
  if (!raw) throw new ImportError("invalid_url");
  if (!/^https?:\/\//i.test(raw)) raw = `https://${raw}`;
  let url: URL;
  try {
    url = new URL(raw.replace(/^http:\/\//i, "https://"));
  } catch {
    throw new ImportError("invalid_url");
  }
  const origin = url.origin;
  const match = url.pathname.match(/\/products\/([^/?#]+)/);

  if (match) {
    const handle = decodeURIComponent(match[1]).replace(/\.(json|js)$/, "");
    const data = (await fetchJson(new URL(`/products/${encodeURIComponent(handle)}.json`, origin))) as { product?: ShopifyProduct };
    const product = data?.product ? normalize(data.product, origin) : null;
    if (!product) throw new ImportError("not_shopify");
    return { kind: "product", product };
  }

  const data = (await fetchJson(new URL("/products.json?limit=60", origin))) as { products?: ShopifyProduct[] };
  if (!Array.isArray(data?.products)) throw new ImportError("not_shopify");
  const products = data.products.map((p) => normalize(p, origin)).filter((p): p is ImportedProduct => !!p);
  if (!products.length) throw new ImportError("not_found");
  return { kind: "catalog", store: url.hostname, products };
}
