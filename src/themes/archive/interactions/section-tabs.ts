declare global { interface Window { __ytSectionTabsCleanup?: () => void; __ytSectionTabsInit?: () => void; } }
function initSectionTabs() {
  window.__ytSectionTabsCleanup?.();
  const controller = new AbortController();
  const { signal } = controller;
  document.querySelectorAll<HTMLElement>("[data-yt-tabs]").forEach((root) => {
    const buttons = Array.from(root.querySelectorAll<HTMLButtonElement>("[role=tab]"));
    const select = (button: HTMLButtonElement, focus = false) => {
      buttons.forEach((item) => {
        const selected = item === button;
        item.setAttribute("aria-selected", String(selected));
        item.tabIndex = selected ? 0 : -1;
        const panel = document.getElementById(item.getAttribute("aria-controls") || "");
        if (panel) panel.hidden = !selected;
      });
      if (focus) button.focus();
    };
    buttons.forEach((button, index) => {
      button.addEventListener("click", () => select(button), { signal });
      button.addEventListener("keydown", (event) => {
        const delta = ["ArrowRight", "ArrowDown"].includes(event.key) ? 1 : ["ArrowLeft", "ArrowUp"].includes(event.key) ? -1 : 0;
        if (!delta && event.key !== "Home" && event.key !== "End") return;
        event.preventDefault();
        const next = event.key === "Home" ? 0 : event.key === "End" ? buttons.length - 1 : (index + delta + buttons.length) % buttons.length;
        select(buttons[next], true);
      }, { signal });
    });
  });
  window.__ytSectionTabsCleanup = () => controller.abort();
  document.addEventListener("astro:before-swap", () => controller.abort(), { once: true, signal });
}
if (window.__ytSectionTabsInit) document.removeEventListener("astro:page-load", window.__ytSectionTabsInit);
window.__ytSectionTabsInit = initSectionTabs;
document.addEventListener("astro:page-load", initSectionTabs);
initSectionTabs();
export {};
