const { AuthService } = require("../services");
const config = require("../config");

function setRefreshCookie(res, refreshToken) {
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: config.cookie.secure,
    sameSite: config.cookie.sameSite,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: "/api/auth",
  });
}

function clearRefreshCookie(res) {
  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: config.cookie.secure,
    sameSite: config.cookie.sameSite,
    path: "/api/auth",
  });
}

const AuthController = {
  async register(req, res, next) {
    try {
      const { email, password, firstName, lastName, phone } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
      }
      const result = await AuthService.register({ email, password, firstName, lastName, phone });
      setRefreshCookie(res, result.refreshToken);
      const { refreshToken, ...response } = result;
      res.status(201).json(response);
    } catch (err) {
      next(err);
    }
  },

  async login(req, res, next) {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
      }
      const result = await AuthService.login(email, password);
      setRefreshCookie(res, result.refreshToken);
      const { refreshToken, ...response } = result;
      res.json(response);
    } catch (err) {
      next(err);
    }
  },

  async adminLogin(req, res, next) {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
      }
      const result = await AuthService.adminLogin(email, password);
      setRefreshCookie(res, result.refreshToken);
      const { refreshToken, ...response } = result;
      res.json(response);
    } catch (err) {
      next(err);
    }
  },

  async refreshToken(req, res, next) {
    try {
      const refreshToken = req.cookies?.refreshToken;
      if (!refreshToken) {
        return res.status(400).json({ error: "Refresh token is required" });
      }
      const result = await AuthService.refreshToken(refreshToken);
      setRefreshCookie(res, result.refreshToken);
      res.json({ accessToken: result.accessToken });
    } catch (err) {
      clearRefreshCookie(res);
      next(err);
    }
  },

  async logout(req, res, next) {
    try {
      clearRefreshCookie(res);
      res.json({ message: "Logged out successfully" });
    } catch (err) {
      next(err);
    }
  },
};

module.exports = AuthController;
