import router from "./plugins/router"
import storage from "./utils/storage";

router.beforeEach((to, from, next) => {
    // console.log(to.path)
    const path = to.path
    const token = storage.local.get('auth-token')
    // 不需要授权的页面
    if (path === '/auth' || path.startsWith('/delete')) {
        next()
        return
    }
    if (!token) {
        router.push('/auth')
        return
    }
    next()
})
