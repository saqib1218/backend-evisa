const bcrypt = require("bcryptjs");
const db = require("../config/database");

const adminUsers = [
  {
    email: "admin@gmail.com",
    password: "admin123",
    name: "Admin",
    role: "admin",
  },
  {
    email: "support@gmail.com",
    password: "support123",
    name: "Support",
    role: "support",
  },
];

const seedAdminUsers = async () => {
  for (const admin of adminUsers) {
    const passwordHash = await bcrypt.hash(admin.password, 10);
    await db.query(
      `INSERT INTO admin_users (email, password_hash, name, role)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (email) DO UPDATE SET
         password_hash = EXCLUDED.password_hash,
         name = EXCLUDED.name,
         role = EXCLUDED.role,
         updated_at = NOW()`,
      [admin.email, passwordHash, admin.name, admin.role]
    );
    console.log(`Seeded admin user: ${admin.email} (${admin.role})`);
  }
};

module.exports = seedAdminUsers;
