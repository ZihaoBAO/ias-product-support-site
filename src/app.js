import {
  getExcelSheetByProductId,
  getManualByProductId,
  getProductById,
  getProducts,
  searchProducts
} from "./data/repository.js";

const app = document.querySelector("#app");

const state = {
  products: [],
  filteredProducts: [],
  query: ""
};

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeAttribute(value) {
  return escapeHtml(value).replaceAll("\n", " ");
}

function textBlock(value) {
  const text = escapeHtml(value);
  return text ? text.replaceAll("\n", "<br>") : "";
}

function routeTo(productId, section = "", item = "") {
  const suffix = section ? `/${section}${item ? `/${item}` : ""}` : "";
  return `#/products/${productId}${suffix}`;
}

function setTitle(title) {
  document.title = title ? `${title} - IAS 产品售后说明中心` : "IAS 产品售后说明中心";
}

function renderShell(content) {
  app.innerHTML = `
    <header class="topbar">
      <a class="brand" href="#/">
        <span class="brand-mark">IAS</span>
        <span>
          <strong>产品售后说明中心</strong>
          <small>Maintenance SOP Portal</small>
        </span>
      </a>
      <nav class="topnav" aria-label="主导航">
        <a href="#/" class="${!location.hash || location.hash === "#/" ? "active" : ""}">首页</a>
        <a href="#/products">产品</a>
      </nav>
    </header>
    <main>${content}</main>
  `;
}

function productCard(product) {
  return `
    <article class="product-card">
      <div class="product-card-head">
        <span class="product-code">${escapeHtml(product.name)}</span>
        <span class="status-pill status-ready">文档已生成</span>
      </div>
      <h3>${escapeHtml(product.title)}</h3>
      <p>${escapeHtml(product.summary)}</p>
      <dl class="meta-grid compact">
        <div><dt>SOP</dt><dd>${product.sopCount}</dd></div>
        <div><dt>故障项</dt><dd>${product.faultCount}</dd></div>
        <div><dt>来源</dt><dd>Excel</dd></div>
      </dl>
      <div class="tag-row">${product.tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}</div>
      <a class="text-link" href="${routeTo(product.id)}">打开维护文档</a>
    </article>
  `;
}

function renderHome() {
  setTitle();
  renderShell(`
    <section class="hero-band">
      <div class="hero-copy">
        <p class="eyebrow">CUSTOMER-READABLE MAINTENANCE DOCS</p>
        <h1>IAS 产品售后说明中心</h1>
        <p class="lead">将 IAS-3120 与 IAS-5100 的 Excel 维护资料整理为可阅读、可跳转、可审核的网页文档。默认展示步骤卡片、故障排查和流程说明，原始 Excel 仅作为审核对照入口保留。</p>
      </div>
      <div class="hero-panel" aria-label="站点概览">
        <div class="metric"><strong>${state.products.length}</strong><span>产品</span></div>
        <div class="metric"><strong>${state.products.reduce((sum, item) => sum + item.sopCount, 0)}</strong><span>SOP 文档</span></div>
        <div class="metric"><strong>OK</strong><span>结构化审核</span></div>
      </div>
    </section>

    <section class="toolbar-band">
      <div>
        <h2>产品文档</h2>
        <p>选择产品后，可通过左侧目录进入故障排查、通用流程和具体维护步骤。</p>
      </div>
      <label class="search-box">
        <span>搜索产品</span>
        <input id="productSearch" type="search" value="${escapeAttribute(state.query)}" placeholder="输入 3120、5100 或维护模块" />
      </label>
    </section>

    <section class="product-grid" id="productGrid">
      ${state.filteredProducts.map(productCard).join("")}
    </section>
  `);

  document.querySelector("#productSearch")?.addEventListener("input", async (event) => {
    state.query = event.target.value;
    state.filteredProducts = await searchProducts(state.query);
    document.querySelector("#productGrid").innerHTML = state.filteredProducts.map(productCard).join("");
  });
}

function docNav(product, manual, activeSection, activeItem = "") {
  const firstSheet = manual.sourceSheets[0]?.slug || "";
  return `
    <aside class="doc-sidebar">
      <a class="back-link" href="#/">返回首页</a>
      <h3>${escapeHtml(product.name)}</h3>
      <nav class="doc-nav" aria-label="文档目录">
        <a class="${activeSection === "overview" ? "active" : ""}" href="${routeTo(product.id)}">文档概览</a>
        <a class="${activeSection === "flow" ? "active" : ""}" href="${routeTo(product.id, "flow")}">通用排查流程</a>
        <a class="${activeSection === "troubleshooting" ? "active" : ""}" href="${routeTo(product.id, "troubleshooting")}">故障排查表</a>
        <div class="nav-label">维护 SOP</div>
        ${manual.documents
          .map((doc) => `<a class="${activeSection === "sop" && activeItem === doc.id ? "active" : ""}" href="${routeTo(product.id, "sop", doc.id)}">${escapeHtml(doc.title)}</a>`)
          .join("")}
      </nav>
    </aside>
  `;
  // 内部审核 + 审核对照 已注释
  /* 
  return `
    <aside class="doc-sidebar">
      <div class="sidebar-brand">...</div>
      <nav class="doc-nav">
        ...
        <div class="nav-label">内部审核</div>
        <a ...>审核对照</a>
  `;
  */
}

