import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { MIN_CUSTOM_TOKENS, PACKS, isCurrencyCode, tokensForAmount, type PackId } from "@/lib/pricing";
import { getPriceBook } from "@/lib/fx";

/**
 * Point d'entrée unique du paiement : un pack (?pack=growth) ou un montant libre (?amount=25),
 * dans la devise affichée (?currency=XAF).
 * Aujourd'hui : redirige vers PAYMENT_CHECKOUT_URL (l'API de paiement que tu brancheras)
 * avec tokens, montant, devise et identifiant client. Sans URL configurée → /billing?status=soon.
 *
 * Quand tu intégreras le vrai prestataire (Stripe, CinetPay…), remplace le bloc "redirect"
 * par la création d'une session de paiement côté serveur. Le montant et les tokens sont
 * TOUJOURS recalculés ici, jamais pris depuis le navigateur.
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login?next=/billing", url));

  const currency = url.searchParams.get("currency");
  if (!isCurrencyCode(currency)) return NextResponse.redirect(new URL("/billing", url));

  const book = await getPriceBook(currency);

  let packId: PackId | "custom";
  let tokens: number;
  let amount: number;
  const pack = PACKS.find((p) => p.id === url.searchParams.get("pack"));
  if (pack) {
    packId = pack.id;
    tokens = pack.tokens;
    amount = book.packs[pack.id];
  } else {
    const requested = Number(url.searchParams.get("amount"));
    amount = Math.round(requested * 10 ** book.decimals) / 10 ** book.decimals;
    // Taux indisponible : le barème est repassé en dollars, le montant saisi n'est plus comparable.
    if (book.currency !== currency || !Number.isFinite(amount) || amount < book.minAmount || amount > book.maxAmount) {
      return NextResponse.redirect(new URL("/billing?status=invalid_amount", url));
    }
    // Montant libre : tarif de base, sans bonus ; au moins MIN_CUSTOM_TOKENS (100) tokens.
    packId = "custom";
    tokens = tokensForAmount(amount, book);
    if (tokens < MIN_CUSTOM_TOKENS) return NextResponse.redirect(new URL("/billing?status=invalid_amount", url));
  }

  const base = process.env.PAYMENT_CHECKOUT_URL;
  if (!base) return NextResponse.redirect(new URL("/billing?status=soon", url));

  const site = process.env.NEXT_PUBLIC_SITE_URL ?? url.origin;
  const target = new URL(base);
  target.searchParams.set("pack", packId);
  target.searchParams.set("tokens", String(tokens));
  target.searchParams.set("amount", String(amount));
  target.searchParams.set("currency", book.currency);
  target.searchParams.set("customer_id", user.id);
  if (user.email) target.searchParams.set("customer_email", user.email);
  target.searchParams.set("success_url", `${site}/billing?status=success`);
  target.searchParams.set("cancel_url", `${site}/billing?status=canceled`);
  return NextResponse.redirect(target);
}
