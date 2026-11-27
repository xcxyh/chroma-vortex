(() => {
  const root = document.documentElement;
  const slots = document.querySelectorAll(".bowl-slot");
  const viewport = window.visualViewport;
  const nativeSlotSizing = window.CSS && CSS.supports("width", "1cqh") && CSS.supports("container-type", "size");
  let pending = false;
  function update() {
    pending = false;
    const vh = viewport && viewport.height > 0 ? viewport.height : 0;
    const ih = innerHeight > 0 ? innerHeight : 0;
    const height = Math.floor(viewport && viewport.scale === 1 && vh && ih ? Math.min(ih, vh) : (ih || vh));
    if (height > 0) {
      root.style.setProperty("--play-height", height + "px");
      if (ih && height + 1 < ih) root.style.setProperty("--visual-limit", height + "px");
      else root.style.removeProperty("--visual-limit");
    }
    if (!nativeSlotSizing) {
      let changed = false;
      for (const slot of slots) {
        const box = slot.getBoundingClientRect();
        if (box.height > 0 && box.width > 0) {
          const cap = slot.firstElementChild.id === "free-bowl" ? 300 : 345;
          const next = Math.floor(Math.min(box.height, box.width, cap)) + "px";
          if (slot.style.getPropertyValue("--bowl-side") !== next) {
            slot.style.setProperty("--bowl-side", next);
            changed = true;
          }
        }
      }
      if (changed) window.dispatchEvent(new Event("cup-layout"));
    }
  }
  function schedule() {
    if (!pending) {pending = true; requestAnimationFrame(update);}
  }
  window.refreshCupViewport = update;
  window.addEventListener("resize", update);
  window.addEventListener("orientationchange", schedule);
  window.addEventListener("pageshow", schedule);
  if (viewport) viewport.addEventListener("resize", update);
  if (!nativeSlotSizing) {
    if (window.ResizeObserver) {
      const ro = new ResizeObserver(schedule);
      for (const slot of slots) ro.observe(slot);
    } else {
      new MutationObserver(schedule).observe(document.querySelector(".stand"), {
        attributes:true,attributeFilter:["hidden","open"],childList:true,subtree:true
      });
    }
  }
  update();
})();
