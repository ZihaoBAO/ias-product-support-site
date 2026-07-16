import { Router } from "express";
import bcrypt from "bcrypt";
import pool from "../db.js";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../utils/jwt.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

export const authRouter = Router();

// 登录
authRouter.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: "用户名和密码不能为空" });
    }

    const [rows] = await pool.query(
      "SELECT id, username, password_hash, role, is_active FROM users WHERE username = ?",
      [username.trim()]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: "用户名或密码错误" });
    }

    const user = rows[0];

    if (!user.is_active) {
      return res.status(403).json({ error: "账号已被禁用" });
    }

    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({ error: "用户名或密码错误" });
    }

    await pool.query("UPDATE users SET last_login_at = NOW() WHERE id = ?", [user.id]);

    const tokenPayload = { id: user.id, username: user.username, role: user.role };
    const accessToken = signAccessToken(tokenPayload);
    const refreshToken = signRefreshToken(tokenPayload);

    res.json({
      user: { id: user.id, username: user.username, role: user.role },
      accessToken,
      refreshToken,
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "服务器内部错误" });
  }
});

// 刷新 token
authRouter.post("/refresh", async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ error: "缺少刷新令牌" });
    }

    const decoded = verifyRefreshToken(refreshToken);
    const newAccessToken = signAccessToken({
      id: decoded.id,
      username: decoded.username,
      role: decoded.role,
    });

    res.json({ accessToken: newAccessToken });
  } catch {
    res.status(401).json({ error: "刷新令牌无效或已过期" });
  }
});

// 登出
authRouter.post("/logout", authMiddleware, (_req, res) => {
  res.json({ message: "已登出" });
});

// 获取当前用户
authRouter.get("/me", authMiddleware, (req, res) => {
  res.json({ user: req.user });
});
