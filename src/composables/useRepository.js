let cachedIndex;
const productCache = new Map();
const excelSheetCache = new Map();
const manualCache = new Map();

const BASE = import.meta.env.BASE_URL;

async function loadJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Cannot load ${url}: ${response.status}`);
  }
  return response.json();
}

export function useRepository() {
  async function getProducts() {
    if (!cachedIndex) {
      cachedIndex = await loadJson(`${BASE}content/products.index.json`);
    }
    return cachedIndex.products;
  }

  async function getProductById(productId) {
    if (productCache.has(productId)) return productCache.get(productId);

    const [indexProducts, product, troubleshooting, parts, tools, downloads, excelManifest, migrationAudit] =
      await Promise.all([
        getProducts(),
        loadJson(`${BASE}content/products/${productId}/product.json`),
        loadJson(`${BASE}content/products/${productId}/troubleshooting.json`),
        loadJson(`${BASE}content/products/${productId}/parts.json`),
        loadJson(`${BASE}content/products/${productId}/tools.json`),
        loadJson(`${BASE}content/products/${productId}/downloads.json`),
        loadJson(`${BASE}content/products/${productId}/excel/manifest.json`),
        loadJson(`${BASE}content/products/${productId}/excel/migration.audit.json`)
      ]);

    const indexMeta = indexProducts.find((item) => item.id === productId);
    const result = {
      ...product,
      indexMeta,
      troubleshooting,
      parts,
      tools,
      downloads,
      excelManifest,
      migrationAudit
    };
    productCache.set(productId, result);
    return result;
  }

  async function getExcelSheetByProductId(productId, sheetSlug) {
    const cacheKey = `${productId}/${sheetSlug}`;
    if (excelSheetCache.has(cacheKey)) return excelSheetCache.get(cacheKey);

    const sheet = await loadJson(
      `${BASE}content/products/${productId}/excel/sheets/${sheetSlug}.json`
    );
    excelSheetCache.set(cacheKey, sheet);
    return sheet;
  }

  async function getManualByProductId(productId) {
    if (manualCache.has(productId)) return manualCache.get(productId);

    const manual = await loadJson(
      `${BASE}content/products/${productId}/manual/manual.json`
    );
    manualCache.set(productId, manual);
    return manual;
  }

  async function searchProducts(keyword) {
    const products = await getProducts();
    const value = keyword.trim().toLowerCase();
    if (!value) return products;

    return products.filter((product) => {
      const fields = [
        product.name,
        product.title,
        product.summary,
        product.status,
        ...(product.tags || [])
      ];
      return fields.join(" ").toLowerCase().includes(value);
    });
  }

  return {
    getProducts,
    getProductById,
    getExcelSheetByProductId,
    getManualByProductId,
    searchProducts
  };
}
