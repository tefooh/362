// Project 362: your days on screen, reported like news

import { useEffect, useState } from "react";
import { commands } from "@/lib/utils/tauri";
import { Store } from "@tauri-apps/plugin-store";
import { homeDir } from "@tauri-apps/api/path";

export interface LocalApiConfig {
  port: number;
  key: string | null;
  auth_enabled: boolean;
}

export interface AppSettings {
  openaiApiKey?: string;
  openaiCompatibleEndpoint?: string;
  openaiCompatibleApiKey?: string;
  openaiCompatibleModel?: string;
  ollamaUrl?: string;
  useOllama?: boolean;
  aiModel?: string;
  aiProviderType?: string;
  customPrompt?: string;
}

const DEFAULT_SETTINGS: AppSettings = {
  openaiApiKey: "",
  openaiCompatibleEndpoint: "",
  openaiCompatibleApiKey: "",
  openaiCompatibleModel: "",
  ollamaUrl: "http://localhost:11434",
  aiModel: "gpt-4o",
  aiProviderType: "openai",
};

export function useSettings() {
  const [apiConfig, setApiConfig] = useState<LocalApiConfig | null>(null);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      // 1. Get API config (port, key) with safety fallback
      let config: LocalApiConfig = { port: 11430, key: null, auth_enabled: false };
      try {
        const res = (await commands.getLocalApiConfig()) as unknown as LocalApiConfig;
        if (res) {
          config = res;
        }
      } catch (err) {
        console.warn("Failed to get local API config, using fallback port 11430:", err);
      }
      setApiConfig(config);

      // 2. Load settings from the engine data directory's store.bin
      let baseDir = "";
      try {
        const res = await commands.getProject362BaseDir();
        if (res && res.status === "ok") {
          baseDir = res.data;
        }
      } catch {
        // fallback below
      }

      try {
        if (!baseDir) {
          baseDir = `${await homeDir()}/.project-362`;
        }

        const store = await Store.load(`${baseDir}/store.bin`, {
          autoSave: false,
          defaults: {},
        });
        const storedSettings = await store.get<any>("settings");
        if (storedSettings) {
          setSettings({
            openaiApiKey:
              storedSettings.openaiApiKey || storedSettings.user?.token || "",
            openaiCompatibleEndpoint:
              storedSettings.openaiCompatibleEndpoint || "",
            openaiCompatibleApiKey: storedSettings.openaiCompatibleApiKey || "",
            openaiCompatibleModel: storedSettings.openaiCompatibleModel || "",
            ollamaUrl: storedSettings.ollamaUrl || "http://localhost:11434",
            aiModel: storedSettings.aiModel || "gpt-4o",
            aiProviderType: storedSettings.aiProviderType || "openai",
            customPrompt: storedSettings.customPrompt || "",
          });
        } else {
          setSettings(DEFAULT_SETTINGS);
        }
      } catch (err) {
        console.error("Failed to load settings from store.bin:", err);
        setSettings(DEFAULT_SETTINGS);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const saveSettings = async (newSettings: AppSettings) => {
    try {
      let baseDir = "";
      try {
        const res = await commands.getProject362BaseDir();
        if (res && res.status === "ok") {
          baseDir = res.data;
        }
      } catch {}
      if (!baseDir) {
        baseDir = `${await homeDir()}/.project-362`;
      }
      const store = await Store.load(`${baseDir}/store.bin`, {
        autoSave: false,
        defaults: {},
      });
      await store.set("settings", newSettings);
      await store.save();
      setSettings(newSettings);
      return true;
    } catch (err) {
      console.error("Failed to save settings to store.bin:", err);
      return false;
    }
  };

  return { apiConfig, settings, loading, saveSettings };
}
