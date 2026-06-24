import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  plugins: [vue()],
  publicDir: "public",
  // GitHub Pages 部署时需要设置为仓库名，例如 "/ias-product-support-site/"
  // 本地开发默认 "/"，CI 中通过 --base 参数覆盖
  base: process.env.VITE_BASE || "/",
});
