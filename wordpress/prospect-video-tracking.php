<?php
/**
 * Prospect Video Tracking
 *
 * Aggiunge tracking automatico sulle landing page dei Prospect.
 * Quando il prospect apre la pagina e guarda il video YouTube,
 * gli eventi vengono inviati al CRM (crm.karalisdemo.it).
 *
 * Da aggiungere come snippet in WordPress (Code Snippets plugin)
 * o nel functions.php del child theme.
 *
 * Requisiti:
 * - CPT "prospect" con campo ACF "prospect_tracking_token"
 * - Video YouTube embeddato via Elementor Video widget
 */

add_action('wp_footer', function () {
    // Solo su singoli post del CPT "prospect"
    if (!is_singular('prospect')) {
        return;
    }

    // Leggi il tracking token dal campo ACF
    $token = get_field('prospect_tracking_token');
    if (empty($token)) {
        return;
    }

    // URL del CRM per il tracking
    $crm_url = 'https://crm.karalisdemo.it/api/public/video-view';
    ?>
    <script>
    (function() {
        var CRM_URL = <?php echo json_encode($crm_url); ?>;
        var TOKEN = <?php echo json_encode($token); ?>;
        var sent = {};

        function sendEvent(event, percent) {
            if (sent[event + (percent || '')]) return;
            sent[event + (percent || '')] = true;

            var data = { token: TOKEN, event: event };
            if (typeof percent === 'number') data.percent = percent;

            if (navigator.sendBeacon) {
                navigator.sendBeacon(CRM_URL, JSON.stringify(data));
            } else {
                fetch(CRM_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data),
                    keepalive: true
                }).catch(function() {});
            }
        }

        // Evento: pagina aperta (view)
        sendEvent('play');

        // YouTube IFrame API — intercetta play/progress/complete
        // Elementor usa lazy load, quindi l'iframe potrebbe non esistere subito
        var checkInterval = setInterval(function() {
            var iframe = document.querySelector('iframe[src*="youtube"], iframe[data-lazy-src*="youtube"]');
            if (!iframe) return;
            clearInterval(checkInterval);

            // Carica YouTube IFrame API
            if (!window.YT) {
                var tag = document.createElement('script');
                tag.src = 'https://www.youtube.com/iframe_api';
                document.head.appendChild(tag);
            }

            function initPlayer() {
                // Assicurati che l'iframe abbia enablejsapi=1
                var src = iframe.src || '';
                if (src && src.indexOf('enablejsapi=1') === -1) {
                    iframe.src = src + (src.indexOf('?') > -1 ? '&' : '?') + 'enablejsapi=1';
                }

                try {
                    var player = new YT.Player(iframe, {
                        events: {
                            onStateChange: function(e) {
                                if (e.data === YT.PlayerState.PLAYING) {
                                    sendEvent('play');
                                    startProgressTracking(player);
                                }
                                if (e.data === YT.PlayerState.ENDED) {
                                    sendEvent('complete', 100);
                                }
                            }
                        }
                    });
                } catch(err) {
                    // Se non riesce ad agganciare il player, almeno abbiamo il view
                }
            }

            if (window.YT && window.YT.Player) {
                initPlayer();
            } else {
                window.onYouTubeIframeAPIReady = initPlayer;
            }
        }, 1000);

        // Dopo 30 secondi smetti di cercare l'iframe
        setTimeout(function() { clearInterval(checkInterval); }, 30000);

        // Progress tracking — ogni 10 secondi controlla la percentuale
        function startProgressTracking(player) {
            var progressInterval = setInterval(function() {
                try {
                    var duration = player.getDuration();
                    var current = player.getCurrentTime();
                    if (duration > 0) {
                        var percent = Math.round((current / duration) * 100);
                        // Manda aggiornamento ogni 25%
                        if (percent >= 25 && !sent['progress25']) { sendEvent('progress', 25); sent['progress25'] = true; }
                        if (percent >= 50 && !sent['progress50']) { sendEvent('progress', 50); sent['progress50'] = true; }
                        if (percent >= 75 && !sent['progress75']) { sendEvent('progress', 75); sent['progress75'] = true; }
                        if (percent >= 95) {
                            sendEvent('complete', 100);
                            clearInterval(progressInterval);
                        }
                    }
                    // Se il video è in pausa o finito, ferma il tracking
                    var state = player.getPlayerState();
                    if (state === YT.PlayerState.ENDED || state === YT.PlayerState.PAUSED) {
                        clearInterval(progressInterval);
                    }
                } catch(err) {
                    clearInterval(progressInterval);
                }
            }, 10000);
        }
    })();
    </script>
    <?php
});
