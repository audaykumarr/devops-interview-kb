export type Theme = "light" | "dark" | "system";

export const THEME_STORAGE_KEY = "theme";

/**
 * Inlined verbatim into a beforeInteractive <script> in the root layout so it
 * runs before first paint — must stay dependency-free and side-effect-safe
 * (wrapped in try/catch: localStorage can throw in privacy mode).
 */
export const THEME_INIT_SCRIPT = `
(function () {
  try {
    var theme = localStorage.getItem('${THEME_STORAGE_KEY}');
    var isDark = theme === 'dark' || (theme !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.classList.toggle('dark', isDark);
  } catch (e) {}
})();
`;

export function applyTheme(theme: Theme): void {
  const isDark = theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", isDark);
}

export function getStoredTheme(): Theme {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === "light" || stored === "dark" || stored === "system") return stored;
  } catch {
    // localStorage unavailable (privacy mode, etc.) — fall through to default.
  }
  return "system";
}

export function setStoredTheme(theme: Theme): void {
  try {
    if (theme === "system") localStorage.removeItem(THEME_STORAGE_KEY);
    else localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Ignore — theme just won't persist across reloads.
  }
  applyTheme(theme);
}
