// 添加/更新用户脚本
// 用法：
//   node add-user.mjs <用户名> <密码> <角色>
//   角色可选 admin 或 customer，默认 customer
//
// 示例：
//   node add-user.mjs zhangsan mypassword123 admin
//   node add-user.mjs customer02 pass456

import mysql from "mysql2/promise";
import bcrypt from "bcrypt";
import dotenv from "dotenv";

dotenv.config({ path: new URL("../.env", import.meta.url) });

const [,, username, password, role = "customer"] = process.argv;

if (!username || !password) {
  console.log("用法: node add-user.mjs <用户名> <密码> [角色]");
  console.log("角色: admin | customer（默认 customer）");
  console.log('');
  console.log('示例:');
  console.log('  node add-user.mjs zhangsan mypass123 admin');
  console.log('  node add-user.mjs customer02 pass456');
  process.exit(1);
}

const validRoles = ["admin", "customer"];
if (!validRoles.includes(role)) {
  console.log(`❌ 无效角色: "${role}"，只能是 admin 或 customer`);
  process.exit(1);
}

async function addUser() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || "3306", 10),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  try {
    const hash = await bcrypt.hash(password, 12);
    const isNew = await checkExists(conn, username);

    await conn.query(
      "INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash), role = VALUES(role)",
      [username, hash, role]
    );

    if (isNew) {
      console.log(`✅ 用户 "${username}" 已创建 (角色: ${role})`);
    } else {
      console.log(`✅ 用户 "${username}" 已更新 (角色: ${role}, 密码已重置)`);
    }
  } finally {
    await conn.end();
  }
}

async function checkExists(conn, username) {
  const [rows] = await conn.query("SELECT id FROM users WHERE username = ?", [username]);
  return rows.length === 0;
}

addUser().catch((err) => {
  console.error("❌ 操作失败:", err.message);
  process.exit(1);
});
