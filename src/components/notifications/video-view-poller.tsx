"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";

const POLL_INTERVAL_MS = 10_000; // 10 secondi

interface VideoView {
  leadId: string;
  leadName: string;
  viewedAt: string;
  viewsCount: number;
}

export function VideoViewPoller() {
  const sinceRef = useRef<string>(new Date().toISOString());
  const notifiedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch(
          `/api/notifications/video-views?since=${encodeURIComponent(sinceRef.current)}`
        );
        if (!res.ok) return;

        const data = await res.json();
        const views: VideoView[] = data.views || [];

        for (const view of views) {
          // Dedup: non notificare lo stesso lead+viewedAt due volte
          const key = `${view.leadId}-${view.viewedAt}`;
          if (notifiedRef.current.has(key)) continue;
          notifiedRef.current.add(key);

          toast(`${view.leadName} sta guardando il video!`, {
            description: `View #${view.viewsCount}`,
            duration: 10000,
            action: {
              label: "Apri",
              onClick: () => {
                window.location.href = `/leads/${view.leadId}`;
              },
            },
          });
        }

        // Aggiorna since al timestamp corrente
        sinceRef.current = new Date().toISOString();
      } catch {
        // Silently fail — il prossimo poll riproverà
      }
    };

    const interval = setInterval(poll, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  return null; // Nessun render, solo side-effect
}
