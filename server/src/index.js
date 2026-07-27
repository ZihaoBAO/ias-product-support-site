import 'dotenv/config';
import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { authRouter } from "./routes/auth.js";

const app = express();

// 信任 Nginx 反向代理，确保限流功能获取真实客户端 IP
app.set('trust proxy', 1);

app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:5173",
    credentials: true,
  })
);

app.use(express.json());

// 登录接口限流：15分钟内最多10次尝试
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: "登录尝试过于频繁，请15分钟后再试" },
});

app.use("/api/auth", authLimiter, authRouter);

// 健康检查
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ API 服务已启动: http://localhost:${PORT}`);
  console.log(`📋 健康检查: http://localhost:${PORT}/api/health`);
});
