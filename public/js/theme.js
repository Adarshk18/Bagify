// public/js/theme.js
(function () {
  const icon = document.getElementById("themeIcon");

  function applyTheme(theme) {
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

  // Detect saved or system theme
  let savedTheme = localStorage.getItem("theme");
  if (!savedTheme) {
    savedTheme = window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
    localStorage.setItem("theme", savedTheme);
  }
  applyTheme(savedTheme);

  // Attach toggle listener
  document.addEventListener("DOMContentLoaded", () => {
    const toggleBtn = document.getElementById("themeToggleBtn");
    toggleBtn?.addEventListener("click", () => {
      const newTheme = document.documentElement.classList.contains("dark")
        ? "light"
        : "dark";
      localStorage.setItem("theme", newTheme);
      applyTheme(newTheme);
    });
  });
})();
