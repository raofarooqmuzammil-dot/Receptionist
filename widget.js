/*!
 * CleanBot Widget Loader
 * Embed code: <script src="https://your-domain/widget.js" data-client-id="UUID"></script>
 * Renders a floating chat bubble that opens an iframe to the chat panel.
 */
(function () {
  'use strict';

  // ============================================================
  // CONFIG
  // ============================================================
  const SUPABASE_URL = 'https://ipelkbnxcfgpqfpntqkl.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlwZWxrYm54Y2ZncHFmcG50cWtsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc5MDk4NjUsImV4cCI6MjA5MzQ4NTg2NX0.AeJzq_bYXkfnE_d4gjaSF3e8iBdubTlXeVB2y8AczTE';
  const DEFAULT_COLOR = '#6366f1';

  // ============================================================
  // GUARDS
  // ============================================================
  // Prevent double-loading if pasted twice
  if (window.__cleanbotLoaded) {
    console.warn('[CleanBot] Widget already loaded — skipping.');
    return;
  }
  window.__cleanbotLoaded = true;

  // Find the script tag (handles both currentScript and fallback)
  const script = document.currentScript || (function () {
    const all = document.getElementsByTagName('script');
    for (let i = all.length - 1; i >= 0; i--) {
      if (all[i].src && all[i].src.indexOf('widget.js') !== -1) return all[i];
    }
    return null;
  })();

  if (!script) {
    console.error('[CleanBot] Could not locate the widget script tag.');
    return;
  }

  const clientId = script.getAttribute('data-client-id');
  if (!clientId) {
    console.error('[CleanBot] data-client-id attribute is required on the <script> tag.');
    return;
  }

  // Derive base URL from script src
  const scriptSrc = script.src;
  const baseUrl = scriptSrc.replace(/\/widget\.js(\?.*)?$/, '');

  // ============================================================
  // FETCH WIDGET CONFIG (business name, bot name, color)
  // ============================================================
  function fetchConfig() {
    return fetch(SUPABASE_URL + '/rest/v1/rpc/get_widget_config', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ client_uuid: clientId }),
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (Array.isArray(data) && data.length > 0) return data[0];
        console.error('[CleanBot] No active client found for ID:', clientId);
        return null;
      })
      .catch(function (err) {
        console.error('[CleanBot] Failed to fetch widget config:', err);
        return null;
      });
  }

  // ============================================================
  // INJECT STYLES
  // ============================================================
  function injectStyles(color) {
    const css = `
      #cleanbot-launcher {
        position: fixed; bottom: 28px; right: 28px;
        width: 60px; height: 60px; border-radius: 50%;
        background: linear-gradient(135deg, ${color}, ${shade(color, -20)});
        border: none; cursor: pointer; z-index: 2147483646;
        display: flex; align-items: center; justify-content: center;
        box-shadow: 0 8px 32px ${hexToRgba(color, 0.5)};
        transition: transform 0.2s, box-shadow 0.2s;
        font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
      }
      #cleanbot-launcher:hover { transform: scale(1.08); }
      #cleanbot-launcher:focus-visible { outline: 2px solid #fff; outline-offset: 3px; }
      #cleanbot-launcher svg { width: 26px; height: 26px; fill: white; }
      #cleanbot-launcher.open svg { width: 20px; height: 20px; }

      #cleanbot-pulse {
        position: fixed; bottom: 28px; right: 28px;
        width: 60px; height: 60px; border-radius: 50%;
        background: ${hexToRgba(color, 0.3)};
        z-index: 2147483645; pointer-events: none;
        animation: cleanbotPulse 2.5s ease-out infinite;
      }
      @keyframes cleanbotPulse {
        0% { transform: scale(1); opacity: 0.6; }
        100% { transform: scale(1.8); opacity: 0; }
      }
      #cleanbot-pulse.hidden { display: none; }

      #cleanbot-iframe {
        position: fixed; bottom: 100px; right: 20px;
        width: 380px; height: 600px; max-width: calc(100vw - 40px); max-height: calc(100vh - 130px);
        border: none; border-radius: 20px; background: transparent;
        z-index: 2147483644; box-shadow: 0 32px 80px rgba(0,0,0,0.4);
        transform: scale(0.9) translateY(16px); transform-origin: bottom right;
        opacity: 0; pointer-events: none;
        transition: all 0.35s cubic-bezier(0.34,1.2,0.64,1);
      }
      #cleanbot-iframe.open { transform: scale(1) translateY(0); opacity: 1; pointer-events: all; }

      @media (max-width: 480px) {
        #cleanbot-iframe {
          width: calc(100vw - 20px); right: 10px; bottom: 90px;
          height: 72vh;
        }
        #cleanbot-launcher, #cleanbot-pulse { bottom: 20px; right: 20px; }
      }
      @media (prefers-reduced-motion: reduce) {
        #cleanbot-pulse { animation: none !important; }
        #cleanbot-iframe { transition: opacity 0.15s ease !important; transform: none !important; }
      }
    `;
    const styleEl = document.createElement('style');
    styleEl.id = 'cleanbot-styles';
    styleEl.textContent = css;
    document.head.appendChild(styleEl);
  }

  // ============================================================
  // RENDER LAUNCHER + IFRAME
  // ============================================================
  function render(config) {
    if (!config) return;

    const color = config.bot_color || DEFAULT_COLOR;
    injectStyles(color);

    // Build iframe URL with config params
    const params = new URLSearchParams({
      clientId: config.id,
      botName: config.bot_name || 'Assistant',
      businessName: config.business_name || '',
      botColor: color,
    });
    const iframeUrl = baseUrl + '/widget.html?' + params.toString();

    // ---- Pulse ----
    const pulse = document.createElement('div');
    pulse.id = 'cleanbot-pulse';
    pulse.setAttribute('aria-hidden', 'true');

    // ---- Launcher button ----
    const launcher = document.createElement('button');
    launcher.id = 'cleanbot-launcher';
    launcher.setAttribute('aria-label', 'Open chat');
    launcher.setAttribute('aria-expanded', 'false');
    launcher.innerHTML = chatIcon();

    // ---- Iframe ----
    const iframe = document.createElement('iframe');
    iframe.id = 'cleanbot-iframe';
    iframe.title = 'Chat with ' + (config.bot_name || 'Assistant');
    iframe.allow = 'clipboard-write';

    let isOpen = false;
    let iframeLoaded = false;

    function open() {
      // Lazy-load iframe on first open for faster initial page render
      if (!iframeLoaded) {
        iframe.src = iframeUrl;
        iframeLoaded = true;
      }
      iframe.classList.add('open');
      launcher.classList.add('open');
      launcher.innerHTML = closeIcon();
      launcher.setAttribute('aria-label', 'Close chat');
      launcher.setAttribute('aria-expanded', 'true');
      pulse.classList.add('hidden');
      isOpen = true;
    }

    function close() {
      iframe.classList.remove('open');
      launcher.classList.remove('open');
      launcher.innerHTML = chatIcon();
      launcher.setAttribute('aria-label', 'Open chat');
      launcher.setAttribute('aria-expanded', 'false');
      isOpen = false;
    }

    function toggle() {
      isOpen ? close() : open();
    }

    launcher.addEventListener('click', toggle);

    // Listen for "close" messages from inside the iframe
    window.addEventListener('message', function (event) {
      if (event.source !== iframe.contentWindow) return;
      if (event.data && event.data.type === 'cleanbot:close') close();
    });

    // Close on Escape key
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && isOpen) close();
    });

    document.body.appendChild(pulse);
    document.body.appendChild(launcher);
    document.body.appendChild(iframe);
  }

  // ============================================================
  // ICONS
  // ============================================================
  function chatIcon() {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>';
  }
  function closeIcon() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
  }

  // ============================================================
  // UTILS
  // ============================================================
  function hexToRgba(hex, alpha) {
    const m = hex.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
    if (!m) return 'rgba(99,102,241,' + alpha + ')';
    return 'rgba(' + parseInt(m[1], 16) + ',' + parseInt(m[2], 16) + ',' + parseInt(m[3], 16) + ',' + alpha + ')';
  }
  function shade(hex, percent) {
    const m = hex.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
    if (!m) return hex;
    let r = parseInt(m[1], 16), g = parseInt(m[2], 16), b = parseInt(m[3], 16);
    const t = percent < 0 ? 0 : 255, p = Math.abs(percent) / 100;
    r = Math.round((t - r) * p) + r;
    g = Math.round((t - g) * p) + g;
    b = Math.round((t - b) * p) + b;
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }

  // ============================================================
  // BOOT
  // ============================================================
  function boot() {
    fetchConfig().then(render);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
