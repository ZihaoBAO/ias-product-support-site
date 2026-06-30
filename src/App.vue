<template>
  <header class="topbar">
    <a class="brand" href="#/">
      <img class="brand-logo" :src="`${baseUrl}images/ias-logo.png`" alt="IAS Logo" />
      <span>
        <strong>{{ t('app.title') }}</strong>
        <small>{{ t('app.subtitle') }}</small>
      </span>
    </a>
    <div class="topbar-actions">
      <router-link to="/" class="nav-home">{{ t('app.home') }}</router-link>
      <div class="lang-dropdown" @click.stop>
        <button
          class="lang-trigger"
          @click="open = !open"
          @blur="onBlur"
        >
          {{ currentLabel }}
          <span class="lang-arrow" :class="{ open }">▾</span>
        </button>
        <ul v-show="open" class="lang-menu">
          <li
            v-for="l in availableLocales"
            :key="l.code"
            :class="{ active: l.code === locale }"
            @mousedown.prevent="onSelect(l.code)"
          >{{ l.label }}</li>
        </ul>
      </div>
    </div>
  </header>
  <main>
    <router-view />
  </main>
</template>

<script setup>
import { ref, computed } from "vue";
import { watch } from "vue";
import { useRouter } from "vue-router";
import { useI18n, availableLocales } from "./composables/useI18n.js";

const router = useRouter();
const { t, locale, setLocale } = useI18n();

const baseUrl = import.meta.env.BASE_URL;
const open = ref(false);

const currentLabel = computed(() =>
  availableLocales.find((l) => l.code === locale.value)?.label || locale.value
);

function onSelect(code) {
  setLocale(code);
  open.value = false;
}

function onBlur(e) {
  // delay to allow mousedown on menu items to fire first
  setTimeout(() => { open.value = false; }, 150);
}

watch(
  () => router.currentRoute.value,
  (route) => {
    const productId = route.params?.productId;
    const title = productId
      ? `${productId.toUpperCase()} - ${t('app.title')}`
      : t('app.title');
    document.title = title;
  },
  { immediate: true }
);
</script>
