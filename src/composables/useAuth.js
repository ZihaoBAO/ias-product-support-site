import { computed, ref } from "vue";
import { users } from "../auth/users.js";
import { sha256 } from "../auth/hash.js";

const AUTH_STORAGE_KEY = "ias_auth_user";

function readStoredUser() {
  try {
    const value = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!value) return null;
    const user = JSON.parse(value);
    if (!user?.username || !user?.role) return null;
    return { username: user.username, role: user.role };
  } catch {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    return null;
  }
}

const currentUser = ref(readStoredUser());

export function useAuth() {
  const user = computed(() => currentUser.value);
  const authenticated = computed(() => Boolean(currentUser.value));

  async function login(username, password) {
    const normalizedUsername = username.trim();
    const account = users.find((item) => item.username === normalizedUsername);
    if (!account) return false;

    const passwordHash = await sha256(password);
    if (passwordHash !== account.password) return false;

    currentUser.value = {
      username: account.username,
      role: account.role
    };
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(currentUser.value));
    return true;
  }

  function logout() {
    currentUser.value = null;
    localStorage.removeItem(AUTH_STORAGE_KEY);
  }

  function isAuthenticated() {
    return Boolean(currentUser.value);
  }

  function getCurrentUser() {
    return currentUser.value;
  }

  return {
    user,
    authenticated,
    login,
    logout,
    isAuthenticated,
    getCurrentUser
  };
}
