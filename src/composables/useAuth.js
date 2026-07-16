import { computed, ref } from "vue";
import { login as apiLogin, logout as apiLogout, getMe } from "../api/auth.js";

const AUTH_USER_KEY = "ias_auth_user";
const ACCESS_TOKEN_KEY = "ias_access_token";
const REFRESH_TOKEN_KEY = "ias_refresh_token";

function readStoredUser() {
  try {
    const value = localStorage.getItem(AUTH_USER_KEY);
    if (!value) return null;
    const user = JSON.parse(value);
    if (!user?.username || !user?.role) return null;
    return { id: user.id, username: user.username, role: user.role };
  } catch {
    return null;
  }
}

const currentUser = ref(readStoredUser());

export function useAuth() {
  const user = computed(() => currentUser.value);
  const authenticated = computed(() => Boolean(currentUser.value));

  async function login(username, password) {
    const result = await apiLogin(username, password);
    if (result.error) return { error: result.error };

    currentUser.value = {
      id: result.user.id,
      username: result.user.username,
      role: result.user.role,
    };

    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(currentUser.value));
    localStorage.setItem(ACCESS_TOKEN_KEY, result.accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, result.refreshToken);
    return { success: true };
  }

  async function logout() {
    try {
      await apiLogout();
    } catch {
      // 即使后端调用失败也清除本地状态
    }
    clearAuth();
  }

  function clearAuth() {
    currentUser.value = null;
    localStorage.removeItem(AUTH_USER_KEY);
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  }

  function isAuthenticated() {
    return Boolean(currentUser.value) && Boolean(localStorage.getItem(ACCESS_TOKEN_KEY));
  }

  function getCurrentUser() {
    return currentUser.value;
  }

  async function checkSession() {
    if (!isAuthenticated()) return false;
    try {
      const result = await getMe();
      if (result.user) {
        currentUser.value = {
          id: result.user.id,
          username: result.user.username,
          role: result.user.role,
        };
        return true;
      }
    } catch {
      // token 无效，清除
    }
    clearAuth();
    return false;
  }

  return {
    user,
    authenticated,
    login,
    logout,
    isAuthenticated,
    getCurrentUser,
    checkSession,
  };
}
