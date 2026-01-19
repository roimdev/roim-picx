import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
	history: createWebHistory(),
	routes: [
		{
			path: '/',
			component: () => import('../views/ManageImages.vue')
		},
		{
			path: '/up',
			component: () => import('../views/UploadImages.vue')
		},
		{
			path: '/auth',
			component: () => import('../views/auth.vue')
		},
		{
			path: '/delete/:token',
			component: () => import('../views/DeleteImage.vue')
		},
		{
			path: '/:path(.*)',
			redirect: '/'
		}
	]
})

export default router
