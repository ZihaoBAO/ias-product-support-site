<template>
  <div v-if="loading" class="content-band narrow">
    <p class="loading-state">{{ t('product.loading') }}</p>
  </div>
  <div v-else-if="error" class="content-band narrow">
    <h1>{{ t('product.loadError') }}</h1>
    <pre>{{ error }}</pre>
  </div>
  <template v-else>
    <section class="product-hero manual-hero">
      <div>
        <p class="eyebrow">{{ displayCategory }}</p>
        <h1>{{ product.name }}</h1>
        <p>{{ displayTitle }}</p>
      </div>
    </section>

    <section class="manual-layout">
      <aside class="doc-sidebar">
        <router-link class="back-btn" to="/">{{ t('product.backHome') }}</router-link>
        <h3>{{ product.name }}</h3>
        <nav class="doc-nav" :aria-label="t('product.navLabel')">
          <router-link :to="`/products/${product.id}`">{{ t('product.overview') }}</router-link>
          <router-link :to="`/products/${product.id}/flow`">{{ t('product.flow') }}</router-link>
          <router-link :to="`/products/${product.id}/troubleshooting`">{{ t('product.troubleshooting') }}</router-link>
          <div class="nav-label">{{ t('product.sopLabel') }}</div>
          <router-link
            v-for="doc in manual.documents"
            :key="doc.id"
            :to="`/products/${product.id}/sop/${doc.id}`"
          >{{ td(doc.title) }}</router-link>
        </nav>
      </aside>

      <article class="manual-content">
        <router-view />
      </article>
    </section>
  </template>
</template>

<script setup>
import { ref, computed, onMounted, provide } from "vue";
import { useRoute } from "vue-router";
import { useRepository } from "../composables/useRepository.js";
import { useI18n } from "../composables/useI18n.js";

const { t, td } = useI18n();
const route = useRoute();
const { getProductById, getManualByProductId } = useRepository();

const product = ref({});
const manual = ref({ documents: [], troubleshooting: { items: [] }, sourceSheets: [] });
const loading = ref(true);
const error = ref("");

const displayCategory = computed(() =>
  product.value.id ? (t(`products.${product.value.id}.category`) || product.value.category) : ""
);

const displayTitle = computed(() =>
  product.value.id ? (t(`products.${product.value.id}.title`) || product.value.title) : ""
);

provide("product", product);
provide("manual", manual);

const imageCount = computed(() =>
  manual.value.documents.reduce((sum, doc) => sum + Object.keys(doc.imageCoverage || {}).length, 0)
);

onMounted(async () => {
  try {
    const productId = route.params.productId;
    const [p, m] = await Promise.all([
      getProductById(productId),
      getManualByProductId(productId)
    ]);
    product.value = p;
    manual.value = m;
  } catch (e) {
    error.value = e.message;
  } finally {
    loading.value = false;
  }
});
</script>
