// public/js/theme.js
(function () {
  // Apply theme immediately (before DOMContentLoaded)
  function applyTheme(theme) {
    const icon = document.getElementById("themeIcon");

    if (theme === "dark") {
      document.documentElement.classList.add("dark");
      if (icon) {
        icon.classList.remove("fa-moon");
        icon.classList.add("fa-sun");
      }
    } else {
      document.documentElement.classList.remove("dark");
      if (icon) {
        icon.classList.remove("fa-sun");
        icon.classList.add("fa-moon");
      }
    }
  }

  // Get saved theme or system preference
  let savedTheme = localStorage.getItem("theme");
  if (!savedTheme) {
    savedTheme = window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
    localStorage.setItem("theme", savedTheme);
  }

  // Apply theme instantly
  applyTheme(savedTheme);

  // Once DOM is ready, wire up toggle button
  document.addEventListener("DOMContentLoaded", () => {
    const toggleBtn = document.getElementById("themeToggleBtn");
    const icon = document.getElementById("themeIcon");

    // Ensure icon matches theme on page load
    applyTheme(localStorage.getItem("theme"));

    toggleBtn?.addEventListener("click", () => {
      const newTheme = document.documentElement.classList.contains("dark")
        ? "light"
        : "dark";
      localStorage.setItem("theme", newTheme);
      applyTheme(newTheme);
    });
  });

  // Optional: React to system theme changes in real-time
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (e) => {
    const newTheme = e.matches ? "dark" : "light";
    localStorage.setItem("theme", newTheme);
    applyTheme(newTheme);
  });
})();
