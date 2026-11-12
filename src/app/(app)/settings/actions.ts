"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isLocale } from "@/lib/i18n/config";
import { normalizePhone } from "@/lib/order";
import { grantWelcomeBonus } from "@/lib/welcome-bonus";

export async function updateProfile(fullName: string, whatsapp: string) {
  const name = fullName.trim().slice(0, 80);
  const phone = normalizePhone(whatsapp);
  if (phone && !/^\+[1-9][0-9]{6,14}$/.test(phone)) return { ok: false, field: "whatsapp" as const };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false };
  const { error } = await supabase
    .from("profiles")
    .update({ full_name: name, whatsapp: phone || null })
    .eq("id", user.id);
  // Index unique (migration 0006) : un numéro WhatsApp n'appartient qu'à un seul compte.
  if (error?.code === "23505") return { ok: false, field: "whatsapp_taken" as const };
  await supabase.auth.updateUser({ data: { full_name: name } });
  if (!error && phone) await grantWelcomeBonus(user.id);
  revalidatePath("/", "layout");
  return { ok: !error };
}

export async function updateLocale(locale: string) {
  if (!isLocale(locale)) return { ok: false };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false };
  // Langue aussi stockée côté compte : elle choisit la langue des e-mails envoyés.
  await supabase.from("profiles").update({ locale }).eq("id", user.id);
  await supabase.auth.updateUser({ data: { locale } });
  return { ok: true };
}

/** Supprime les fichiers d'un client dans un bucket, sauf `keep`. */
async function removeUserFiles(admin: ReturnType<typeof createAdminClient>, bucketId: string, userId: string, keep?: string) {
  const bucket = admin.storage.from(bucketId);
  for (let i = 0; i < 50; i++) {
    const { data, error } = await bucket.list(userId, { limit: 100 });
    const paths = (data ?? []).map((f) => `${userId}/${f.name}`).filter((p) => p !== keep);
    if (error || !paths.length) return;
    const { error: removeError } = await bucket.remove(paths);
    if (removeError) {
      console.error("[settings] suppression de fichiers", bucketId, userId, removeError.message);
      return;
    }
  }
}

/**
 * Photo de profil : `path` est le fichier déjà envoyé dans le bucket « avatars »
 * (<user_id>/<uuid>.jpg), ou null pour retirer la photo. L'adresse est construite ici,
 * jamais reçue du navigateur.
 */
export async function updateAvatar(path: string | null) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false };
  if (path !== null && !new RegExp(`^${user.id}/[0-9a-f-]{36}\\.jpg$`).test(path)) return { ok: false };

  // Écrit avec la clé serveur : le navigateur ne peut pas modifier avatar_url lui-même (migration 0005).
  const admin = createAdminClient();
  const url = path ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/avatars/${path}` : null;
  const { error } = await admin.from("profiles").update({ avatar_url: url }).eq("id", user.id);
  if (error) return { ok: false };

  // Anciennes photos : inutile de les garder (bucket public).
  await removeUserFiles(admin, "avatars", user.id, path ?? undefined);
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function deleteAccount(confirmation: string, expected: string) {
  if (confirmation.trim() !== expected) return { ok: false };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false };
  const admin = createAdminClient();
  // Buckets publics : les fichiers resteraient accessibles après la suppression du compte.
  await removeUserFiles(admin, "product-images", user.id);
  await removeUserFiles(admin, "avatars", user.id);
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) return { ok: false };
  await supabase.auth.signOut();
  redirect("/");
}
