import { createRouter, createWebHistory } from "vue-router";
import LoginPage from "@/pages/LoginPage.vue";
import Dashboard from '@/pages/Dashboard.vue';
import DashboardLayout from '@/layouts/DashboardLayout.vue';
import Products from '@/pages/Products.vue';
import Categories from "@/pages/Categories.vue";
import Units from "@/pages/Units.vue";
import Reports from '@/pages/Reports.vue';
import Settings from '@/pages/Settings.vue';

const routes = [
    { 
        path: '/login', 
        name: 'login', 
        component: LoginPage 
    },
    {
        path: '/',
        component: DashboardLayout,
        meta: { requiresAuth: true },
        children: [
            { path: 'dashboard', name: 'dashboard', component: Dashboard },
            { path: 'products', name: 'products', component: Products },
            { path: 'categories', name: 'categories', component: Categories },
            { path: 'units', name: 'units', component: Units },
            { path: 'reports', name: 'reports', component: Reports },
            { path: 'settings', name: 'settings', component: Settings }
        ],
    },
    { 
        path: '/:pathMatch(.*)*', 
        redirect: '/dashboard' 
    }
];

const router = createRouter({
    history: createWebHistory(),
    routes,
});

router.beforeEach((to) => {
    const loggedIn = !!localStorage.getItem('auth_token');

    if (to.meta.requiresAuth && !loggedIn) {
        return { name: 'login' };
    }

    if (to.name === 'login' && loggedIn) {
        return { name: 'dashboard' };
    }
});

export default router;