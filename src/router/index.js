import { createRouter, createWebHistory } from "vue-router";
import LoginPage from "@/pages/LoginPage.vue";
import Dashboard from '@/pages/Dashboard.vue';
import DashboardLayout from '@/layouts/DashboardLayout.vue';

const routes=[
    {path:'/login', name:'login', component:LoginPage},
    {//nested 
        path:'/dashboard', 
        name:'DashboardLayout', 
        children:[
            {path:'',name:'dashboard',component:Dashboard}
        ],
        component: DashboardLayout, 
        meta:{requiresAuth:true}
    },
    {path:'/', redirect: '/login'},
]

const router =createRouter({
    history: createWebHistory(),
    routes,
})

router.beforeEach((to)=>{
    const loggedIn= !!localStorage.getItem('auth_token');

    if(to.meta.requiresAuth && !loggedIn){
        return {name: 'login'};
    }

    if(to.name=== 'login' && loggedIn){
        return {name:'DashboardLayout'};
    }
});

export default router