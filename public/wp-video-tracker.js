/**
 * YouTube Video Tracker per landing page WordPress
 *
 * Questo script va inserito nel template Elementor (widget HTML).
 * Traccia play, progresso (25/50/75%) e completamento del video,
 * e invia gli eventi al CRM.
 *
 * REQUISITI nel template Elementor:
 * 1. Un <div id="yt-player"></div> dove vuoi il video
 * 2. Questo script dopo il div
 *
 * I valori TRACKING_TOKEN e YOUTUBE_VIDEO_ID vengono letti da
 * campi ACF tramite attributi data-* nel div, oppure puoi
 * hardcodarli nel template.
 *
 * Esempio HTML nel widget Elementor:
 *
 * <div id="yt-player"
 *      data-video-id="{{acf_video_youtube_id}}"
 *      data-token="{{acf_tracking_token}}">
 * </div>
 * <script src="https://TUODOMINIO-CRM/wp-video-tracker.js"></script>
 *
 * Oppure copia/incolla il contenuto inline nel widget HTML di Elementor.
 */

(function () {
  "use strict";

  // Leggi configurazione dal div
  var container = document.getElementById("yt-player");
  if (!container) {
    console.warn("[KW Tracker] #yt-player non trovato");
    return;
  }

  var VIDEO_ID = container.getAttribute("data-video-id");
  var TOKEN = container.getAttribute("data-token");
  // URL del CRM — cambia in produzione
  var CRM_URL = container.getAttribute("data-crm-url") || "https://crm.karalisweb.net";
  var API_ENDPOINT = CRM_URL + "/api/public/video-view";

  if (!VIDEO_ID || !TOKEN) {
    console.warn("[KW Tracker] data-video-id o data-token mancanti");
    return;
  }

  // Leggi parametro utm dalla URL (solo utm=client viene tracciato dal CRM)
  var urlParams = new URLSearchParams(window.location.search);
  var UTM = urlParams.get("utm") || "";

  // Stato tracking
  var milestones = { 25: false, 50: false, 75: false };
  var hasPlayed = false;
  var isComplete = false;
  var checkInterval = null;

  // Invia evento al CRM
  function sendEvent(event, percent) {
    var body = { token: TOKEN, event: event, utm: UTM };
    if (typeof percent === "number") body.percent = percent;

    try {
      // Usa sendBeacon se disponibile (non blocca navigazione)
      if (navigator.sendBeacon) {
        navigator.sendBeacon(API_ENDPOINT, JSON.stringify(body));
      } else {
        fetch(API_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          keepalive: true,
        });
      }
    } catch (e) {
      // Silenzioso — non deve rompere la pagina
    }
  }

  // Segnala apertura pagina
  sendEvent("play", 0);

  // Carica YouTube IFrame API
  var tag = document.createElement("script");
  tag.src = "https://www.youtube.com/iframe_api";
  var firstScript = document.getElementsByTagName("script")[0];
  firstScript.parentNode.insertBefore(tag, firstScript);

  // Callback globale richiesta da YouTube API
  window.onYouTubeIframeAPIReady = function () {
    var player = new YT.Player("yt-player", {
      videoId: VIDEO_ID,
      playerVars: {
        rel: 0, // Non mostrare video correlati
        modestbranding: 1,
        playsinline: 1,
      },
      events: {
        onStateChange: function (e) {
          if (e.data === YT.PlayerState.PLAYING) {
            if (!hasPlayed) {
              hasPlayed = true;
              sendEvent("play");
            }
            // Avvia polling progresso
            if (!checkInterval) {
              checkInterval = setInterval(function () {
                checkProgress(player);
              }, 2000);
            }
          }

          if (e.data === YT.PlayerState.ENDED && !isComplete) {
            isComplete = true;
            sendEvent("complete", 100);
            if (checkInterval) {
              clearInterval(checkInterval);
              checkInterval = null;
            }
          }

          // Ferma polling se in pausa
          if (e.data === YT.PlayerState.PAUSED) {
            if (checkInterval) {
              clearInterval(checkInterval);
              checkInterval = null;
            }
          }
        },
      },
    });
  };

  function checkProgress(player) {
    if (!player || !player.getDuration) return;
    var duration = player.getDuration();
    if (duration <= 0) return;

    var current = player.getCurrentTime();
    var percent = Math.round((current / duration) * 100);

    // Invia milestone
    [25, 50, 75].forEach(function (m) {
      if (percent >= m && !milestones[m]) {
        milestones[m] = true;
        sendEvent("progress", m);
      }
    });
  }
})();
