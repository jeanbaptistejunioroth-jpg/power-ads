import { Inter, Instrument_Serif } from "next/font/google";

// Inter pour le texte, Instrument Serif italique pour les mots mis en valeur dans les grands titres.
export const sans = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
export const serif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["italic", "normal"],
  variable: "--font-instrument",
  display: "swap",
});
