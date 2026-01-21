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
			path: '/admin',
			component: () => import('../views/AdminView.vue'),
			meta: { requiresAuth: true }
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
			path: '/s/:id',
			component: () => import('../views/ShareView.vue'),
			meta: { public: true }
		},
		{
			path: '/:path(.*)',
			redirect: '/'
		}
	]
})

export default router
