import { createRouter, createWebHistory } from 'vue-router'
import DefaultLayout from '../layouts/DefaultLayout.vue'
import BlankLayout from '../layouts/BlankLayout.vue'

const router = createRouter({
	history: createWebHistory(),
	routes: [
		{
			path: '/',
			component: DefaultLayout,
			children: [
				{
					path: '',
					component: () => import('../views/ManageImages.vue')
				},
				{
					path: 'up',
					component: () => import('../views/UploadImages.vue')
				},
				{
					path: 'admin',
					component: () => import('../views/AdminView.vue'),
					meta: { requiresAuth: true }
				},
				{
					path: 'shares',
					component: () => import('../views/MySharesView.vue')
				},
				{
					path: 'albums',
					component: () => import('../components/album/AlbumList.vue'),
					meta: { requiresAuth: true }
				},
				{
					path: 'albums/:id',
					component: () => import('../components/album/AlbumDetail.vue'),
					meta: { requiresAuth: true }
				}
			]
		},
		{
			path: '/auth',
			component: BlankLayout,
			children: [
				{
					path: '',
					component: () => import('../views/auth.vue')
				}
			]
		},
		{
			path: '/delete/:token',
			component: BlankLayout,
			children: [
				{
					path: '',
					component: () => import('../views/DeleteImage.vue')
				}
			]
		},
		{
			path: '/s/:id',
			component: BlankLayout,
			children: [
				{
					path: '',
					component: () => import('../views/ShareView.vue'),
					meta: { public: true }
				}
			]
		},
		{
			path: '/s/album/:token',
			component: BlankLayout,
			children: [
				{
					path: '',
					component: () => import('../components/album/PublicAlbumView.vue'),
					meta: { public: true }
				}
			]
		},
		{
			path: '/:path(.*)',
			redirect: '/'
		}
	]
})

export default router