function productHero(product, manual) {
  const imageCount = manual.documents.reduce((sum, doc) => sum + Object.keys(doc.imageCoverage || {}).length, 0);
  return `
    <section class="product-hero manual-hero">
      <div>
        <p class="eyebrow">${escapeHtml(product.category)}</p>
        <h1>${escapeHtml(product.name)}</h1>
        <p>${escapeHtml(product.title)}</p>
      </div>
      <div class="manual-metrics">
        <div><strong>${manual.documents.length}</strong><span>SOP</span></div>
        <div><strong>${manual.troubleshooting.items.length}</strong><span>故障项</span></div>
        <div><strong>${imageCount}</strong><span>图片</span></div>
      </div>
    </section>
  `;
}

function renderProductFrame(product, manual, activeSection, activeItem, content) {
  setTitle(product.name);
  renderShell(`
    ${productHero(product, manual)}
    <section class="manual-layout">
      ${docNav(product, manual, activeSection, activeItem)}
      <article class="manual-content">${content}</article>
    </section>
  `);
}

function renderOverview(product, manual) {
  const toc = manual.toc.map((item) => `<li>${escapeHtml(item.text)}</li>`).join("");
  const docs = manual.documents
    .map((doc) => `
      <a class="doc-card" href="${routeTo(product.id, "sop", doc.id)}">
        <span>${escapeHtml(doc.sourceSheet)}</span>
        <strong>${escapeHtml(doc.title)}</strong>
        <small>${doc.versions.length} 个版本 / ${doc.versions.reduce((sum, version) => sum + version.steps.length, 0)} 个步骤</small>
      </a>
    `)
    .join("");

  return `
    <section class="manual-section">
      <h2>文档概览</h2>
      <p class="section-lead">本页面根据 Excel 目录和工作表结构生成。说明正文保留英文原文，导航和操作入口使用中文。</p>
      <div class="overview-grid">
        <div class="overview-panel">
          <h3>Excel 目录</h3>
          <ol class="toc-list">${toc}</ol>
        </div>
        <div class="overview-panel">
          <h3>阅读入口</h3>
          <div class="quick-links">
            <a href="${routeTo(product.id, "flow")}">查看通用排查流程</a>
            <a href="${routeTo(product.id, "troubleshooting")}">查看故障排查表</a>
            <a href="${routeTo(product.id, "sop", manual.documents[0]?.id || "")}">查看第一个 SOP</a>
          </div>
        </div>
      </div>
      <h3>维护 SOP</h3>
      <div class="doc-card-grid">${docs}</div>
    </section>
  `;
}

function renderFlow(manual) {
  return `
    <section class="manual-section">
      <h2>${escapeHtml(manual.troubleshootingFlow.title)}</h2>
      <p class="section-lead">按 Excel 中 Troubleshooting Steps 拆分为流程时间线。</p>
      <div class="timeline-list">
        ${manual.troubleshootingFlow.steps
          .map((step) => `
            <article class="timeline-step">
              <span>${escapeHtml(step.number || "•")}</span>
              <div>
                <h3>${escapeHtml(step.title)}</h3>
                ${step.details.map((detail) => `<p>${textBlock(detail.text)}</p>`).join("")}
              </div>
            </article>
          `)
          .join("")}
      </div>
    </section>
  `;
}

function renderTroubleshooting(product, manual) {
  return `
    <section class="manual-section">
      <div class="section-title-row">
        <div>
          <h2>${escapeHtml(manual.troubleshooting.title)}</h2>
          <p class="section-lead">空白故障分类已继承上一行分类。可搜索故障、原因、工具或备件。</p>
        </div>
        <label class="search-box compact-search">
          <span>搜索</span>
          <input id="faultSearch" type="search" placeholder="输入 fault / tool / part" />
        </label>
      </div>
      <div class="fault-groups">
        ${manual.troubleshooting.groups
          .map((group) => `
            <section class="fault-group">
              <h3>${escapeHtml(group.category)}</h3>
              <div class="fault-table">
                ${group.items
                  .map((item) => `
                    <article class="fault-row" data-search="${escapeAttribute(`${group.category} ${item.possibleCause} ${item.inspection} ${item.maintenance} ${item.tools} ${item.spareParts}`.toLowerCase())}">
                      <div><span>Possible Cause</span><strong>${escapeHtml(item.possibleCause)}</strong></div>
                      <div><span>Inspection</span><p>${textBlock(item.inspection)}</p></div>
                      <div><span>Maintenance</span><p>${textBlock(item.maintenance)}</p>${item.relatedDocId ? `<a href="${routeTo(product.id, "sop", item.relatedDocId)}">打开相关 SOP</a>` : ""}</div>
                      <div><span>Tools / Spare Parts</span><p>${escapeHtml([item.tools, item.spareParts].filter(Boolean).join(" / "))}</p></div>
                    </article>
                  `)
                  .join("")}
              </div>
            </section>
          `)
          .join("")}
      </div>
    </section>
  `;
}

