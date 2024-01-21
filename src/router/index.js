import { createRouter, createWebHistory } from 'vue-router'
import NotFound from '../views/sessions/404.vue'

//Decodes a token
const decodeToken = (token) => {
    if (!token) {
        return null;
    }
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(window.atob(base64));
}

//Checks if a users token is valid
const isTokenValid = () => {
    const token = localStorage.getItem('kai_userToken');
    const decoded = decodeToken(token);
    if (!decoded) {
        return false;
    }
    const currentTime = Date.now() / 1000;
    return decoded.exp > currentTime;
}

//Logs out the user if token is invalid
const logout = async () =>{
    //Clear account info so user can login again
    console.log("LOGGING USER OUT DUE TO INVALID TOKEN")
    await router.$store.dispatch("accounts/resetAccountExists");
    localStorage.setItem("kai_accountName", "");
    localStorage.setItem("kai_isConnected", 'false');
    localStorage.setItem("kai_isUsingXwallet", 'false');
    localStorage.setItem("kai_isUsingWalletConnect", 'false')
    //Lets make sure we dont redirect the user into an infinite loop by verifying they arnt already on the welcome screen
    if(router.currentRoute.value.name !== 'welcome'){
        await router.push({path: `/`});
    }

}

const routes = [
    {
        path: '/',
        name: 'Home',
        component: () => import('../layout/index.vue'),
        redirect: '/welcome',
        meta: {
            title: 'Home',
        },

        children: [
            {
                path: '/Kadenai',
                name: 'Kadenai',
                redirect: '/welcome',
                component: () => import('../views/pages/index.vue'),
                meta: {
                    title: 'Kadenai',
                },
                children: [
                    {
                        path: '/collection/:collectionid',
                        props:true,
                        name: 'collection',
                        component: () =>
                            import('../views/pages/collection-page.vue'),
                    },
                    {
                        path: '/collection/mint/:collectionid/:collectionname',
                        props:true,
                        name: 'mint_collection',
                        component: () =>
                            import('../views/pages/mint-page.vue'),
                    },
                    {
                        path: '/profile/:userid',
                        props:true,
                        name: 'profile',
                        component: () =>
                            import('../views/pages/profile-page.vue'),
                    },
                    {
                        path: '/mint',
                        name: 'create',
                        component: () =>
                            import('../views/pages/nft-mint-page.vue'),
                    },
                    {
                        path: '/explore',
                        name: 'explore',
                        component: () =>
                            import('../views/pages/explore-page.vue'),
                    },
                    {
                        path: '/welcome',
                        name: 'welcome',
                        component: () =>
                            import('../views/pages/home-page.vue'),
                    },
                    {
                        path: '/nft/:nftid',
                        props:true,
                        name: 'nft',
                        component: () =>
                            import('../views/pages/nft-page.vue'),
                    },
                ],
            },
        ],
    },

    { path: '/:path(.*)', component: NotFound },
]

const router = createRouter({
    history: createWebHistory(),
    scrollBehavior(to, from, savedPosition) {
        return { left: 0, top: 0 }
    },

    routes,
})
router.beforeEach((to, from, next) => {
    document.title = `${to.name} - ${import.meta.env.VITE_APP_TITLE}`
    next()
})
router.afterEach(async() => {
    // Remove initial loading
    const PreLoading = document.getElementById('loading_wrap')
    if (PreLoading) {
        PreLoading.style.display = 'none'
    }
})

export default router
