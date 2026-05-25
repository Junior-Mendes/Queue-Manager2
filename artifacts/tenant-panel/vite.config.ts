import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

export default defineConfig(async ({ command, mode }) => {
  const env = loadEnv(mode, path.resolve(import.meta.dirname), "");
  const rawPort = env.PORT ?? process.env.PORT;
  const basePath = env.BASE_PATH ?? process.env.BASE_PATH ?? "/";

  let port: number | undefined;
  if (rawPort) {
    port = Number(rawPort);
    if (Number.isNaN(port) || port <= 0) {
      throw new Error(`Invalid PORT value: "${rawPort}"`);
    }
  } else if (command === "serve") {
    throw new Error(
      "PORT environment variable is required but was not provided.",
    );
  }

  const plugins = [
    react(),
    tailwindcss({ optimize: false }),
    runtimeErrorOverlay(),
  ];

  if (
    mode !== "production" &&
    process.env.REPL_ID !== undefined
  ) {
    const cartographer = await import("@replit/vite-plugin-cartographer").then(
      (m) => m.cartographer({ root: path.resolve(import.meta.dirname, "..") }),
    );
    const devBanner = await import("@replit/vite-plugin-dev-banner").then(
      (m) => m.devBanner(),
    );
    plugins.push(cartographer, devBanner);
  }

  return {
    base: basePath,
    plugins,
    resolve: {
      alias: {
        "@": path.resolve(import.meta.dirname, "src"),
        "@assets": path.resolve(import.meta.dirname, "..", "..", "attached_assets"),
      },
      dedupe: ["react", "react-dom"],
    },
    root: path.resolve(import.meta.dirname),
    build: {
      outDir: path.resolve(import.meta.dirname, "dist/public"),
      emptyOutDir: true,
    },
    server: port
      ? {
          port,
          strictPort: true,
          host: "0.0.0.0",
          allowedHosts: true,
          fs: { strict: true },
        }
      : undefined,
    preview: port
      ? {
          port,
          host: "0.0.0.0",
          allowedHosts: true,
        }
      : undefined,
  };
});
