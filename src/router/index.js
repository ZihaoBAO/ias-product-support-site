import { createRouter, createWebHashHistory } from "vue-router";

const routes = [
  {
    path: "/",
    name: "Home",
    component: () => import("../views/HomePage.vue")
  },
  {
    path: "/products/:productId",
    name: "Product",
    component: () => import("../views/ProductPage.vue"),
    children: [
      {
        path: "",
        name: "ProductOverview",
        component: () => import("../views/ProductOverview.vue")
      },
      {
        path: "flow",
        name: "ProductFlow",
        component: () => import("../views/ProductFlow.vue")
      },
      {
        path: "troubleshooting",
        name: "ProductTroubleshooting",
        component: () => import("../views/ProductTroubleshooting.vue")
      },
      {
        path: "sop/:docId",
        name: "ProductSop",
        component: () => import("../views/ProductSop.vue")
      },
      // {
      //   path: "audit/:sheetSlug",
      //   name: "ProductAudit",
      //   component: () => import("../views/ProductAudit.vue")
      // }
    ]
  },
  {
    path: "/:pathMatch(.*)*",
    name: "NotFound",
    component: () => import("../views/NotFoundPage.vue")
  }
];

const router = createRouter({
  history: createWebHashHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition;
    }
    return { top: 0 };
  }
});

export default router;
