import { verifyAccessToken } from "../utils/jwt.js";

export function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "未提供认证令牌" });
  }

  const token = header.split(" ")[1];
  try {
    const decoded = verifyAccessToken(token);
    req.user = { id: decoded.id, username: decoded.username, role: decoded.role };
    next();
  } catch {
    return res.status(401).json({ error: "令牌无效或已过期" });
  }
}
