import hkSvg from "../../assets/maps/hong-kong.svg?raw";
import scSvg from "../../assets/maps/sichuan.svg?raw";

import germanySvg from "../../assets/maps/germany.svg?raw";

const mapSvgs = { "hong-kong": hkSvg, sichuan: scSvg, germany: germanySvg };

function mountViewer(overlay) {
  const photosData = JSON.parse(overlay.dataset.photos);
  const goToPhotoLabel = overlay.dataset.goToPhoto;
  const controller = new AbortController();
  const { signal } = controller;
  const pageUrl = window.location.href;
  const background = [...document.querySelectorAll("body > header, body > main, body > footer")]
    .filter((element) => !element.inert);
  let opener = null;
  let previousOverflow = "";
  let openFrame = 0;
  const track = overlay.querySelector("#film-strip-track");
  const closeBtn = overlay.querySelector("#film-strip-close");
  const prevBtn = overlay.querySelector("#film-strip-prev");
  const nextBtn = overlay.querySelector("#film-strip-next");
  const counter = overlay.querySelector("#film-strip-counter");
  const seriesEl = overlay.querySelector("#film-strip-series");
  const bgA = overlay.querySelector("#film-strip-bg-a");
  const bgB = overlay.querySelector("#film-strip-bg-b");
  const bar = overlay.querySelector("#film-strip-bar");
  const dots = overlay.querySelector("#film-strip-dots");
  const locationName = overlay.querySelector("#film-strip-location-name");
  const mapCard = overlay.querySelector("#film-strip-map-card");
  const mapInner = overlay.querySelector("#film-strip-map-inner");
  const mapLabel = overlay.querySelector("#film-strip-map-label");

  let currentMapRegion = null;
  let mapSwapTimer = null;
  let currentIndex = 0;
  let bgToggle = false;
  let rafId = null;
  let visiblePhotos = photosData;
  let hideUiTimer = null;
  let isNavigating = false;
  let navFallbackTimer = null;
  let closing = false;
  const isTouchDevice = window.matchMedia("(pointer: coarse)").matches;
  const UI_HIDE_DELAY = isTouchDevice ? 8000 : 3000;

  function showUI() {
    if (bar) bar.style.opacity = "1";
    if (dots) dots.style.opacity = "1";
    if (prevBtn) prevBtn.style.opacity = "1";
    if (nextBtn) nextBtn.style.opacity = "1";
    clearTimeout(hideUiTimer);
    hideUiTimer = setTimeout(hideUI, UI_HIDE_DELAY);
  }

  function hideUI() {
    if (overlay.querySelector(":focus-visible")) return;
    if (bar) bar.style.opacity = "0";
    if (dots) dots.style.opacity = "0";
    if (prevBtn) prevBtn.style.opacity = "0";
    if (nextBtn) nextBtn.style.opacity = "0";
  }

  function loadImage(slug) {
    const frame = document.getElementById(`film-frame-${slug}`);
    if (!frame) return;
    const img = frame.querySelector("img");
    if (img && img.dataset.src && !img.src.startsWith("http")) {
      img.src = img.dataset.src;
    }
  }

  function loadNearbyImages(idx) {
    const len = visiblePhotos.length;
    for (let i = idx - 2; i <= idx + 2; i++) {
      const wrapped = ((i % len) + len) % len;
      const p = visiblePhotos[wrapped];
      if (p) loadImage(p.slug);
    }
  }

  function setBackground(idx) {
    const p = visiblePhotos[idx];
    if (!p) return;
    if (bgToggle) {
      bgB.src = p.src;
      bgB.style.opacity = "1";
      bgA.style.opacity = "0";
    } else {
      bgA.src = p.src;
      bgA.style.opacity = "1";
      bgB.style.opacity = "0";
    }
    bgToggle = !bgToggle;
  }

  const DOT_WINDOW = 7;
  let dotWindowStart = 0;

  function renderDots() {
    if (!dots) return;
    const focusedDot = dots.contains(document.activeElement) ? document.activeElement : null;
    const focusedIndex = focusedDot?.dataset.index;
    dots.innerHTML = "";
    const len = visiblePhotos.length;
    if (len <= 1) return;

    if (len <= 8) {
      // Show all dots
      visiblePhotos.forEach((_, i) => {
        const dot = createDot(i);
        if (i === currentIndex) dot.classList.add("active");
        dots.appendChild(dot);
      });
      dotWindowStart = 0;
    } else {
      // Sliding window
      dotWindowStart = Math.max(0, Math.min(currentIndex - 3, len - DOT_WINDOW));
      const windowEnd = Math.min(len, dotWindowStart + DOT_WINDOW);

      // Left fade hint
      if (dotWindowStart > 0) {
        const hint = createDot(dotWindowStart - 1);
        hint.classList.add("dot-fade");
        dots.appendChild(hint);
      }

      for (let i = dotWindowStart; i < windowEnd; i++) {
        const dot = createDot(i);
        if (i === currentIndex) dot.classList.add("active");
        dots.appendChild(dot);
      }

      // Right fade hint
      if (windowEnd < len) {
        const hint = createDot(windowEnd);
        hint.classList.add("dot-fade");
        dots.appendChild(hint);
      }
    }
    if (focusedIndex !== undefined) {
      const replacement = [...dots.querySelectorAll("button")]
        .find((button) => button.dataset.index === focusedIndex);
      (replacement ?? dots.querySelector(".active"))?.focus({ preventScroll: true });
    }
  }

  function createDot(index) {
    const dot = document.createElement("button");
    dot.className = "film-strip-dot";
    dot.dataset.index = String(index);
    dot.setAttribute("aria-label", goToPhotoLabel.replace("{n}", index + 1));
    dot.addEventListener("click", () => goTo(index));
    return dot;
  }

  function refreshDotActive() {
    if (!dots) return;
    const len = visiblePhotos.length;
    if (len <= 1) return;

    if (len <= 8) {
      dots.querySelectorAll(".film-strip-dot").forEach((d, i) => {
        d.classList.toggle("active", i === currentIndex);
      });
    } else {
      // Sliding window: rebuild when active changes
      const newStart = Math.max(0, Math.min(currentIndex - 3, len - DOT_WINDOW));
      if (newStart !== dotWindowStart) {
        renderDots();
      } else {
        // Rebuild for simplicity (tiny performance cost, always correct)
        renderDots();
      }
    }
  }

  function updateMap(p) {
    if (!mapCard || !mapInner || !mapLabel || !locationName) return;
    const region = p?.mapRegion;
    const hasMap = region && mapSvgs[region];
    if (hasMap) {
      mapCard.classList.add("visible");
      locationName.classList.remove("hidden");
      locationName.textContent = p.location || "";
      mapLabel.textContent = p.location || "";
      if (region !== currentMapRegion) {
        mapInner.style.opacity = "0";
        clearTimeout(mapSwapTimer);
        mapSwapTimer = setTimeout(() => {
          mapInner.innerHTML = mapSvgs[region];
          mapInner.style.opacity = "1";
        }, 200);
        currentMapRegion = region;
      }
    } else {
      mapCard.classList.remove("visible");
      locationName.classList.add("hidden");
      currentMapRegion = null;
    }
  }

  function updateInfo() {
    const p = visiblePhotos[currentIndex];
    if (counter) counter.textContent = `${currentIndex + 1} / ${visiblePhotos.length}`;
    if (seriesEl) seriesEl.textContent = p?.seriesLabel ?? "";
    updateMap(p);
    refreshDotActive();
  }

  function setCurrentIndex(idx) {
    if (idx === currentIndex) return;
    currentIndex = idx;
    setBackground(idx);
    updateInfo();
    loadNearbyImages(idx);
  }

  function scrollToFrame(idx) {
    const frame = document.getElementById(`film-frame-${visiblePhotos[idx].slug}`);
    if (!frame) return;
    const frameLeft = frame.offsetLeft;
    const frameWidth = frame.offsetWidth;
    const target = frameLeft - track.offsetWidth / 2 + frameWidth / 2;
    track.scrollTo({ left: target, behavior: "smooth" });
  }

  function open(card, fromHistory = false) {
    const slug = card.dataset.photoId;
    closing = false;
    // Reset state for fresh open
    // -1, not 0: setCurrentIndex() bails out when the index is unchanged, so
    // resetting to 0 silently skipped frame 0 and left a stale counter.
    currentIndex = -1;
    bgToggle = false;
    isNavigating = false;
    currentMapRegion = null;
    clearTimeout(mapSwapTimer);
    clearTimeout(navFallbackTimer);

    // Check active filter
    const activeBtn = document.querySelector(".filter-btn.filter-active");
    const filter = activeBtn?.dataset?.filter;
    if (filter && filter !== "all") {
      visiblePhotos = photosData.filter((p) => p.series === filter);
      photosData.forEach((p) => {
        const frame = document.getElementById(`film-frame-${p.slug}`);
        if (frame) {
          frame.style.display = p.series === filter ? "" : "none";
        }
      });
    } else {
      visiblePhotos = photosData;
      photosData.forEach((p) => {
        const frame = document.getElementById(`film-frame-${p.slug}`);
        if (frame) frame.style.display = "";
      });
    }

    const idx = visiblePhotos.findIndex((p) => p.slug === slug);
    if (idx === -1) return;
    renderDots();
    setCurrentIndex(idx);

    overlay.classList.remove("opacity-0", "pointer-events-none");
    overlay.setAttribute("aria-hidden", "false");
    overlay.inert = false;
    opener = card;
    previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    background.forEach((element) => { element.inert = true; });
    closeBtn.focus({ preventScroll: true });
    showUI();
    if (!fromHistory) {
      const scrollPosition = { scrollX: window.scrollX, scrollY: window.scrollY };
      history.replaceState({ ...history.state, ...scrollPosition }, "");
      history.pushState({ ...history.state, filmStripPhoto: slug }, "");
    }

    openFrame = requestAnimationFrame(() => {
      const frame = document.getElementById(`film-frame-${slug}`);
      if (frame) {
        track.scrollTo({ left: frame.offsetLeft - track.offsetWidth / 2 + frame.offsetWidth / 2, behavior: "instant" });
      }
      startRafLoop();
      loadNearbyImages(idx);
    });
  }

  function close() {
    if (closing) return;
    closing = true;
    if (history.state?.filmStripPhoto) history.back();
    else hide();
  }

  function hide({ restoreFocus = true } = {}) {
    if (overlay.inert) return;
    background.forEach((element) => { element.inert = false; });
    if (restoreFocus) opener?.focus({ preventScroll: true });
    else if (overlay.contains(document.activeElement)) document.activeElement.blur();
    opener = null;
    closing = false;
    overlay.classList.add("opacity-0", "pointer-events-none");
    overlay.setAttribute("aria-hidden", "true");
    // pointer-events-none does not stop Tab; inert keeps the closed strip's
    // arrows, dots and Close button out of the tab order entirely.
    overlay.inert = true;
    document.body.style.overflow = previousOverflow;
    cancelAnimationFrame(openFrame);
    stopRafLoop();
    clearTimeout(hideUiTimer);
    clearTimeout(navFallbackTimer);
    isNavigating = false;
    if (mapCard) mapCard.classList.remove("visible");
    currentMapRegion = null;
    clearTimeout(mapSwapTimer);
  }

  function snapToClosest() {
    const viewCenter = track.scrollLeft + track.offsetWidth / 2;
    let closestIdx = currentIndex;
    let closestDist = Infinity;
    visiblePhotos.forEach((p, i) => {
      const frame = document.getElementById(`film-frame-${p.slug}`);
      if (!frame) return;
      if (frame.style.display === "none") return;
      const frameCenter = frame.offsetLeft + frame.offsetWidth / 2;
      const dist = Math.abs(viewCenter - frameCenter);
      if (dist < closestDist) { closestDist = dist; closestIdx = i; }
    });
    if (closestIdx >= 0 && closestIdx < visiblePhotos.length) {
      setCurrentIndex(closestIdx);
    }
  }

  function goTo(idx) {
    if (visiblePhotos.length === 0) return;
    clearTimeout(navFallbackTimer);

    // Wrap around
    if (idx < 0) idx = visiblePhotos.length - 1;
    if (idx >= visiblePhotos.length) idx = 0;

    isNavigating = true;
    setCurrentIndex(idx);
    scrollToFrame(idx);
    showUI();

    // Fallback for browsers without scrollend (Safari/iOS)
    // Must be longer than smooth scroll duration on mobile (~800ms)
    navFallbackTimer = setTimeout(() => {
      isNavigating = false;
      snapToClosest();
    }, 800);
  }

  function updateFrameStyles() {
    const viewCenter = track.scrollLeft + track.offsetWidth / 2;
    visiblePhotos.forEach((p) => {
      const frame = document.getElementById(`film-frame-${p.slug}`);
      if (!frame) return;
      if (frame.style.display === "none") return;
      const frameCenter = frame.offsetLeft + frame.offsetWidth / 2;
      const dist = Math.abs(frameCenter - viewCenter);
      const normalized = Math.min(1, dist / (track.offsetWidth * 0.55));
      const opacity = (1 - normalized * 1.4).toFixed(2);
      const scale = (1 - normalized * 0.35).toFixed(3);
      const inner = frame.querySelector(".film-frame-inner");
      if (inner) {
        inner.style.opacity = Math.max(0.1, opacity);
        inner.style.transform = `scale(${Math.max(0.7, scale)})`;
      }
    });
  }

  function startRafLoop() {
    stopRafLoop();
    let lastCenter = -1;
    function loop() {
      if (!overlay || overlay.classList.contains("opacity-0")) {
        stopRafLoop();
        return;
      }
      const viewCenter = track.scrollLeft + track.offsetWidth / 2;
      if (Math.abs(viewCenter - lastCenter) > 0.5) {
        lastCenter = viewCenter;
        updateFrameStyles();
        // Only snap when user is manually scrolling (not programmatic navigation)
        if (!isNavigating) {
          snapToClosest();
        }
      }
      rafId = requestAnimationFrame(loop);
    }
    rafId = requestAnimationFrame(loop);
  }

  function stopRafLoop() {
    if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
  }

  // Open on photo click
  document.addEventListener("click", (e) => {
    const card = e.target.closest("[data-photo-id]");
    if (!card) return;
    if (overlay.classList.contains("opacity-0")) {
      e.preventDefault();
      e.stopPropagation();
      open(card);
    }
  }, { signal });

  // Close
  closeBtn?.addEventListener("click", (e) => { e.stopPropagation(); close(); }, { signal });

  // Navigation buttons
  prevBtn?.addEventListener("click", (e) => { e.stopPropagation(); if (!overlay.classList.contains("opacity-0")) goTo(currentIndex - 1); }, { signal });
  nextBtn?.addEventListener("click", (e) => { e.stopPropagation(); if (!overlay.classList.contains("opacity-0")) goTo(currentIndex + 1); }, { signal });

  // Show UI on interaction
  overlay?.addEventListener("mousemove", () => { if (!overlay.classList.contains("opacity-0")) showUI(); }, { signal });
  overlay?.addEventListener("touchstart", () => { if (!overlay.classList.contains("opacity-0")) showUI(); }, { signal, passive: true });

  // Keyboard — the closed strip also answers Enter/Space on a focused card,
  // because the cards are role=button anchors without an href.
  document.addEventListener("keydown", (e) => {
    if (overlay.classList.contains("opacity-0")) {
      if (e.key !== "Enter" && e.key !== " ") return;
      const card = e.target?.closest?.("[data-photo-id]");
      if (!card) return;
      e.preventDefault();
      open(card);
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      close();
    } else if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault();
      goTo(currentIndex + (e.key === "ArrowRight" ? 1 : -1));
    } else if (e.key === "Tab") {
      showUI();
      const buttons = [...overlay.querySelectorAll("button:not([disabled])")];
      const edge = e.shiftKey ? buttons[0] : buttons.at(-1);
      if (document.activeElement === edge || !overlay.contains(document.activeElement)) {
        e.preventDefault();
        (e.shiftKey ? buttons.at(-1) : buttons[0])?.focus();
      }
    }
  }, { signal });

  // Scroll-end snap
  track.addEventListener("scrollend", () => {
    isNavigating = false;
    clearTimeout(navFallbackTimer);
    snapToClosest();
  }, { signal });

  // Close on background click (not on photos or controls)
  overlay?.addEventListener("click", (e) => {
    if (e.target === overlay || e.target === track) close();
  }, { signal });


  function restoreFromHistory(slug) {
    const card = [...document.querySelectorAll("[data-photo-id]")]
      .find((element) => element.dataset.photoId === slug);
    if (card && overlay.inert) open(card, true);
  }

  window.addEventListener("popstate", (event) => {
    if (window.location.href !== pageUrl) return;
    if (event.state?.filmStripPhoto) {
      restoreFromHistory(event.state.filmStripPhoto);
    } else if (!overlay.inert) {
      hide();
    } else {
      return;
    }
    // This history entry changes only the viewer. Leave Astro's route and scroll alone.
    event.stopImmediatePropagation();
  }, { signal, capture: true });

  if (history.state?.filmStripPhoto) restoreFromHistory(history.state.filmStripPhoto);

  return () => {
    hide({ restoreFocus: false });
    controller.abort();
  };
}

let unmount;
function initFilmStrip() {
  const overlay = document.getElementById("film-strip");
  if (!overlay || overlay.parentElement === document.body) return;
  // Escape stacking contexts created by the page layout.
  document.body.appendChild(overlay);
  unmount = mountViewer(overlay);
}

initFilmStrip();
document.addEventListener("astro:page-load", initFilmStrip);
document.addEventListener("astro:before-swap", () => {
  unmount?.();
  unmount = undefined;
});