function renderResources(version) {
  const resources = version.resources || [];
  if (!resources.length || resources.every((item) => !item.rows.length)) return "";
  return `
    <div class="resource-stack">
      ${resources
        .filter((item) => item.rows.length)
        .map((resource) => `
          <section class="resource-panel">
            <h4>${escapeHtml(resource.title)}</h4>
            ${resource.rows.map((row) => `<div class="resource-row">${row.cells.map((cell) => `<span>${escapeHtml(cell.text)}</span>`).join("")}</div>`).join("")}
          </section>
        `)
        .join("")}
    </div>
  `;
}

function renderStepImages(step) {
  if (step.images.length) {
    return `
      <div class="step-images">
        ${step.images
          .map((image) => `
            <figure>
              <img src="${escapeAttribute(image.src)}" alt="${escapeAttribute(`${step.number} ${image.id}`)}" loading="lazy" />
              <figcaption>${escapeHtml(image.id)} · row ${image.anchor.from.row}</figcaption>
            </figure>
          `)
          .join("")}
      </div>
    `;
  }
  if (step.noImage) return `<p class="image-note muted-note">No image</p>`;
  if (step.imageNote) return `<p class="image-note">${textBlock(step.imageNote)}</p>`;
  return "";
}

function renderReference(productId, reference) {
  if (!reference) return "";
  if (reference.targetDocId) {
    return `<a class="reference-link" href="${routeTo(productId, "sop", reference.targetDocId)}">${escapeHtml(reference.label)}</a>`;
  }
  return `<span class="reference-link muted-note">${escapeHtml(reference.label)}</span>`;
}

function renderSop(product, doc) {
  const versionButtons = doc.versions
    .map((version, index) => `<button class="${index === 0 ? "active" : ""}" type="button" data-version="${escapeAttribute(version.id)}">${escapeHtml(version.label)}</button>`)
    .join("");
  const versionPanels = doc.versions
    .map((version, index) => `
      <section class="version-panel ${index === 0 ? "active" : ""}" data-version-panel="${escapeAttribute(version.id)}">
        ${renderResources(version)}
        <div class="step-list">
          ${version.steps
            .map((step) => `
              <article class="step-card" id="${escapeAttribute(step.id)}">
                <div class="step-number">${escapeHtml(step.number)}</div>
                <div class="step-body">
                  <p>${textBlock(step.instruction)}</p>
                  ${renderReference(product.id, step.reference)}
                  ${renderStepImages(step)}
                </div>
              </article>
            `)
            .join("")}
        </div>
      </section>
    `)
    .join("");
  const unmatched = doc.unmatchedImages.filter((image) => image.reason !== "cover-or-title-image");

  return `
    <section class="manual-section">
      <div class="sop-heading">
        <div>
          <span class="source-chip">${escapeHtml(doc.sourceSheet)}</span>
          <h2>${escapeHtml(doc.title)}</h2>
          <p class="section-lead">按步骤卡片展示，图片根据 Excel 锚点自动匹配到对应步骤。</p>
        </div>
        <!-- <a class="audit-link" href="${routeTo(product.id, "audit", doc.sourceSheetSlug)}">查看原表对照</a> -->
      </div>
      <div class="version-tabs">${versionButtons}</div>
      ${versionPanels}
      ${
        unmatched.length
          ? `<section class="unmatched-panel"><h3>未匹配到具体步骤的图片</h3><div class="step-images">${unmatched.map((image) => `<figure><img src="${escapeAttribute(image.src)}" alt="${escapeAttribute(image.id)}" loading="lazy" /><figcaption>${escapeHtml(image.id)} · ${escapeHtml(image.reason)}</figcaption></figure>`).join("")}</div></section>`
          : ""
      }
      ${
        doc.annexCells.length
          ? `<details class="source-annex"><summary>其他源内容（已计入审核）</summary>${doc.annexCells.map((cell) => `<p><code>${escapeHtml(cell.address)}</code> ${textBlock(cell.text)}</p>`).join("")}</details>`
          : ""
      }
    </section>
  `;
}

