import api from "./api";

/**
 * AuthService provides methods to interact with the FastAPI authentication endpoints.
 * All methods return a Promise that resolves with the server response data.
 */
class AuthService {
  /**
   * Login user with email and password.
   * @param {string} email
   * @param {string} password
   * @returns {Promise<{user: object, access_token: string, refresh_token: string}>}
   */
  static async login(email, password) {
    const response = await api.post("/auth/login", { email, password });
    // Store tokens and user profile
    const { access_token, refresh_token, user } = response.data;
    localStorage.setItem("cyber_access_token", access_token);
    localStorage.setItem("cyber_refresh_token", refresh_token);
    localStorage.setItem("cyber_session", JSON.stringify(user));
    // Set default auth header for subsequent calls
    api.defaults.headers.common["Authorization"] = `Bearer ${access_token}`;
    return { user, access_token, refresh_token };
  }

  /**
   * Register new user.
   * @param {string} email
   * @param {string} full_name
   * @param {string} password
   * @param {string} role
   * @returns {Promise<{user: object}>}
   */
  static async register(email, first_name, password, role) {
    const response = await api.post("/auth/register", {
      email,
      first_name,
      password,
      role,
    });
    return { user: response.data };
  }

  /**
   * Logout user – clear all stored data.
   */
  static logout() {
    localStorage.removeItem("cyber_access_token");
    localStorage.removeItem("cyber_refresh_token");
    localStorage.removeItem("cyber_session");
    delete api.defaults.headers.common["Authorization"];
  }

  /**
   * Request password reset OTP code.
   * @param {string} email
   */
  static async forgotPassword(email) {
    const response = await api.post("/auth/forgot-password", { email });
    return response.data;
  }

  /**
   * Verify 6-digit OTP code.
   * @param {string} email
   * @param {string} code
   */
  static async verifyOTP(email, code) {
    const response = await api.post("/auth/verify-otp", { email, code });
    return response.data;
  }

  /**
   * Reset user password.
   * @param {string} email
   * @param {string} code
   * @param {string} new_password
   */
  static async resetPassword(email, code, new_password) {
    const response = await api.post("/auth/reset-password", {
      email,
      code,
      new_password,
    });
    return response.data;
  }

  /**
   * Fetch current user profile details from backend.
   * @returns {Promise<object>}
   */
  static async getMe() {
    const response = await api.get("/users/me");
    if (response.data) {
      localStorage.setItem("cyber_session", JSON.stringify(response.data));
    }
    return response.data;
  }

  /**
   * Retrieve currently stored user session.
   * @returns {object|null}
   */
  static getCurrentUser() {
    const stored = localStorage.getItem("cyber_session");
    if (!stored) return null;
    try {
      return JSON.parse(stored);
    } catch (e) {
      this.logout();
      return null;
    }
  }
}

export default AuthService;
