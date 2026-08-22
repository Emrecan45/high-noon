import { defineConfig, loadEnv } from "vite";
import { fileURLToPath } from "url";
import path from "path";

const root = path.dirname(fileURLToPath(import.meta.url));

const ADAPTERS = {
  gamedistribution: "gamedistribution.js",
  gd: "gamedistribution.js",
  standalone: "none.js",
  none: "none.js"
};

export default defineConfig(function (config) {
  const adapter = ADAPTERS[String(config.mode).toLowerCase()] || "crazygames.js";
  if (adapter === "gamedistribution.js" && config.command === "build") {
    const env = loadEnv(config.mode, root, "VITE_");
    if (!env.VITE_GD_GAME_ID) {
      throw new Error("VITE_GD_GAME_ID manquant");
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
