// ─────────────────────────────────────────────────────────────
// Textes légaux. Les éléments entre [crochets] sont À COMPLÉTER
// avec les informations réelles de la société avant la mise en ligne,
// puis à faire relire par un juriste.
// ─────────────────────────────────────────────────────────────

export type LegalDoc = { title: string; sections: { h: string; p: string[] }[] };
export type LegalSlug = "mentions-legales" | "cgv" | "confidentialite" | "cookies";

export const LEGAL_UPDATED = "2026-10-17";
const SUPPORT = "support@vidsella.com";

/** Texte légal dans la langue demandée ; anglais pour les langues sans version juridique dédiée. */
export function legalDoc(slug: string, locale: string): { doc: LegalDoc; lang: "fr" | "en" } | null {
  if (!Object.hasOwn(LEGAL, slug)) return null;
  const lang = locale === "fr" ? "fr" : "en";
  return { doc: LEGAL[slug as LegalSlug][lang], lang };
}

export const LEGAL: Record<LegalSlug, { fr: LegalDoc; en: LegalDoc }> = {
  "mentions-legales": {
    fr: {
      title: "Mentions légales",
      sections: [
        { h: "Éditeur du site", p: [
          "Le site VIDSELLA est édité par [Raison sociale], [forme juridique] au capital de [montant], immatriculée au RCCM sous le numéro [numéro RCCM], NIU [numéro], dont le siège est situé [adresse complète, ville, pays].",
          `Directeur de la publication : [Nom Prénom]. Contact : ${SUPPORT} — [téléphone].`,
        ] },
        { h: "Hébergement", p: [
          "Application web : Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, États-Unis — vercel.com.",
          "Base de données et authentification : Supabase Inc. — supabase.com (région d'hébergement : [région choisie]).",
          "Moteur de production vidéo : serveur privé virtuel Hostinger — hostinger.com.",
        ] },
        { h: "Propriété intellectuelle", p: [
          "La marque VIDSELLA, le logo, l'interface et les contenus du site sont la propriété de l'éditeur. Toute reproduction sans autorisation écrite est interdite.",
          "Les vidéos produites pour un client lui sont cédées dans les conditions prévues par les Conditions générales de vente.",
        ] },
        { h: "Signalement", p: [`Pour signaler un contenu illicite ou exercer un droit, écrivez à ${SUPPORT}.`] },
      ],
    },
    en: {
      title: "Legal notice",
      sections: [
        { h: "Publisher", p: [
          "VIDSELLA is published by [Company name], a [legal form] with share capital of [amount], registered under RCCM number [number], tax ID [number], with its registered office at [full address, city, country].",
          `Publication director: [Full name]. Contact: ${SUPPORT} — [phone].`,
        ] },
        { h: "Hosting", p: [
          "Web application: Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, USA — vercel.com.",
          "Database and authentication: Supabase Inc. — supabase.com (hosting region: [chosen region]).",
          "Video production engine: Hostinger virtual private server — hostinger.com.",
        ] },
        { h: "Intellectual property", p: [
          "The VIDSELLA brand, logo, interface and site content belong to the publisher. Any reproduction without written permission is prohibited.",
          "Videos produced for a customer are licensed to them under the Terms of Sale.",
        ] },
        { h: "Reporting", p: [`To report unlawful content or exercise a right, write to ${SUPPORT}.`] },
      ],
    },
  },

  cgv: {
    fr: {
      title: "Conditions générales de vente",
      sections: [
        { h: "1. Objet", p: [
          "Les présentes conditions régissent la vente de tokens prépayés et la production de vidéos publicitaires générées par intelligence artificielle via VIDSELLA. Le service s'adresse aux professionnels (e-commerçants, marques, agences).",
        ] },
        { h: "2. Compte", p: [
          "L'accès au service nécessite un compte. Le client garantit l'exactitude des informations fournies et reste responsable de la confidentialité de ses identifiants.",
        ] },
        { h: "3. Tokens et prix", p: [
          "Les tokens s'achètent par packs ou par montant libre, au prix affiché dans la devise choisie par le client au moment de l'achat. Les packs incluent des tokens offerts, dont le pourcentage est indiqué sur chaque pack. Le montant libre est facturé au tarif de base, sans bonus, avec un minimum d'achat de 100 tokens. Les tokens sont crédités après confirmation du paiement et n'expirent pas tant que le compte est actif.",
          "Chaque vidéo consomme un nombre de tokens qui dépend de sa durée et de son style (face caméra, présentateur avec plans du produit, ou voix off sur plans du produit). Ce nombre est affiché avant la validation de la commande et c'est exactement celui qui est débité.",
          "Les tokens ne sont ni remboursables en argent, ni cessibles, sauf disposition légale impérative contraire.",
        ] },
        { h: "4. Commande et livraison", p: [
          "À la validation de la commande, les tokens correspondants sont déduits du solde. Les vidéos sont déposées dans un dossier Google Drive au nom du client, et un lien est envoyé par WhatsApp si un numéro a été fourni.",
          "Si la génération d'une vidéo échoue pour une raison technique, les tokens de cette vidéo sont recrédités automatiquement sur le solde.",
        ] },
        { h: "5. Contenus fournis par le client", p: [
          "Le client garantit disposer des droits sur les textes, images, marques et liens produits qu'il transmet, et que ses publicités respectent la loi et les règles des plateformes publicitaires. VIDSELLA peut refuser une commande à caractère illicite, trompeur, haineux ou portant atteinte aux droits de tiers.",
        ] },
        { h: "6. Droits sur les vidéos", p: [
          "Sous réserve du paiement, le client peut utiliser librement les vidéos livrées à des fins commerciales. Les vidéos sont générées par des services d'IA tiers et peuvent rester soumises à leurs conditions d'utilisation.",
        ] },
        { h: "7. Responsabilité", p: [
          "Le service est fourni avec diligence, mais les résultats générés par IA peuvent varier. La responsabilité de VIDSELLA est limitée au montant des tokens consommés pour la commande concernée.",
        ] },
        { h: "8. Droit applicable", p: [
          "Les présentes conditions sont soumises au droit [camerounais]. À défaut d'accord amiable, tout litige relève des tribunaux compétents de [Douala].",
        ] },
      ],
    },
    en: {
      title: "Terms of Sale",
      sections: [
        { h: "1. Purpose", p: [
          "These terms govern the sale of prepaid tokens and the production of AI-generated video ads through VIDSELLA. The service is intended for businesses (online stores, brands, agencies).",
        ] },
        { h: "2. Account", p: [
          "Using the service requires an account. The customer guarantees the accuracy of the information provided and is responsible for keeping their credentials confidential.",
        ] },
        { h: "3. Tokens and prices", p: [
          "Tokens are sold in packs or as a custom amount, at the price shown in the currency chosen by the customer at the time of purchase. Packs include free tokens, with the percentage shown on each pack. A custom amount is charged at the base rate, without bonus, with a minimum purchase of 100 tokens. Tokens are credited once payment is confirmed and do not expire while the account is active.",
          "Each video uses a number of tokens that depends on its length and style (to camera, presenter with product shots, or voice-over on product shots). This number is shown before the order is confirmed and is exactly the amount deducted.",
          "Tokens are not refundable in cash or transferable, unless mandatory law provides otherwise.",
        ] },
        { h: "4. Orders and delivery", p: [
          "When the order is confirmed, the corresponding tokens are deducted from the balance. Videos are placed in a Google Drive folder in the customer's name, and a link is sent on WhatsApp if a number was provided.",
          "If a video fails to generate for technical reasons, its tokens are automatically credited back to the balance.",
        ] },
        { h: "5. Customer content", p: [
          "The customer guarantees they hold the rights to the texts, images, brands and product links they submit, and that their ads comply with the law and ad platform policies. VIDSELLA may refuse any order that is unlawful, misleading, hateful or infringes third-party rights.",
        ] },
        { h: "6. Rights to the videos", p: [
          "Subject to payment, the customer may freely use delivered videos for commercial purposes. Videos are generated by third-party AI services and may remain subject to their terms of use.",
        ] },
        { h: "7. Liability", p: [
          "The service is provided with due care, but AI-generated results may vary. VIDSELLA's liability is limited to the value of the tokens used for the order concerned.",
        ] },
        { h: "8. Governing law", p: [
          "These terms are governed by [Cameroonian] law. Failing an amicable settlement, disputes fall under the competent courts of [Douala].",
        ] },
      ],
    },
  },

  confidentialite: {
    fr: {
      title: "Politique de confidentialité",
      sections: [
        { h: "Responsable du traitement", p: [`[Raison sociale], [adresse]. Contact : ${SUPPORT}.`] },
        { h: "Données collectées", p: [
          "Compte : nom ou nom de boutique, adresse e-mail, mot de passe (stocké sous forme chiffrée), langue préférée. Si vous utilisez Google : nom, e-mail et photo de profil transmis par Google.",
          "Commandes : liens et descriptions de produits, scripts, options choisies, numéro WhatsApp si fourni.",
          "Paiement : montant, devise, statut. Les données de carte ou de mobile money sont traitées par le prestataire de paiement et ne sont jamais stockées par VIDSELLA.",
          "Technique : pays déduit de l'adresse IP (pour afficher la bonne devise), journaux de connexion, messages échangés avec le service client.",
        ] },
        { h: "Finalités", p: [
          "Créer et sécuriser votre compte, produire et livrer vos vidéos, traiter vos paiements, répondre à vos demandes, prévenir la fraude et respecter nos obligations légales.",
        ] },
        { h: "Sous-traitants", p: [
          "Hébergement : Vercel, Supabase, Hostinger. Production vidéo : fal.ai (modèles d'Anthropic, OpenAI, Google, MiniMax et Alibaba), Creatomate. Livraison : Google (Drive), Meta (WhatsApp). Paiement : [prestataire]. Certains sont situés hors de votre pays ; les transferts sont encadrés par leurs engagements contractuels.",
        ] },
        { h: "Durées de conservation", p: [
          "Données de compte : durée de vie du compte, puis suppression sous 30 jours. Données de facturation : durée légale de conservation comptable. Messages du support : 3 ans après le dernier échange.",
        ] },
        { h: "Vos droits", p: [
          `Vous pouvez accéder à vos données, les rectifier, les supprimer, vous opposer à un traitement ou demander leur portabilité en écrivant à ${SUPPORT}. Vous pouvez supprimer votre compte à tout moment depuis Paramètres. Vous pouvez aussi saisir l'autorité de protection des données de votre pays.`,
        ] },
      ],
    },
    en: {
      title: "Privacy Policy",
      sections: [
        { h: "Data controller", p: [`[Company name], [address]. Contact: ${SUPPORT}.`] },
        { h: "Data we collect", p: [
          "Account: name or store name, email address, password (stored hashed), preferred language. If you use Google: the name, email and profile picture Google shares.",
          "Orders: product links and descriptions, scripts, selected options, WhatsApp number if provided.",
          "Payments: amount, currency, status. Card or mobile money details are handled by the payment provider and never stored by VIDSELLA.",
          "Technical: country inferred from your IP address (to show the right currency), sign-in logs, messages exchanged with support.",
        ] },
        { h: "Purposes", p: [
          "Creating and securing your account, producing and delivering your videos, processing payments, answering your requests, preventing fraud and meeting legal obligations.",
        ] },
        { h: "Processors", p: [
          "Hosting: Vercel, Supabase, Hostinger. Video production: fal.ai (models from Anthropic, OpenAI, Google, MiniMax and Alibaba), Creatomate. Delivery: Google (Drive), Meta (WhatsApp). Payments: [provider]. Some are located outside your country; transfers are covered by their contractual commitments.",
        ] },
        { h: "Retention", p: [
          "Account data: for the life of the account, then deleted within 30 days. Billing data: for the legal accounting retention period. Support messages: 3 years after the last exchange.",
        ] },
        { h: "Your rights", p: [
          `You can access, correct or delete your data, object to processing or request portability by writing to ${SUPPORT}. You can delete your account at any time from Settings. You may also contact the data protection authority in your country.`,
        ] },
      ],
    },
  },

  cookies: {
    fr: {
      title: "Politique cookies",
      sections: [
        { h: "Ce que nous utilisons", p: [
          "VIDSELLA n'utilise que des cookies strictement nécessaires au fonctionnement du site. Aucun cookie publicitaire ni de mesure d'audience tierce n'est déposé.",
        ] },
        { h: "Liste", p: [
          "sb-… : session de connexion sécurisée (Supabase), durée de la session.",
          "pa_locale : langue de l'interface, 12 mois.",
          "pa_currency : devise choisie manuellement, 12 mois.",
          "theme (stockage local du navigateur) : thème clair ou sombre.",
        ] },
        { h: "Gérer les cookies", p: [
          "Vous pouvez les supprimer depuis les réglages de votre navigateur. Sans le cookie de session, vous ne pourrez plus rester connecté.",
          "Si des outils de mesure d'audience sont ajoutés, un bandeau de consentement sera affiché au préalable.",
        ] },
      ],
    },
    en: {
      title: "Cookie Policy",
      sections: [
        { h: "What we use", p: [
          "VIDSELLA only uses cookies that are strictly necessary for the site to work. No advertising or third-party analytics cookies are set.",
        ] },
        { h: "List", p: [
          "sb-…: secure sign-in session (Supabase), for the length of the session.",
          "pa_locale: interface language, 12 months.",
          "pa_currency: manually chosen currency, 12 months.",
          "theme (browser local storage): light or dark theme.",
        ] },
        { h: "Managing cookies", p: [
          "You can delete them in your browser settings. Without the session cookie, you won't stay signed in.",
          "If analytics tools are ever added, a consent banner will be shown first.",
        ] },
      ],
    },
  },
};
