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
			path: '/shares',
			component: () => import('../views/MySharesView.vue')
		},
		{
			path: '/albums',
			component: () => import('../components/album/AlbumList.vue'), // Using component directly as view for now
			meta: { requiresAuth: true }
		},
		{
			path: '/albums/:id',
			component: () => import('../components/album/AlbumDetail.vue'),
			meta: { requiresAuth: true }
		},
		{
			path: '/s/:id',
			component: () => import('../views/ShareView.vue'),
			meta: { public: true }
		},
		{
			path: '/s/album/:token',
			component: () => import('../components/album/PublicAlbumView.vue'),
			meta: { public: true }
		},
		{
			path: '/:path(.*)',
			redirect: '/'
		}
	]
})

export default router
