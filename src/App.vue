<template>
	<el-config-provider :locale="zhCn">
		<div class="w-full h-screen overflow-x-hidden overflow-y-auto">
			<el-scrollbar>
				<div v-if="!isDeletePage"
					class="w-full h-16 bg-white/80 border-b border-gray-200/50 sticky left-0 top-0 backdrop-blur-md z-50 transition-all duration-300">
					<div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between">
						<div class="flex items-center gap-3 cursor-pointer" @click="router.push('/')">
							<img src="./assets/picx-logo.png" class="w-8 h-8 object-contain drop-shadow-sm" />
							<span
								class="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
								{{ appName }}
							</span>
						</div>

						<div class="flex items-center gap-2">
							<div v-for="item in navItems" :key="item.path"
								class="px-4 py-2 rounded-full text-sm font-medium cursor-pointer transition-all duration-200 flex items-center gap-2"
								:class="[
									$route.path === item.path
										? 'bg-indigo-50 text-indigo-600 shadow-sm ring-1 ring-indigo-200'
										: 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
								]" @click="handleNavClick(item)">
								<font-awesome-icon :icon="item.icon" />
								<span class="hidden sm:inline-block">{{ item.label }}</span>
							</div>
						</div>
					</div>
				</div>

				<div :class="isDeletePage ? 'min-h-screen' : 'min-h-[calc(100vh-64px-64px)]'" class="w-full">
					<router-view />
				</div>

				<div v-if="!isDeletePage"
					class="w-full py-6 border-t border-gray-200/50 bg-white/50 backdrop-blur-sm mt-auto">
					<div class="max-w-7xl mx-auto flex items-center justify-center text-gray-500 text-sm">
						<span class="mr-1">Powered by</span>
						<a :href="repoLink" target="_blank"
							class="font-medium text-indigo-600 hover:text-indigo-700 transition-colors hover:underline">
							{{ repoName }}
						</a>
					</div>
				</div>
			</el-scrollbar>
		</div>
	</el-config-provider>
</template>

<script setup lang="ts">
import { faCog, faUpload, faSignOutAlt } from '@fortawesome/free-solid-svg-icons'
import { useRouter, useRoute } from 'vue-router'
import { ElScrollbar, ElConfigProvider, ElMessage } from 'element-plus'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import { computed } from 'vue'
import storage from './utils/storage'

const repoLink = 'https://roim.app'
const repoName = 'roim-picx'
const appName = 'PICX'

document.title = appName

const router = useRouter()
const route = useRoute()

const isDeletePage = computed(() => route.path.startsWith('/delete/'))

const navItems = [
	{ path: '/up', label: '上传', icon: faUpload, action: null },
	{ path: '/', label: '管理', icon: faCog, action: null },
	{ path: '', label: '退出', icon: faSignOutAlt, action: 'logout' }
]

const handleNavClick = (item: any) => {
	if (item.action === 'logout') {
		storage.local.remove('auth-token')
		ElMessage.success('已退出登录')
		router.push('/auth')
	} else {
		router.push(item.path)
	}
}
</script>
