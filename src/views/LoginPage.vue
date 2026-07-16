<template>
  <section class="login-shell">
    <div class="login-panel">
      <p class="eyebrow">{{ t("auth.eyebrow") }}</p>
      <h1>{{ t("auth.title") }}</h1>
      <p class="login-intro">{{ t("auth.description") }}</p>

      <form class="login-form" @submit.prevent="onSubmit">
        <label class="login-field">
          <span>{{ t("auth.username") }}</span>
          <input
            v-model="username"
            name="username"
            type="text"
            autocomplete="username"
            :placeholder="t('auth.usernamePlaceholder')"
          />
        </label>

        <label class="login-field">
          <span>{{ t("auth.password") }}</span>
          <input
            v-model="password"
            name="password"
            type="password"
            autocomplete="current-password"
            :placeholder="t('auth.passwordPlaceholder')"
          />
        </label>

        <p v-if="error" class="login-error">{{ error }}</p>

        <button class="primary-button login-submit" type="submit" :disabled="submitting">
          {{ submitting ? t("auth.loggingIn") : t("auth.login") }}
        </button>
      </form>
    </div>
  </section>
</template>

<script setup>
import { ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useAuth } from "../composables/useAuth.js";
import { useI18n } from "../composables/useI18n.js";

const route = useRoute();
const router = useRouter();
const { login } = useAuth();
const { t } = useI18n();

const username = ref("");
const password = ref("");
const error = ref("");
const submitting = ref(false);

async function onSubmit() {
  error.value = "";
  if (!username.value.trim() || !password.value) {
    error.value = t("auth.required");
    return;
  }

  submitting.value = true;
  try {
    const result = await login(username.value, password.value);
    if (result.error) {
      error.value = result.error;
      return;
    }

    const redirect = typeof route.query.redirect === "string" ? route.query.redirect : "/";
    router.replace(redirect || "/");
  } catch {
    error.value = t("auth.unavailable");
  } finally {
    submitting.value = false;
  }
}
</script>
