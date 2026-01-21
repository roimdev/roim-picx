<script setup lang="ts">
import { faCog, faUpload, faSignOutAlt, faUserCircle, faShieldAlt, faBars, faChevronRight, faShareAlt } from '@fortawesome/free-solid-svg-icons'
import { useRouter, useRoute } from 'vue-router'
import { ElScrollbar, ElConfigProvider, ElMessage, ElMessageBox, ElAvatar, ElDropdown, ElDropdownMenu, ElDropdownItem } from 'element-plus'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import en from 'element-plus/es/locale/lang/en'
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import storage from './utils/storage'
import ThemeToggle from './components/ThemeToggle.vue'
import LanguageSwitcher from './components/LanguageSwitcher.vue'
import { initTheme } from './utils/theme'
import { parseUserFromToken } from './utils/jwt'
import type { User } from './utils/types'
import { requestCurrentUser } from './utils/request'

const { t, locale } = useI18n()

// Element Plus locale based on current i18n locale
const elLocale = computed(() => locale.value.startsWith('zh') ? zhCn : en)

const repoLink = 'https://github.com/roimdev'
const repoName = 'roim-picx'
const appName = 'PICX'

document.title = appName

const router = useRouter()
const route = useRoute()

const isDeletePage = computed(() => route.path.startsWith('/delete/'))

const token = ref(storage.local.get('auth-token'))
const currentUser = ref<User | null>(null)
const isAdmin = ref(false)

// Watch token changes (in case of login/logout in other tabs or components updating storage)
// Note: storage.local.get is not reactive by default, so we might need a custom event or just rely on the fact that App.vue mounts once.
// But for Login->Home transition, router push happens.
// Better to check on mount and maybe watch route?
// Or simply rely on the fact that when we login, we redirect to /, reloading the app state if we force reload or just re-eval computed.
// Let's make it reactive by checking on route change or using a global state store if we had one.
// For now, let's update snippet on mount and route change.

const updateUserInfo = async () => {
	const t = storage.local.get('auth-token')
	token.value = t
	if (t) {
		currentUser.value = parseUserFromToken(t.token)
		// 检查是否是管理员
		try {
			const userInfo = await requestCurrentUser()
			isAdmin.value = userInfo.role === 'admin' || userInfo.isAdmin === true
		} catch (e) {
			isAdmin.value = false
		}
	} else {
		currentUser.value = null
		isAdmin.value = false
	}
}

watch(() => route.path, () => {
	updateUserInfo()
})

const navItems = computed(() => {
	const items = [
		{ path: '/up', label: t('nav.upload'), icon: faUpload },
		{ path: '/', label: t('nav.manage'), icon: faCog },
		{ path: '/shares', label: t('nav.myShares'), icon: faShareAlt }
	]
	// 管理员显示管理入口
	if (isAdmin.value) {
		items.push({ path: '/admin', label: t('nav.admin'), icon: faShieldAlt })
	}
	return items
})

onMounted(() => {
	initTheme()
	updateUserInfo()
})

const handleNavClick = (item: any) => {
	router.push(item.path)
}

const logout = async () => {
	try {
		await ElMessageBox.confirm(
			t('nav.logoutConfirmMsg'),
			t('nav.logoutConfirmTitle'),
			{
				confirmButtonText: t('common.confirm'),
				cancelButtonText: t('common.cancel'),
				type: 'warning',
			}
		)
		storage.local.remove('auth-token')
		token.value = ''
		currentUser.value = null
		ElMessage.success(t('nav.logout'))
		router.push('/auth')
	} catch (e) {
		// User cancelled
	}
}
</script>

