<template>
  <section class="content-band narrow">
    <h1>{{ t('notFound.title') }}</h1>
    <p>{{ t('notFound.desc') }}</p>
    <router-link class="primary-button" to="/">{{ t('notFound.backHome') }}</router-link>
  </section>
</template>

<script setup>
import { useI18n } from "../composables/useI18n.js";

const { t } = useI18n();
</script>
