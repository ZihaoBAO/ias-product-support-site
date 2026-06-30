<template>
  <div>
    <section class="hero-band">
      <div class="hero-copy">
        <p class="eyebrow">{{ t('home.eyebrow') }}</p>
        <h1>{{ t('home.heroTitle') }}</h1>
      </div>
    </section>

    <section class="toolbar-band">
      <div>
        <h2>{{ t('home.docTitle') }}</h2>
        <p>{{ t('home.docDesc') }}</p>
      </div>
      <label class="search-box">
        <span>{{ t('home.searchLabel') }}</span>
        <input type="search" v-model="query" :placeholder="t('home.searchPlaceholder')" />
      </label>
    </section>

    <section class="product-grid">
      <ProductCard
        v-for="product in filteredProducts"
        :key="product.id"
        :product="product"
      />
    </section>

    <ProcessFlow />

    <footer class="contact-footer">
      <h2 class="contact-title">{{ t('home.contact.title') }}</h2>

      <!-- 简体中文：电话 + 微信二维码 -->
      <div v-if="locale === 'zh-CN'" class="contact-cn">
        <div class="contact-phone">
          <span class="contact-label">{{ t('home.contact.phone') }}</span>
          <a href="tel:400-828-7080" class="contact-phone-number">{{ t('home.contact.phoneNumber') }}</a>
        </div>
        <div class="contact-wechat">
          <span class="contact-label">{{ t('home.contact.wechat') }}</span>
          <img :src="`${baseUrl}images/wechat-qr.png`" alt="WeChat QR" class="wechat-qr" />
        </div>
      </div>

      <!-- 非简体中文：邮箱 -->
      <div v-else class="contact-intl">
        <table class="contact-table">
          <thead>
            <tr>
              <th>{{ t('home.contact.email') }}</th>
              <th>{{ t('home.contact.scope') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><a href="mailto:IAS-SERVICE@ias-glb.com">{{ t('home.contact.email1') }}</a></td>
              <td>{{ t('home.contact.email1Desc') }}</td>
            </tr>
            <tr>
              <td><a href="mailto:fusong@ias-glb.com">{{ t('home.contact.email2') }}</a></td>
              <td>{{ t('home.contact.email2Desc') }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </footer>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from "vue";
import { useRepository } from "../composables/useRepository.js";
import { useI18n } from "../composables/useI18n.js";
import ProductCard from "../components/ProductCard.vue";
import ProcessFlow from "../components/ProcessFlow.vue";

const { t, locale } = useI18n();
const { getProducts, searchProducts } = useRepository();

const baseUrl = import.meta.env.BASE_URL;

const query = ref("");
const products = ref([]);
const allProducts = ref([]);

const filteredProducts = computed(() => {
  if (!query.value.trim()) return allProducts.value;
  return allProducts.value.filter((p) => {
    const fields = [p.name, p.title, p.summary, p.status, ...(p.tags || [])];
    return fields.join(" ").toLowerCase().includes(query.value.trim().toLowerCase());
  });
});

const totalSop = computed(() =>
  allProducts.value.reduce((sum, item) => sum + item.sopCount, 0)
);

onMounted(async () => {
  allProducts.value = await getProducts();
  products.value = allProducts.value;
});
</script>