function cellInlineStyle(cell) {
  const style = cell.style || {};
  const rules = [];
  if (style.fill) rules.push(`background:${style.fill}`);
  if (style.font?.bold) rules.push("font-weight:800");
  if (style.alignment?.horizontal) rules.push(`text-align:${style.alignment.horizontal}`);
  return rules.length ? ` style="${rules.join(";")}"` : "";
}

function renderRawCell(cell) {
  if (cell.covered) return "";
  const attrs = [cell.merge?.rowspan ? `rowspan="${cell.merge.rowspan}"` : "", cell.merge?.colspan ? `colspan="${cell.merge.colspan}"` : "", cellInlineStyle(cell)]
    .filter(Boolean)
    .join(" ");
  return `<td ${attrs}>${textBlock(cell.text)}</td>`;
}

function renderRawSheet(product, manual, sheet) {
  const headers = Array.from({ length: sheet.dimensions.maxColumn }, (_, index) => `<th>${index + 1}</th>`).join("");
  return `
    <section class="manual-section">
      <div class="sop-heading">
        <div>
          <span class="source-chip">审核对照</span>
          <h2>${escapeHtml(sheet.title)}</h2>
          <p class="section-lead">此视图仅用于内部核对，客户默认阅读文档化页面。</p>
        </div>
        <a class="audit-link" href="${routeTo(product.id)}">返回文档</a>
      </div>
      <div class="audit-sheet-nav">
        ${manual.sourceSheets.map((item) => `<a class="${item.slug === sheet.slug ? "active" : ""}" href="${routeTo(product.id, "audit", item.slug)}">${escapeHtml(item.title)}</a>`).join("")}
      </div>
      <div class="excel-table-shell">
        <table class="excel-table">
          <thead><tr><th>#</th>${headers}</tr></thead>
          <tbody>${sheet.rows.map((row) => `<tr><th class="row-index">${row.index}</th>${row.cells.map(renderRawCell).join("")}</tr>`).join("")}</tbody>
        </table>
      </div>
    </section>
  `;
}

function bindInteractions() {
  document.querySelectorAll(".version-tabs").forEach((tabs) => {
    tabs.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-version]");
      if (!button) return;
      const id = button.dataset.version;
      const section = tabs.parentElement;
      tabs.querySelectorAll("button").forEach((item) => item.classList.toggle("active", item === button));
      section.querySelectorAll("[data-version-panel]").forEach((panel) => panel.classList.toggle("active", panel.dataset.versionPanel === id));
    });
  });

  const faultSearch = document.querySelector("#faultSearch");
  if (faultSearch) {
    faultSearch.addEventListener("input", () => {
      const value = faultSearch.value.trim().toLowerCase();
      document.querySelectorAll(".fault-row").forEach((row) => {
        row.hidden = value && !row.dataset.search.includes(value);
      });
      document.querySelectorAll(".fault-group").forEach((group) => {
        group.hidden = !group.querySelector(".fault-row:not([hidden])");
      });
    });
  }
}

async function renderProduct(productId, section = "overview", item = "") {
  const [product, manual] = await Promise.all([getProductById(productId), getManualByProductId(productId)]);
  let content = "";
  if (section === "flow") {
    content = renderFlow(manual);
  } else if (section === "troubleshooting") {
    content = renderTroubleshooting(product, manual);
  } else if (section === "sop") {
    const doc = manual.documents.find((entry) => entry.id === item) || manual.documents[0];
    content = renderSop(product, doc);
    item = doc.id;
  } else if (section === "audit") {
    const sheetSlug = item || manual.sourceSheets[0]?.slug;
    const sheet = await getExcelSheetByProductId(product.id, sheetSlug);
    content = renderRawSheet(product, manual, sheet);
  } else {
    section = "overview";
    content = renderOverview(product, manual);
  }
  renderProductFrame(product, manual, section, item, content);
  bindInteractions();
}

function renderNotFound() {
  setTitle("未找到页面");
  renderShell(`<section class="content-band narrow"><h1>页面未找到</h1><p>请从首页重新选择产品。</p><a class="primary-button" href="#/">返回首页</a></section>`);
}

async function route() {
  try {
    state.products = await getProducts();
    state.filteredProducts = state.query ? await searchProducts(state.query) : state.products;
    const hash = window.location.hash || "#/";
    const [, section, productId, child, item] = hash.split("/");
    if (hash === "#/" || section === "") return renderHome();
    if (section === "products" && productId) return renderProduct(productId, child || "overview", item || "");
    if (section === "products") return renderHome();
    renderNotFound();
  } catch (error) {
    renderShell(`<section class="content-band narrow"><h1>加载失败</h1><pre>${escapeHtml(error.message)}</pre></section>`);
  }
}

window.addEventListener("hashchange", route);
route();
