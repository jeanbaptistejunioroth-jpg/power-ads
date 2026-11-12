"use client";

import { useRef, useState } from "react";
import { ImagePlus, PenLine, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/lib/i18n/provider";
import { fmt } from "@/lib/i18n/format";
import { MAX_IMAGES } from "@/lib/order";
import { ShopifyIcon } from "@/components/brand-icons";
import { Alert, Spinner } from "@/components/auth/parts";
import { StepHeader } from "./ui";
import type { Draft, SetDraft } from "./types";

type Imported = { name: string; url: string; description: string; price: string; images: string[] };
type ImportResponse =
  | { kind: "product"; product: Imported }
  | { kind: "catalog"; store: string; products: Imported[] }
  | { error: string };

const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 10 * 1024 * 1024;

export function StepProduct({ draft, set, userId }: { draft: Draft; set: SetDraft; userId: string }) {
  const { t } = useI18n();
  const p = t.app.order.product;
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [imported, setImported] = useState(false);
  const [catalog, setCatalog] = useState<{ store: string; products: Imported[] } | null>(null);
  const [uploading, setUploading] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function apply(prod: Imported) {
    set((d) => ({
      product: {
        source: "shopify",
        name: prod.name,
        url: prod.url,
        description: prod.description,
        price: prod.price,
        images: prod.images.slice(0, MAX_IMAGES),
      },
      productTab: "manual",
      scripts: d.scriptMode === "ai" ? [] : d.scripts,
      confirmed: false,
    }));
    setCatalog(null);
    setImported(true);
  }

  async function runImport(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.shopifyUrl.trim()) return;
    setImporting(true);
    setImportError(null);
    setCatalog(null);
    setImported(false);
    try {
      const res = await fetch("/api/shopify/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: draft.shopifyUrl }),
      });
      const data = (await res.json()) as ImportResponse;
      if ("error" in data) {
        setImportError(p.errors[data.error as keyof typeof p.errors] ?? t.common.genericError);
      } else if (data.kind === "product") {
        apply(data.product);
      } else {
        setCatalog({ store: data.store, products: data.products });
      }
    } catch {
      setImportError(p.errors.unreachable);
    } finally {
      setImporting(false);
    }
  }

  async function addFiles(files: FileList | null) {
    if (!files?.length) return;
    setUploadError(null);
    const room = MAX_IMAGES - draft.product.images.length;
    const list = Array.from(files).slice(0, Math.max(0, room));
    if (list.some((f) => !ACCEPTED.includes(f.type) || f.size > MAX_BYTES)) {
      setUploadError(p.photoTooBig);
      return;
    }
    const supabase = createClient();
    setUploading((n) => n + list.length);
    const urls: string[] = [];
    for (const file of list) {
      const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
      const path = `${userId}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("product-images").upload(path, file, { contentType: file.type, upsert: false });
      setUploading((n) => n - 1);
      if (error) {
        setUploadError(p.uploadError);
        continue;
      }
      urls.push(supabase.storage.from("product-images").getPublicUrl(path).data.publicUrl);
    }
    if (urls.length) set((d) => ({ product: { ...d.product, images: [...d.product.images, ...urls].slice(0, MAX_IMAGES) } }));
    if (fileRef.current) fileRef.current.value = "";
  }

  const setProduct = (patch: Partial<Draft["product"]>) => set((d) => ({ product: { ...d.product, ...patch } }));

  return (
    <div>
      <StepHeader title={p.title} sub={p.sub} />

      {/* Choix de la source */}
      <div className="grid grid-cols-2 gap-2 rounded-2xl bg-sunken p-1.5" role="tablist">
        {(["shopify", "manual"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={draft.productTab === tab}
            onClick={() => set({ productTab: tab })}
            className={`inline-flex h-11 items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-colors ${
              draft.productTab === tab ? "bg-elev text-ink shadow-sm" : "text-ink-2 hover:text-ink"
            }`}
          >
            {tab === "shopify" ? <ShopifyIcon className="h-[18px] w-[18px]" /> : <PenLine size={17} aria-hidden />}
            <span className="truncate sm:hidden">{tab === "shopify" ? p.tabShopifyShort : p.tabManualShort}</span>
            <span className="hidden truncate sm:inline">{tab === "shopify" ? p.tabShopify : p.tabManual}</span>
          </button>
        ))}
      </div>

      {draft.productTab === "shopify" && (
        <div className="mt-6">
          <form onSubmit={runImport}>
            <label htmlFor="shopify-url" className="label">{p.shopifyLabel}</label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                id="shopify-url"
                className="field"
                inputMode="url"
                autoComplete="url"
                placeholder={p.shopifyPlaceholder}
                value={draft.shopifyUrl}
                onChange={(e) => set({ shopifyUrl: e.target.value })}
              />
              <button type="submit" disabled={importing || !draft.shopifyUrl.trim()} className="btn btn-primary btn-lg shrink-0">
                {importing && <Spinner />}
                {importing ? p.importing : p.import}
              </button>
            </div>
            <p className="hint">{p.shopifyHint}</p>
          </form>
          {importError && <div className="mt-4"><Alert>{importError}</Alert></div>}

          {catalog && (
            <div className="mt-6">
              <p className="text-sm font-medium">{fmt(p.pick, { n: catalog.products.length, store: catalog.store })}</p>
              <ul className="mt-3 grid max-h-[420px] grid-cols-2 gap-3 overflow-y-auto pe-1 sm:grid-cols-3">
                {catalog.products.map((prod) => (
                  <li key={prod.url}>
                    <button
                      type="button"
                      onClick={() => apply(prod)}
                      className="choice w-full overflow-hidden"
                    >
                      <span className="block aspect-square bg-sunken">
                        {prod.images[0] && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={prod.images[0]} alt="" className="h-full w-full object-cover" loading="lazy" />
                        )}
                      </span>
                      <span className="block truncate px-3 pt-2.5 text-sm font-medium">{prod.name}</span>
                      <span className="block px-3 pb-3 text-xs text-ink-3">{prod.price}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {draft.productTab === "manual" && (
        <div className="mt-6 space-y-6">
          {imported && <Alert tone="success">{p.imported}</Alert>}
          <div className="grid gap-6 sm:grid-cols-[1fr_180px]">
            <div>
              <label htmlFor="p-name" className="label">{p.name}</label>
              <input id="p-name" className="field" maxLength={140} placeholder={p.namePlaceholder} value={draft.product.name} onChange={(e) => setProduct({ name: e.target.value })} />
            </div>
            <div>
              <label htmlFor="p-price" className="label">
                {p.price} <span className="font-normal text-ink-3">({t.common.optional})</span>
              </label>
              <input id="p-price" className="field" maxLength={40} placeholder={p.pricePlaceholder} value={draft.product.price} onChange={(e) => setProduct({ price: e.target.value })} />
            </div>
          </div>
          <div>
            <label htmlFor="p-url" className="label">
              {p.url} <span className="font-normal text-ink-3">({t.common.optional})</span>
            </label>
            <input id="p-url" className="field" type="url" inputMode="url" maxLength={2048} placeholder={p.urlPlaceholder} value={draft.product.url} onChange={(e) => setProduct({ url: e.target.value })} />
          </div>
          <div>
            <label htmlFor="p-desc" className="label">{p.description}</label>
            <textarea id="p-desc" className="field min-h-[9rem]" maxLength={4000} value={draft.product.description} onChange={(e) => setProduct({ description: e.target.value })} />
            <p className="hint">{p.descriptionHint}</p>
          </div>

          <div>
            <p className="label">{p.photos}</p>
            <p className="-mt-1 mb-3 text-sm text-ink-3">{fmt(p.photosHint, { max: MAX_IMAGES })}</p>
            <ul className="grid grid-cols-3 gap-3 sm:grid-cols-5">
              {draft.product.images.map((src) => (
                <li key={src} className="group relative aspect-square overflow-hidden rounded-xl border border-line bg-sunken">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt="" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setProduct({ images: draft.product.images.filter((i) => i !== src) })}
                    className="absolute end-1.5 top-1.5 inline-flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
                    aria-label={p.removePhoto}
                  >
                    <X size={15} />
                  </button>
                </li>
              ))}
              {Array.from({ length: uploading }).map((_, i) => (
                <li key={`up-${i}`} className="flex aspect-square items-center justify-center rounded-xl border border-line bg-sunken text-ink-3">
                  <Spinner />
                </li>
              ))}
              {draft.product.images.length + uploading < MAX_IMAGES && (
                <li>
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="flex aspect-square w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-line-strong text-sm font-medium text-ink-2 transition-colors hover:border-brand hover:text-brand-text"
                  >
                    <ImagePlus size={20} aria-hidden />
                    <span className="px-2 text-center text-xs">{p.addPhotos}</span>
                  </button>
                </li>
              )}
            </ul>
            <input
              ref={fileRef}
              type="file"
              accept={ACCEPTED.join(",")}
              multiple
              className="sr-only"
              tabIndex={-1}
              onChange={(e) => void addFiles(e.target.files)}
            />
            {uploadError && <div className="mt-3"><Alert>{uploadError}</Alert></div>}
          </div>
        </div>
      )}
    </div>
  );
}
