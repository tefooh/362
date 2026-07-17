// Project 362: your days on screen, reported like news
//
// Shared helper that turns a raw captured app / process / client name into the
// real, friendly program name a person would recognise. Capture engines often
// record process names (e.g. "msedge", "chrome.exe", "Code",
// "ApplicationFrameHost") rather than the product someone thinks of - this map
// keeps the news and the year-in-review reading like plain language instead of
// a task manager.

/** Normalise an app name for matching. */
function normaliseForMatch(name: string): string {
  return name
    .replace(/\.exe$/i, "")
    .replace(/[_-]/g, " ")
    .toLowerCase()
    .trim();
}

/** Title Case a string. */
function titleCase(s: string): string {
  return s
    .split(" ")
    .map((w) =>
      w.length === 0 ? w : w[0].toUpperCase() + w.slice(1).toLowerCase()
    )
    .join(" ");
}

const FRIENDLY_APP_NAMES: Record<string, string> = {
  msedge: "Microsoft Edge",
  "microsoft edge": "Microsoft Edge",
  chrome: "Google Chrome",
  "google chrome": "Google Chrome",
  chromium: "Chromium",
  firefox: "Firefox",
  "mozilla firefox": "Firefox",
  safari: "Safari",
  edge: "Microsoft Edge",
  brave: "Brave",
  opera: "Opera",
  vivaldi: "Vivaldi",
  arc: "Arc",
  code: "Visual Studio Code",
  vscode: "Visual Studio Code",
  "visual studio": "Visual Studio",
  "visual studio code": "Visual Studio Code",
  cursor: "Cursor",
  windsurf: "Windsurf",
  intellij: "IntelliJ IDEA",
  idea: "IntelliJ IDEA",
  pycharm: "PyCharm",
  webstorm: "WebStorm",
  goland: "GoLand",
  rider: "Rider",
  clion: "CLion",
  androidstudio: "Android Studio",
  "android studio": "Android Studio",
  xcode: "Xcode",
  sublime_text: "Sublime Text",
  "sublime text": "Sublime Text",
  notepad: "Notepad",
  "notepad++": "Notepad++",
  wordpad: "WordPad",
  winword: "Microsoft Word",
  "microsoft word": "Microsoft Word",
  excel: "Microsoft Excel",
  powerpnt: "Microsoft PowerPoint",
  "microsoft powerpoint": "Microsoft PowerPoint",
  outlook: "Microsoft Outlook",
  "microsoft outlook": "Microsoft Outlook",
  teams: "Microsoft Teams",
  slack: "Slack",
  discord: "Discord",
  zoom: "Zoom",
  "zoom.us": "Zoom",
  meet: "Google Meet",
  "google meet": "Google Meet",
  "applicationframehost": "a Windows app",
  "application frame host": "a Windows app",
  explorer: "File Explorer",
  "windows explorer": "File Explorer",
  taskmgr: "Task Manager",
  "systemsettings": "Windows Settings",
  "windows settings": "Windows Settings",
  powershell: "PowerShell",
  cmd: "Command Prompt",
  "command prompt": "Command Prompt",
  terminal: "Terminal",
  spotify: "Spotify",
  itunes: "iTunes",
  "music.app": "Music",
  photoshop: "Photoshop",
  "adobe photoshop": "Photoshop",
  illustrator: "Illustrator",
  figma: "Figma",
  notion: "Notion",
  obsidian: "Obsidian",
  "obsidian.md": "Obsidian",
  onenote: "Microsoft OneNote",
  "microsoft onenote": "Microsoft OneNote",
  vlc: "VLC Media Player",
  "vlc media player": "VLC Media Player",
  chromebeta: "Google Chrome",
  "project-362": "Project 362",
  "project_362": "Project 362",
  screenpipe: "Project 362",
};

/**
 * Turn a raw capture app name into a clean, friendly, human program name.
 */
export function displayApp(name: string): string {
  const trimmed = (name ?? "").trim();
  if (!trimmed) return "an app";
  const key = normaliseForMatch(trimmed);
  if (FRIENDLY_APP_NAMES[key]) return FRIENDLY_APP_NAMES[key];

  // Dynamic game/app mapping
  if (key.includes("fortnite")) return "Fortnite";
  if (key.includes("leagueoflegends") || key.includes("league of legends")) return "League of Legends";
  if (key.includes("steamwebhelper")) return "Steam";
  if (key.includes("valorant")) return "Valorant";
  if (key.includes("minecraft")) return "Minecraft";
  if (key.includes("roblox")) return "Roblox";
  if (key.includes("counterstrike") || key.includes("counter strike") || key.includes("csgo") || key.includes("cs2")) return "Counter-Strike";

  let friendly = titleCase(trimmed.replace(/\.exe$/i, "").replace(/[_-]/g, " "));
  
  // Strip common noisy suffixes case-insensitively
  const suffixesToStrip = [
    " Client",
    " Helper",
    " Launcher",
    " Engine",
    " Shipping",
    " Win64",
    " Win32",
    " App",
    " Service",
    " Tool",
    " Manager",
    " Desktop"
  ];

  let changed = true;
  while (changed) {
    changed = false;
    for (const suffix of suffixesToStrip) {
      if (friendly.toLowerCase().endsWith(suffix.toLowerCase())) {
        friendly = friendly.slice(0, friendly.length - suffix.length);
        changed = true;
      }
    }
  }

  return friendly.trim() || trimmed;
}
