const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { UserRepository, AdminUserRepository } = require("../repositories");
const config = require("../config");

function generateAccessToken(payload) {
  return jwt.sign(payload, config.jwt.secret, { expiresIn: config.jwt.expiresIn });
}

function generateRefreshToken(payload) {
  return jwt.sign(payload, config.jwt.refreshSecret, { expiresIn: config.jwt.refreshExpiresIn });
}

const AuthService = {
  async register({ email, password, firstName, lastName, phone }) {
    const existing = await UserRepository.findByEmail(email);
    if (existing) {
      throw { status: 409, message: "Email already registered" };
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await UserRepository.create({ email, passwordHash, firstName, lastName, phone });

    const tokenPayload = { id: user.id, email: user.email, type: "user" };
    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    delete user.password_hash;
    return { user, accessToken, refreshToken };
  },

  async login(email, password) {
    const user = await UserRepository.findByEmail(email);
    if (!user) {
      throw { status: 401, message: "Invalid credentials" };
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      throw { status: 401, message: "Invalid credentials" };
    }

    if (!user.is_active) {
      throw { status: 403, message: "Account is deactivated" };
    }

    const tokenPayload = { id: user.id, email: user.email, type: "user" };
    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    delete user.password_hash;
    return { user, accessToken, refreshToken };
  },

  async adminLogin(email, password) {
    const admin = await AdminUserRepository.findByEmail(email);
    if (!admin) {
      throw { status: 401, message: "Invalid credentials" };
    }

    const valid = await bcrypt.compare(password, admin.password_hash);
    if (!valid) {
      throw { status: 401, message: "Invalid credentials" };
    }

    if (!admin.is_active) {
      throw { status: 403, message: "Admin account is deactivated" };
    }

    const tokenPayload = { id: admin.id, email: admin.email, type: "admin", role: admin.role };
    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    delete admin.password_hash;
    return { admin, accessToken, refreshToken };
  },

  async refreshToken(refreshToken) {
    try {
      const decoded = jwt.verify(refreshToken, config.jwt.refreshSecret);
      const tokenPayload = { id: decoded.id, email: decoded.email, type: decoded.type, role: decoded.role };

      const accessToken = generateAccessToken(tokenPayload);
      const newRefreshToken = generateRefreshToken(tokenPayload);
      return { accessToken, refreshToken: newRefreshToken };
    } catch (err) {
      throw { status: 403, message: "Invalid or expired refresh token" };
    }
  },
};

module.exports = AuthService;
