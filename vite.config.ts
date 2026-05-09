import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

const DEFAULT_PRODUCTION_BASE = "/tools/random-destination-picker/";

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const base =
    command === "serve"
      ? "/"
      : env.VITE_BASE_PATH || DEFAULT_PRODUCTION_BASE;

  return {
    base,
    plugins: [react()],
  };
});
