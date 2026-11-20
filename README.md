# 🎬 VIDSELLA — SaaS de vidéos publicitaires pour e-commerçants

> Plateforme web où les vendeurs en ligne commandent des vidéos pub pour leurs produits : import depuis Shopify, script rédigé par l'IA, paiement par tokens et suivi des commandes en temps réel.

### 🔗 [Voir le site en ligne](https://power-ads.vercel.app)

> ⚠️ **Code protégé — Tous droits réservés.** Ce dépôt est public uniquement pour la consultation (portfolio). Toute copie, réutilisation ou redistribution sans autorisation écrite de l'auteur est interdite. Voir [LICENSE](LICENSE).

![Next.js](https://img.shields.io/badge/Next.js_15-000000?style=flat&logo=nextdotjs&logoColor=white)
![React](https://img.shields.io/badge/React_19-61DAFB?style=flat&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3FCF8E?style=flat&logo=supabase&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS_4-06B6D4?style=flat&logo=tailwindcss&logoColor=white)
![Zod](https://img.shields.io/badge/Zod-3E67B1?style=flat&logo=zod&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-000000?style=flat&logo=vercel&logoColor=white)

---

## ✨ Fonctionnalités

### Authentification & compte
- Inscription en **3 étapes** : e-mail → code à 6 chiffres → mot de passe
- Connexion **Google (OAuth)**, mot de passe oublié par code e-mail
- Protection anti-robots **Cloudflare Turnstile**, politiques de sécurité au niveau des lignes (RLS) dans PostgreSQL
- Photo de profil, paramètres, suppression de compte

### Commande de vidéos
- Produit **importé depuis Shopify** ou saisi à la main (photos stockées dans Supabase Storage)
- Ciblage de l'audience : zone, genre, âge, personnes à l'écran, langue, ton
- Format : 1 à 10 vidéos, 15 à 120 s, 9:16 / 1:1 / 16:9
- Script fourni par le client **ou rédigé par l'IA** puis validé
- Devis calculé automatiquement en tokens

### Paiement & international
- Achat de tokens par pack ou montant libre, grand livre des tokens en base
- **Prix dans la monnaie du visiteur** : grille fixe pour FCFA, €, $, £, CAD ; taux de change du jour pour les autres devises
- **8 langues** (FR, EN, ES, PT, AR en droite-à-gauche, DE, IT, ZH) détectées selon le pays et la langue du navigateur

### Suivi & support
- **Mes vidéos** : suivi des commandes en direct, livraison par lien, recrédit automatique en cas d'échec
- **Messagerie service client en temps réel**
- Mode clair / sombre, entièrement responsive (mobile, tablette, ordinateur)

---

## 🏗️ Architecture

```
Next.js 15 (App Router, Server Components, Server Actions)
├── src/app/(auth)        → inscription / connexion
├── src/app/(app)         → espace client : commandes, vidéos, support, paramètres
├── src/app/api           → routes API : commandes, checkout, import Shopify
├── src/components        → assistant de commande en étapes, chat support, UI
├── src/lib               → tarification, devises, géolocalisation, i18n, IA, Shopify
└── supabase/migrations   → schéma SQL versionné (tokens, commandes, sécurité RLS)
```

- **Back-end** : Supabase (PostgreSQL, Auth, Storage, Realtime)
- **Validation** des entrées avec Zod côté serveur
- **Middleware** Next.js pour la détection du pays (`x-vercel-ip-country`) et la langue
- Déploiement continu sur **Vercel**

---

## 🔧 Installation & configuration

<details>
<summary>Guide technique (installation locale, Supabase, déploiement)</summary>

Site public, authentification et espace client du SaaS VIDSELLA.

- Pages de connexion / inscription en écran partagé (Inter + Instrument Serif), bleu et blanc
- Mode clair / sombre (suit l'appareil par défaut)
- 8 langues (français, anglais, espagnol, portugais, arabe de droite à gauche, allemand, italien, chinois), choisies automatiquement selon le pays du visiteur (et la langue du navigateur dans les pays bilingues)
- Responsive : téléphone, tablette, ordinateur
- Inscription en 3 étapes : e-mail → code à 6 chiffres → mot de passe
- Connexion Google, mot de passe oublié par code e-mail
- Prix affichés dans la monnaie du pays du visiteur : prix fixés à la main pour FCFA, €, $, £ et CAD, taux de change du jour pour toutes les autres monnaies
- Achat de tokens par pack ou par montant libre (minimum : le prix d'une vidéo de 30 s)
- Photo de profil, mode clair / sombre automatique
- **Nouvelle vidéo** : produit importé depuis Shopify ou saisi à la main (photos envoyées dans Supabase Storage), audience (zone, genre, âge, personnes à l'écran, langue, ton), format (1 à 10 vidéos, 15 à 120 s, 9:16 / 1:1 / 16:9), script fourni par le client ou rédigé par l'IA puis validé, devis en tokens
- **Mes vidéos** : suivi des commandes en direct, liens Google Drive, recrédit automatique en cas d'échec
- Messagerie service client en temps réel
- Paramètres du compte, suppression de compte
- Mentions légales, CGV, confidentialité, cookies (FR / EN)

---

### 1. Installation locale

```bash
npm install
cp .env.example .env.local   # puis remplir les valeurs
npm run dev                  # http://localhost:3000
```

En local, aucun pays n'est détecté : `DEV_COUNTRY=CM` dans `.env.local` simule le Cameroun (mets `FR`, `SN`, `US`, `BR`, `SA`, `CN`… pour tester les autres langues et devises). La langue est mémorisée dans un cookie au premier passage : efface le cookie `pa_locale` pour retester la détection.

### 2. Configuration Supabase (une seule fois)

1. **Créer le projet** sur supabase.com, puis copier `Project URL`, la clé publique (anon / publishable) et la clé `service_role` dans `.env.local`.
2. **Base de données** : SQL Editor → coller et exécuter, une seule fois chacune et dans cet ordre, `0001_init.sql`, `0002_orders_tokens.sql`, `0003_video_style.sql`, `0004_security.sql`, `0005_profile_i18n.sql`, `0006_pricing_by_style.sql` puis `0007_rename_vidsella.sql` (dossier `supabase/migrations/`). La 0002 crée le grand livre des tokens, la grille tarifaire, les commandes, les vidéos et le bucket de photos `product-images`. La 0004 est **obligatoire** : sans elle, les commandes, la rédaction IA et l'import Shopify sont refusés. Projet déjà en ligne : exécuter la 0004 juste avant de déployer cette version du site.
3. **E-mail par code**
   - Authentication → Providers → Email : activé, « Confirm email » activé, **Email OTP Length = 6** (doit correspondre à `NEXT_PUBLIC_OTP_LENGTH`), **Email OTP Expiration = 900** secondes (15 minutes, comme annoncé dans l'e-mail et sur le site).
   - Authentication → Emails → Templates : coller `supabase/email-templates/code-verification.html` dans **« Magic link »** ET **« Confirm signup »**. Le sujet conseillé est indiqué en haut du fichier. L'e-mail s'affiche en français ou en anglais selon la langue du compte.
4. **Adresse mail pro (obligatoire en production)** : Authentication → SMTP Settings → renseigner le SMTP de ton adresse pro (Google Workspace, Zoho, Hostinger Mail, Resend…). Sans ça, Supabase n'envoie qu'un très petit nombre d'e-mails par heure.
5. **Connexion Google**
   - Google Cloud Console → APIs & Services → Credentials → *OAuth client ID* (type Web).
   - URI de redirection autorisée : `https://<ton-projet>.supabase.co/auth/v1/callback`
   - Supabase → Authentication → Providers → Google : coller Client ID et Client Secret.
6. **URLs autorisées** : Authentication → URL Configuration
   - Site URL : `https://vidsella.com`
   - Redirect URLs : `https://vidsella.com/auth/callback` (ajouter `http://localhost:3000/auth/callback` uniquement sur un projet de test, jamais en production)
7. **Anti-robots (CAPTCHA)**
   - Cloudflare → Turnstile → *Add widget* (gratuit) avec ton domaine (et `localhost` pour tester) → copier la *Site Key* et la *Secret Key*.
   - `NEXT_PUBLIC_TURNSTILE_SITE_KEY` = Site Key (dans `.env.local` et Vercel).
   - Supabase → Authentication → Attack Protection (ou *Bot and Abuse Protection*) → *Enable Captcha protection* → Turnstile → coller la **Secret Key**.
   - Les deux vont ensemble : CAPTCHA activé dans Supabase sans la clé sur le site = plus personne ne peut se connecter.
8. **Protections Supabase** : Authentication → Attack Protection → activer *Leaked password protection* (plan Pro) ; Advisors → *Security Advisor* → aucun avertissement rouge.

### 3. Mise en ligne (Vercel)

1. Pousser le projet sur GitHub, l'importer dans Vercel.
2. Ajouter les variables de `.env.example` dans Vercel → Settings → Environment Variables (sans `DEV_COUNTRY`).
3. Déployer. Vercel fournit automatiquement le pays du visiteur (`x-vercel-ip-country`), utilisé pour la devise. Derrière Cloudflare, `cf-ipcountry` est aussi pris en charge.

### 4. Où modifier quoi

| Besoin | Fichier |
|---|---|
| Prix des packs (monnaies fixées à la main), tokens et bonus des packs (+5 / +10 / +15 %), minimum (100 tokens) et boutons rapides (100 / 200 / 400 tokens) de l'achat libre, pays → monnaie | `src/lib/pricing.ts` |
| Sources des taux de change du jour (cache 12 h, repli en dollars si indisponibles) | `src/lib/fx.ts` |
| Pays → langue | `src/lib/i18n/config.ts` |
| Tous les textes du site (8 langues) | `src/lib/i18n/dictionaries/*.ts` (fr, en, es, pt, ar, de, it, zh) |
| Décors visuels (téléphone vidéo, bouton lecture, onde sonore, pellicule…) | `src/components/decor.tsx` et animations dans `src/app/globals.css` |
| Vidéos de démonstration qui jouent dans les téléphones et vignettes (muettes, en boucle, ordre aléatoire à chaque visite) | `public/media/pub-1.mp4` à `pub-6.mp4` + leur aperçu `.jpg`. Pour en changer : même nom, format vertical 9:16, idéalement 360×640 sans piste audio (`ffmpeg -i source.mp4 -an -vf scale=360:640 -crf 27 -movflags +faststart pub-1.mp4`). Pour en ajouter : compléter la liste dans `src/components/loop-video.tsx` |
| Textes légaux (compléter les `[crochets]`) | `src/lib/legal-content.ts` |
| Couleurs clair / sombre | `src/app/globals.css` (bloc `:root` et `.dark`) |
| Redirection vers le paiement | `src/app/api/checkout/route.ts` |

**Ajouter une langue** : créer `dictionaries/xx.ts` (même structure que `fr.ts`), l'ajouter dans `src/lib/i18n/config.ts` (liste, nom, pays) et `server.ts`, l'autoriser dans la contrainte `profiles_locale_check` (migration) et dans le modèle d'e-mail. Les pages légales s'affichent en anglais pour les langues autres que le français et l'anglais.

**Paiement d'un montant libre** : `/api/checkout?amount=25&currency=USD` recalcule côté serveur le nombre de tokens (prix d'un token du pack Starter, mêmes bonus que les packs : +5 % dès 2 000 tokens, +10 % dès 5 000) et refuse un montant sous le minimum (une vidéo de 30 s, d'après `pricing_rules`). Le prestataire de paiement doit accepter la monnaie affichée ; sinon, forcer le dollar.

### 4 bis. Commandes, tokens et moteur

| Élément | Où |
|---|---|
| Prix en tokens par durée (15/30/60/90/120 s) **et par style** (face caméra, mixte, voix off) | Table `pricing_rules` dans Supabase (modifiable sans toucher au code). Garder `FALLBACK_TOKENS` (`src/lib/order.ts`) identique : c'est la grille affichée si la table est illisible |
| Bonus de bienvenue (tokens offerts au premier numéro WhatsApp unique) | Variable `WELCOME_BONUS_TOKENS` (0 = désactivé) |
| Créditer des tokens à un client (paiement reçu hors ligne) | SQL Editor : `select public.credit_tokens('<user_id>', 1000, 'adjustment', null, 'Paiement Orange Money du 16/10');` |
| Historique des mouvements | Table `token_transactions` |
| Options du formulaire (zones, âges, tons…) | `src/lib/order.ts` (les identifiants sont envoyés tels quels au moteur) |
| Rédaction des scripts | `src/lib/ai.ts` (prompt) — `FAL_KEY` vide = scripts de démonstration |
| Import Shopify | `src/lib/shopify.ts` (catalogue public `/products.json`, aucune application Shopify nécessaire) |
| Envoi au moteur / signature | `src/lib/engine.ts` |

**Parcours d'une commande** : `/api/orders` valide les données → la fonction SQL `place_order` recalcule le prix depuis `pricing_rules`, crée la commande et débite les tokens (tout ou rien) → le site envoie la commande signée (HMAC) à `ENGINE_ORDER_URL` → le moteur renvoie ses événements signés sur `/api/engine/events` (`video.delivered` avec le lien Drive, `video.failed` → tokens de la vidéo recrédités une seule fois).

Sans `ENGINE_ORDER_URL`, les commandes restent « En attente » : pratique pour tester le site seul.

### 5. Paiement (à brancher)

Tous les boutons « Acheter ce pack » passent par `/api/checkout`. Cette route vérifie la session, **recalcule le montant côté serveur**, puis redirige vers `PAYMENT_CHECKOUT_URL` avec : `pack`, `tokens`, `amount`, `currency`, `customer_id`, `customer_email`, `success_url`, `cancel_url`.

Tant que `PAYMENT_CHECKOUT_URL` est vide, le client voit « Le paiement en ligne sera activé très prochainement ».

Quand tu intégreras le prestataire (CinetPay, Notch Pay…), le crédit des tokens devra se faire **uniquement dans le webhook du prestataire** (jamais depuis la page de retour), avec la clé service role, via `credit_tokens(user_id, tokens, 'purchase', '<id du paiement>')` : l'identifiant du paiement empêche tout double crédit.

### 6. Répondre aux clients (service client)

En attendant un back-office : Supabase → Table Editor → `support_messages` → *Insert row* avec `user_id` du client, `sender = agent` et le texte dans `body`. Le message apparaît instantanément dans la messagerie du client.

### 7. Sécurité intégrée

- RLS activée sur toutes les tables : chaque client ne voit que ses données.
- Un client ne peut modifier que son nom, sa langue et son WhatsApp, **jamais son solde de tokens**. Le solde ne bouge que par les fonctions SQL (verrou sur la ligne : deux commandes simultanées ne peuvent pas passer le solde sous zéro).
- Les événements du moteur sont refusés sans signature valide (`SITE_CALLBACK_SECRET`, fenêtre de 5 minutes).
- Les commandes ne passent que par `/api/orders` (validation complète) : la fonction `place_order_for` n'est appelable qu'avec la clé serveur.
- L'import Shopify refuse les adresses internes, vérifiées au moment même de la connexion (protection SSRF et DNS rebinding), port 443 uniquement, 5 Mo maximum.
- Limites anti-abus par compte : 40 rédactions IA / jour, 30 imports Shopify / heure, 20 messages au support / 10 min (200 / jour), 100 photos / 24 h. CAPTCHA Turnstile sur connexion, inscription et mot de passe oublié.
- Redirection après connexion limitée aux pages du site (pas de redirection vers un site extérieur).
- En-têtes de sécurité sur toutes les pages (`next.config.ts`) : politique de contenu (CSP), anti-clickjacking, HTTPS forcé (HSTS), nosniff, Referrer-Policy.
- Cookies de session `Secure` en production. Photos produits supprimées avec le compte.
- La clé `service_role` n'est utilisée que côté serveur, dans des fichiers `server-only`. **Aucune clé secrète ne doit commencer par `NEXT_PUBLIC_`** : ces variables sont visibles par tous les visiteurs.
- Les pages de l'espace client sont protégées par le middleware et par chaque page.

### 8. Avant la mise en ligne

- [ ] Compléter les `[crochets]` dans `src/lib/legal-content.ts` et faire relire par un juriste
- [ ] Ajuster les prix dans `src/lib/pricing.ts`
- [ ] SMTP pro configuré et e-mail de test reçu (FR et EN)
- [ ] Connexion Google testée en production
- [ ] `NEXT_PUBLIC_SUPPORT_EMAIL` et `NEXT_PUBLIC_SITE_URL` renseignés
- [ ] Migrations 0001 → 0007 exécutées, Security Advisor de Supabase sans alerte
- [ ] Prestataire de paiement compatible avec les monnaies affichées (sinon forcer le dollar)
- [ ] CAPTCHA Turnstile configuré (site + Supabase) et connexion testée
- [ ] `ENGINE_WEBHOOK_SECRET` et `SITE_CALLBACK_SECRET` longs et aléatoires (`openssl rand -hex 32`)
- [ ] Double authentification activée sur Supabase, Vercel, GitHub et Cloudflare
- [ ] `localhost` retiré des Redirect URLs Supabase de production

</details>

---

## 👤 Auteur

**OTH Jean Baptiste Junior** — Ingénieur GESI · Développeur full-stack & IoT · Douala, Cameroun
[GitHub](https://github.com/jeanbaptistejunioroth-jpg) · [LinkedIn](https://www.linkedin.com/in/jean-baptiste-junior-oth-308935254) · [E-mail](mailto:Jeanbaptistejunioroth@gmail.com)
