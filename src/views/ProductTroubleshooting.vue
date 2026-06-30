<template>
  <section class="manual-section">
    <div class="section-title-row">
      <div>
        <h2>{{ td(manual.troubleshooting?.title) || "" }}</h2>
        <p class="section-lead">{{ t('troubleshooting.searchDesc') }}</p>
      </div>
      <label class="search-box compact-search">
        <span>{{ t('troubleshooting.searchLabel') }}</span>
        <input type="search" v-model="searchText" :placeholder="t('troubleshooting.searchPlaceholder')" />
      </label>
    </div>
    <div class="fault-groups">
      <section
        v-for="(group, gi) in visibleGroups"
        :key="gi"
        class="fault-group"
      >
        <h3>{{ td(group.category) }}</h3>
        <div class="fault-table">
          <article
            v-for="(item, ii) in group.items"
            :key="ii"
            class="fault-row"
          >
            <div>
              <span>{{ t('troubleshooting.possibleCause') }}</span>
              <strong>{{ td(item.possibleCause) }}</strong>
            </div>
            <div>
              <span>{{ t('troubleshooting.inspection') }}</span>
              <p v-html="td(item.inspection)" class="inspection-text"></p>
            </div>
            <div>
              <span>{{ t('troubleshooting.maintenance') }}</span>
              <p v-html="td(item.maintenance)" class="inspection-text"></p>
              <template v-if="item.relatedDocIds?.length">
                <router-link
                  v-for="link in item.relatedDocIds"
                  :key="link.id"
                  :to="`/products/${product.id}/sop/${link.id}`"
                >{{ link.label }}</router-link>
              </template>
              <router-link
                v-else-if="item.relatedDocId"
                :to="`/products/${product.id}/sop/${item.relatedDocId}`"
              >{{ t('troubleshooting.openRelatedSop') }}</router-link>
            </div>
            <div>
              <span>{{ t('troubleshooting.toolsParts') }}</span>
              <p>{{ tdList(item.tools) }} / {{ tdList(item.spareParts) }}</p>
            </div>
          </article>
        </div>
      </section>
    </div>
  </section>
</template>

<script setup>
import { ref, computed, inject } from "vue";
import { useI18n } from "../composables/useI18n.js";

const { t, td } = useI18n();
const product = inject("product", {});
const manual = inject("manual", { troubleshooting: { groups: [] } });

function tdList(str) {
  if (!str) return "";
  return str.split(", ").map((s) => td(s)).join(", ");
}

const searchText = ref("");

const visibleGroups = computed(() => {
  const q = searchText.value.trim().toLowerCase();
  if (!q) return manual.value.troubleshooting?.groups || [];

  return (manual.value.troubleshooting?.groups || [])
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        const fields = [
          group.category,
          item.possibleCause,
          item.inspection,
          item.maintenance,
          item.tools,
          item.spareParts,
          td(group.category),
          td(item.possibleCause),
          td(item.inspection),
          td(item.maintenance),
          tdList(item.tools),
          tdList(item.spareParts)
        ];
        return fields.join(" ").toLowerCase().includes(q);
      })
    }))
    .filter((group) => group.items.length > 0);
});
</script>

<style scoped>
.inspection-text {
  max-height: 160px;
  overflow-y: auto;
  white-space: pre-line;
}
</style>
