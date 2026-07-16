// 初始化脚本：建表 + 生成密码哈希 + 插入用户
// 用法：node setup.mjs "数据库密码" "admin密码" "customer密码"

import mysql from "mysql2/promise";
import bcrypt from "bcrypt";
import crypto from "crypto";

const [,, dbPassword, adminPassword, customerPassword] = process.argv;

if (!dbPassword || !adminPassword || !customerPassword) {
  console.log("用法: node setup.mjs <数据库密码> <admin密码> <customer密码>");
  console.log('示例: node setup.mjs "mydbpass" "admin123" "cust123"');
  process.exit(1);
}

const config = {
  host: "192.168.0.141",
  port: 3306,
  user: "baozihao",
  password: dbPassword,
  database: "baozihao",
};

async function setup() {
  console.log("========================================");
  console.log("  IAS 数据库初始化");
  console.log("========================================\n");

  const conn = await mysql.createConnection(config);

  try {
    // 1. 建表
    console.log("📌 创建 users 表...");
    await conn.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        role ENUM('admin','customer') NOT NULL DEFAULT 'customer',
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        last_login_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_username (username)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log("   ✅ 完成\n");

    // 2. 生成 bcrypt 密码
    const rounds = 12;
    console.log("📌 生成 bcrypt 密码哈希（12轮）...");
    const adminHash = await bcrypt.hash(adminPassword, rounds);
    const customerHash = await bcrypt.hash(customerPassword, rounds);
    console.log(`   admin hash:    ${adminHash.substring(0, 20)}...`);
    console.log(`   customer hash: ${customerHash.substring(0, 20)}...`);
    console.log("   ✅ 完成\n");

    // 3. 插入用户（存在则更新）
    console.log("📌 插入用户...");
    await conn.query(
      "INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash), role = VALUES(role)",
      ["admin", adminHash, "admin"]
    );
    await conn.query(
      "INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash), role = VALUES(role)",
      ["customer", customerHash, "customer"]
    );
    console.log("   ✅ 完成\n");

    // 4. 验证
    const [rows] = await conn.query("SELECT id, username, role, is_active, created_at FROM users");
    console.log("📌 用户列表:");
    rows.forEach((r) => {
      console.log(`   - ${r.username.padEnd(12)} role: ${r.role.padEnd(10)} active: ${r.is_active}  created: ${r.created_at}`);
    });

    // 5. 生成 JWT 密钥
    console.log("\n📌 JWT 密钥（复制到 server/.env 中）:");
    console.log(`   JWT_ACCESS_SECRET=${crypto.randomBytes(64).toString("hex")}`);
    console.log(`   JWT_REFRESH_SECRET=${crypto.randomBytes(64).toString("hex")}`);

    console.log("\n========================================");
    console.log("  初始化完成 ✅");
    console.log("========================================");
  } finally {
    await conn.end();
  }
}

setup().catch((err) => {
  console.error("❌ 初始化失败:", err.message);
  process.exit(1);
});
