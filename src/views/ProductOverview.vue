<template>
  <section class="manual-section">
    <h2>{{ t('overview.title') }}</h2>
    <div class="overview-grid">
      <div class="overview-panel">
        <h3>{{ t('overview.toc') }}</h3>
        <ol class="toc-list">
          <li v-for="item in manual.toc" :key="item.text">{{ td(item.text) }}</li>
        </ol>
      </div>
      <div class="overview-panel">
        <h3>{{ t('overview.quickAccess') }}</h3>
        <div class="quick-links">
          <router-link :to="`/products/${product.id}/flow`">{{ t('overview.viewFlow') }}</router-link>
          <router-link :to="`/products/${product.id}/troubleshooting`">{{ t('overview.viewTable') }}</router-link>
          <router-link :to="`/products/${product.id}/sop/${manual.documents[0]?.id || ''}`">{{ t('overview.viewFirstSop') }}</router-link>
        </div>
      </div>
    </div>
    <h3>{{ t('overview.sopTitle') }}</h3>
    <div class="doc-card-grid">
      <router-link
        v-for="doc in manual.documents"
        :key="doc.id"
        class="doc-card"
        :to="`/products/${product.id}/sop/${doc.id}`"
      >
        <strong>{{ td(doc.title) }}</strong>
        <small>{{ getVersionInfo(doc) }}</small>
      </router-link>
    </div>
  </section>
</template>

<script setup>
import { inject } from "vue";
import { useI18n } from "../composables/useI18n.js";

const { t, td } = useI18n();
const product = inject("product", {});
const manual = inject("manual", { documents: [], toc: [] });

function getVersionInfo(doc) {
  const v = doc.versions?.length || 0;
  const s = doc.versions?.reduce((sum, ver) => sum + ver.steps.length, 0) || 0;
  return t('overview.versionInfo', { v, s });
}
</script>
