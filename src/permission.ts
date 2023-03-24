import router from "./plugins/router"
import storage from "./utils/storage";

router.beforeEach((to, from, next) => {
    // console.log(to.path)
    const path = to.path
    const token = storage.local.get('auth-token')
    if (path != '/auth' && !token) {
        router.push('/auth')
        return
    }
    next()
})