<template>
	<el-config-provider :locale="elLocale">
		<div class="w-full h-screen overflow-x-hidden overflow-y-auto bg-gray-50 dark:bg-gray-950 transition-colors duration-300">
			<el-scrollbar>
				<div v-if="!isDeletePage"
					class="w-full h-16 bg-white/80 dark:bg-gray-900/80 border-b border-gray-200/50 dark:border-gray-800/50 sticky left-0 top-0 backdrop-blur-md z-50 transition-all duration-300">
					<div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-full flex items-center justify-between">
						<div class="flex items-center gap-3 cursor-pointer" @click="router.push('/')">
							<img src="./assets/picx-logo.png" class="w-8 h-8 object-contain drop-shadow-sm" />
						</div>

						<div class="flex items-center gap-2">
							<!-- Desktop Navigation -->
							<div class="hidden md:flex items-center gap-2">
								<div v-for="item in navItems" :key="item.path"
									class="px-4 py-2 rounded-full text-sm font-medium cursor-pointer transition-all duration-200 flex items-center gap-2"
									:class="[
										$route.path === item.path
											? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 shadow-sm ring-1 ring-indigo-200 dark:ring-indigo-800'
											: 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100'
									]" @click="handleNavClick(item)">
									<font-awesome-icon :icon="item.icon" />
									<span>{{ item.label }}</span>
								</div>
							</div>

							<!-- User Profile / Logout (Desktop Only) -->
							<div v-if="token"
								class="hidden md:flex items-center gap-3 pl-4 border-l border-gray-200 dark:border-gray-700 ml-2">
								<div class="flex items-center gap-2 group relative cursor-pointer" @click="logout"
									title="点击退出登录">
									<div class="relative">
										<el-avatar :size="32" :src="currentUser?.avatar_url"
											class="ring-2 ring-white dark:ring-gray-800 shadow-sm transition-transform group-hover:scale-105">
											<template #default>
												<font-awesome-icon :icon="faUserCircle" class="text-xl text-gray-400" />
											</template>
										</el-avatar>
										<span v-if="!currentUser"
											class="absolute -bottom-1 -right-1 w-3 h-3 bg-gray-400 rounded-full border-2 border-white dark:border-gray-800"
											title="Admin Token"></span>
										<span v-else
											class="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-gray-800"
											title="GitHub User"></span>
									</div>
									<div class="hidden lg:flex flex-col items-start leading-none gap-1">
										<span class="text-xs font-bold text-gray-700 dark:text-gray-200">{{
											currentUser?.name || 'Administrator' }}</span>
										<span class="text-[10px] text-gray-400 uppercase tracking-wider font-medium">{{
											currentUser ? 'GitHub' : 'System' }}</span>
									</div>
									<div
										class="absolute inset-0 bg-red-500/0 group-hover:bg-red-500/10 rounded-full md:rounded-lg transition-colors -m-1">
									</div>
								</div>
							</div>

							<!-- Essential Actions (Theme, Language, Mobile Avatar) -->
							<div class="flex items-center gap-3 pl-2 sm:pl-4 border-l border-gray-200 dark:border-gray-700 ml-1 sm:ml-2">
								<!-- Mobile Avatar (Hidden on Desktop) -->
								<div v-if="token" class="md:hidden">
									<el-avatar :size="28" :src="currentUser?.avatar_url">
										<template #default>
											<font-awesome-icon :icon="faUserCircle" class="text-lg text-gray-400" />
										</template>
									</el-avatar>
								</div>
								<LanguageSwitcher />
								<theme-toggle />
							</div>

							<!-- Mobile Menu Icon (Far Right) -->
							<div class="md:hidden flex items-center border-l border-gray-200 dark:border-gray-700 pl-2">
								<el-dropdown trigger="click" @command="(cmd: string) => cmd === 'logout' ? logout() : router.push(cmd)">
									<div class="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors cursor-pointer">
										<font-awesome-icon :icon="faBars" class="text-xl" />
									</div>
									<template #dropdown>
										<el-dropdown-menu class="w-48">
											<el-dropdown-item v-for="item in navItems" :key="item.path" :command="item.path">
												<div class="flex items-center justify-between w-full py-1">
													<div class="flex items-center gap-3">
														<font-awesome-icon :icon="item.icon" class="w-4" />
														<span>{{ item.label }}</span>
													</div>
													<font-awesome-icon :icon="faChevronRight" class="text-[10px] opacity-30" />
												</div>
											</el-dropdown-item>
											<el-dropdown-item v-if="token" divided command="logout" class="!text-red-500">
												<div class="flex items-center gap-3 py-1">
													<font-awesome-icon :icon="faSignOutAlt" class="w-4" />
													<span>{{ $t('nav.logout') }}</span>
												</div>
											</el-dropdown-item>
										</el-dropdown-menu>
									</template>
								</el-dropdown>
							</div>
						</div>
					</div>
				</div>

				<div :class="isDeletePage ? 'min-h-screen' : 'min-h-[calc(100vh-64px-64px)]'" class="w-full">
					<router-view />
				</div>

				<div v-if="!isDeletePage"
					class="w-full py-6 border-t border-gray-200/50 dark:border-gray-800/50 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm mt-auto">
					<div class="max-w-7xl mx-auto flex items-center justify-center text-gray-500 dark:text-gray-400 text-sm">
						<span class="mr-1">Powered by</span>
						<a :href="repoLink" target="_blank"
							class="font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors hover:underline">
							{{ repoName }}
						</a>
					</div>
				</div>
			</el-scrollbar>
		</div>
	</el-config-provider>
</template>
