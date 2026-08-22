import { defineConfig, loadEnv } from "vite";
import { fileURLToPath } from "url";
import path from "path";

const root = path.dirname(fileURLToPath(import.meta.url));

const ADAPTERS = {
  y8: "y8.js"
};

const REQUIRED = {
  "y8.js": ["VITE_Y8_GAME_ID", "VITE_Y8_APP_ID"]
};

export default defineConfig(function (config) {
  const adapter = ADAPTERS[String(config.mode).toLowerCase()] || "crazygames.js";
  const required = REQUIRED[adapter];
  if (required !== undefined && config.command === "build") {
    const env = loadEnv(config.mode, root, "VITE_");
    for (const name of required) {
      if (!env[name]) {
        throw new Error(name + " manquant");
      }
    }
  }
  return {
    base: "./",
    build: {
      target: "es2020"
    },
    resolve: {
      alias: {
        "virtual:platform": path.resolve(root, "src/platform", adapter)
      }
    }
  };
});
