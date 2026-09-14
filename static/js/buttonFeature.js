// buttonFeature.js — include this once, on every page, nothing else to change

let activeLoadingBtn = null;

document.addEventListener("submit", function (e) {
  const form = e.target;
  if (!(form instanceof HTMLFormElement)) return;

  const btn = form.querySelector('button[type="submit"]');
  if (!btn || btn.disabled) return;

  btn.dataset.originalText = btn.textContent;
  btn.disabled = true;
  btn.textContent = "Loading...";

  activeLoadingBtn = btn; // track it so the fetch patch below can find it

  // Re-enable automatically after a timeout as a safety net,
  // in case something forgets to reset it (e.g. redirect fails silently)
  setTimeout(() => resetButton(btn), 15000);
}, true); // capture phase — runs before your page's own submit listener

document.addEventListener("click", function (e) {
  const btn = e.target.closest('button[data-loading]');
  if (!btn || btn.disabled) return;

  btn.dataset.originalText = btn.textContent;
  btn.disabled = true;
  btn.textContent = "Loading...";

  activeLoadingBtn = btn;
}, true);

function resetButton(btn) {
  if (btn && btn.dataset.originalText !== undefined) {
    btn.disabled = false;
    btn.textContent = btn.dataset.originalText;
    delete btn.dataset.originalText;
  }
  if (activeLoadingBtn === btn) activeLoadingBtn = null;
}

// Patch fetch globally so ANY fetch call (success, error response,
// or thrown/network error) resets whichever button triggered it —
// no page-specific code needs to call resetButton itself.
const originalFetch = window.fetch;
window.fetch = function (...args) {
  const btnAtCallTime = activeLoadingBtn;

  return originalFetch.apply(this, args).then(
    (response) => {
      resetButton(btnAtCallTime);
      return response;
    },
    (err) => {
      resetButton(btnAtCallTime);
      throw err; // re-throw so page code's own .catch()/try-catch still works
    }
  );
};
// ================================
// SECTION MEMORY (keep the user on the same tab after a reload)
// ================================

(function () {
  const STORAGE_KEY = "activeDashboardSection";

  // Remember the section whenever the user clicks a nav link
  document.addEventListener("click", function (e) {
    const link = e.target.closest(".nav-link[data-section]");
    if (!link) return;
    sessionStorage.setItem(STORAGE_KEY, link.dataset.section);
  }, true);

  // Restore it after the page loads (including after a reload)
  document.addEventListener("DOMContentLoaded", function () {
    const savedSection = sessionStorage.getItem(STORAGE_KEY);
    if (!savedSection) return;

    const targetSection = document.getElementById(savedSection);
    const targetLink = document.querySelector(
      `.nav-link[data-section="${savedSection}"]`
    );

    if (!targetSection || !targetLink) return;

    document.querySelectorAll(".page-section").forEach(function (section) {
      section.classList.remove("active-section");
    });

    document.querySelectorAll(".nav-link[data-section]").forEach(function (link) {
      link.classList.remove("active");
    });

    targetSection.classList.add("active-section");
    targetLink.classList.add("active");
  });
})();