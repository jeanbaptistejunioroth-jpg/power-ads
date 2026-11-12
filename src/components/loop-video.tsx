"use client";

import { useEffect, useRef, useState } from "react";

// Vidéos de démonstration (public/media) : copies muettes 360×640 des publicités d'exemple.
const VIDEOS = [1, 2, 3, 4, 5, 6].map((n) => ({ src: `/media/pub-${n}.mp4`, poster: `/media/pub-${n}.jpg` }));

// Ordre tiré au hasard une fois par chargement de page : l'emplacement n prend la n-ième vidéo,
// donc des emplacements voisins ne montrent jamais la même vidéo (tant qu'il y en a assez).
let order: number[] | null = null;
function shuffledOrder() {
  if (!order) {
    order = VIDEOS.map((_, i) => i);
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
  }
  return order;
}

/**
 * Vidéo décorative : muette, en boucle, non interactive. Ne se lit que lorsqu'elle est visible ;
 * reste sur l'image d'aperçu si l'appareil demande moins de mouvement ou économise les données.
 */
export function LoopVideo({ slot, className = "" }: { slot: number; className?: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  // Choisie après l'affichage : le hasard côté navigateur ne doit pas différer du rendu serveur.
  const [index, setIndex] = useState<number | null>(null);
  useEffect(() => setIndex(shuffledOrder()[slot % VIDEOS.length]), [slot]);

  useEffect(() => {
    const video = ref.current;
    if (!video || index === null) return;
    video.muted = true;
    const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;
    if (saveData || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) void video.play().catch(() => {});
        else video.pause();
      },
      { rootMargin: "120px" },
    );
    observer.observe(video);
    return () => observer.disconnect();
  }, [index]);

  const current = index === null ? null : VIDEOS[index];
  return (
    <video
      ref={ref}
      src={current?.src}
      poster={current?.poster}
      muted
      loop
      playsInline
      preload="none"
      disablePictureInPicture
      disableRemotePlayback
      tabIndex={-1}
      aria-hidden
      className={`pointer-events-none select-none object-cover ${className}`}
    />
  );
}
