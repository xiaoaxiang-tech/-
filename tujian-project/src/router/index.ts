import { createRouter, createWebHistory } from "vue-router";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path:'/',
      component:() => import('@/view/home.vue')
    },
    {
      path: "/demo-detail",
      component: () => import("@/view/demo-detail.vue"),
    },
  ],
});

export default router;
