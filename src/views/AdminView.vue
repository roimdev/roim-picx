<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElMessage, ElMessageBox, ElTabs, ElTabPane, ElTable, ElTableColumn, ElButton, ElTag, ElSwitch, ElInput, ElSelect, ElOption, ElCard, ElStatistic, ElProgress, ElAvatar, ElEmpty, ElPagination, ElTooltip, ElDialog } from 'element-plus'
import { 
	faUsers, faChartLine, faClipboardList, faSync, faSearch, faEye, 
	faShieldAlt, faHardDrive, faImage, faCalendarAlt, faGlobe, faLink,
	faUser, faUserShield
} from '@fortawesome/free-solid-svg-icons'
import { 
	requestAdminUsers, requestAdminStats, requestAuditLogs, 
	requestSetUserViewAll, requestSetUserRole, requestSetUserQuota,
	requestAnalyticsOverview, requestAnalyticsTrend, requestTopImages,
	requestCurrentUser
} from '../utils/request'
import type { AdminUser, SystemStats, AuditLog, AnalyticsOverview, DailyTrend, TopImage, CurrentUserInfo } from '../utils/types'
import formatBytes from '../utils/format-bytes'

const { t, locale } = useI18n()

const activeTab = ref('users')
const loading = ref(false)

// 当前用户信息
const currentUserInfo = ref<CurrentUserInfo | null>(null)
const isAdmin = computed(() => currentUserInfo.value?.role === 'admin' || currentUserInfo.value?.isAdmin)

// 用户管理
const users = ref<AdminUser[]>([])
const userSearch = ref('')
const filteredUsers = computed(() => {
	if (!userSearch.value) return users.value
	const search = userSearch.value.toLowerCase()
	return users.value.filter(u => 
		u.login.toLowerCase().includes(search) || 
		(u.name && u.name.toLowerCase().includes(search))
	)
})

// 系统统计
const systemStats = ref<SystemStats | null>(null)

// 访问分析
const analyticsOverview = ref<AnalyticsOverview | null>(null)
const analyticsTrend = ref<DailyTrend[]>([])
const topImages = ref<TopImage[]>([])

// 审计日志
const auditLogs = ref<AuditLog[]>([])
const auditLogsHasMore = ref(false)
const auditOffset = ref(0)
const auditActionFilter = ref('')
const auditUserFilter = ref('')

// 配额设置对话框
const quotaDialogVisible = ref(false)
const quotaEditUser = ref<AdminUser | null>(null)
const quotaValue = ref(0)

const loadCurrentUser = async () => {
	try {
		currentUserInfo.value = await requestCurrentUser()
	} catch (e) {
		console.error('Failed to load current user:', e)
	}
}

const loadUsers = async () => {
	loading.value = true
	try {
		users.value = await requestAdminUsers()
	} catch (e) {
		console.error('Failed to load users:', e)
	} finally {
		loading.value = false
	}
}

const loadSystemStats = async () => {
	try {
		systemStats.value = await requestAdminStats()
	} catch (e) {
		console.error('Failed to load system stats:', e)
	}
}

const loadAnalytics = async () => {
	loading.value = true
	try {
		const [overview, trend, top] = await Promise.all([
			requestAnalyticsOverview(),
			requestAnalyticsTrend(),
			requestTopImages(20, 30)
		])
		analyticsOverview.value = overview
		analyticsTrend.value = trend
		topImages.value = top
	} catch (e) {
		console.error('Failed to load analytics:', e)
	} finally {
		loading.value = false
	}
}

const loadAuditLogs = async (reset = false) => {
	if (reset) {
		auditOffset.value = 0
		auditLogs.value = []
	}
	loading.value = true
	try {
		const result = await requestAuditLogs({
			limit: 50,
			offset: auditOffset.value,
			action: auditActionFilter.value || undefined,
			user: auditUserFilter.value || undefined
		})
		if (reset) {
			auditLogs.value = result.logs
		} else {
			auditLogs.value.push(...result.logs)
		}
		auditLogsHasMore.value = result.hasMore
		auditOffset.value += result.logs.length
	} catch (e) {
		console.error('Failed to load audit logs:', e)
	} finally {
		loading.value = false
	}
}

const handleTabChange = (tab: string | number) => {
	const tabStr = String(tab)
	if (tabStr === 'users' && users.value.length === 0) {
		loadUsers()
	} else if (tabStr === 'analytics' && !analyticsOverview.value) {
		loadAnalytics()
	} else if (tabStr === 'logs' && auditLogs.value.length === 0) {
		loadAuditLogs(true)
	}
}

const toggleViewAll = async (user: AdminUser) => {
	try {
		await requestSetUserViewAll(user.login, !user.canViewAll)
		user.canViewAll = !user.canViewAll
		ElMessage.success(t(user.canViewAll ? 'admin.grantSuccess' : 'admin.revokeSuccess', { user: user.login }))
	} catch (e) {
		console.error('Failed to toggle view all:', e)
	}
}

const toggleRole = async (user: AdminUser) => {
	const newRole = user.role === 'admin' ? 'user' : 'admin'
	try {
		await ElMessageBox.confirm(
			t(newRole === 'admin' ? 'admin.confirmPromote' : 'admin.confirmDemote', { user: user.login }),
			t('admin.confirmTitle'),
			{ type: 'warning' }
		)
		await requestSetUserRole(user.login, newRole)
		user.role = newRole
		if (newRole === 'admin') {
			user.canViewAll = true
		}
		ElMessage.success(t('admin.quotaSuccess'))
	} catch (e) {
		if (e !== 'cancel') {
			console.error('Failed to toggle role:', e)
		}
	}
}

const openQuotaDialog = (user: AdminUser) => {
	quotaEditUser.value = user
	quotaValue.value = Math.round(user.storageQuota / 1024 / 1024) // 转换为 MB
	quotaDialogVisible.value = true
}

const saveQuota = async () => {
	if (!quotaEditUser.value) return
	try {
		const quotaBytes = quotaValue.value * 1024 * 1024 // 转换为字节
		await requestSetUserQuota(quotaEditUser.value.login, quotaBytes)
		quotaEditUser.value.storageQuota = quotaBytes
		quotaDialogVisible.value = false
		ElMessage.success(t('admin.quotaSuccess'))
	} catch (e) {
		console.error('Failed to set quota:', e)
	}
}

const getActionLabel = (action: string) => {
	return t(`admin.actions_labels.${action}`) || action
}

const getActionType = (action: string): 'primary' | 'success' | 'warning' | 'info' | 'danger' => {
	const types: Record<string, 'primary' | 'success' | 'warning' | 'info' | 'danger'> = {
		'upload': 'success',
		'delete': 'danger',
		'rename': 'warning',
		'share': 'primary',
		'grant_permission': 'success',
		'revoke_permission': 'warning',
		'login': 'info'
	}
	return types[action] || 'info'
}

const formatDate = (dateStr: string) => {
	return new Date(dateStr).toLocaleString(locale.value === 'zh-CN' ? 'zh-CN' : 'en-US')
}

const getStoragePercent = (user: AdminUser) => {
	return Math.round((user.storageUsed / user.storageQuota) * 100)
}

onMounted(async () => {
	await loadCurrentUser()
	if (isAdmin.value) {
		loadUsers()
		loadSystemStats()
	}
})
</script>

<template>
	<div class="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
		<!-- 非管理员提示 -->
		<div v-if="!isAdmin" class="text-center py-20">
			<el-empty :description="$t('admin.noPermission')">
				<template #image>
					<font-awesome-icon :icon="faShieldAlt" class="text-6xl text-gray-300" />
				</template>
			</el-empty>
		</div>

		<!-- 管理员面板 -->
		<div v-else>
			<!-- 系统概览卡片 -->
			<div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
				<el-card shadow="hover" class="!border-0 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20">
					<div class="flex items-center gap-4">
						<div class="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
							<font-awesome-icon :icon="faUsers" class="text-xl text-blue-500" />
						</div>
						<div>
							<div class="text-2xl font-bold text-gray-800 dark:text-gray-100">{{ systemStats?.userCount || 0 }}</div>
							<div class="text-sm text-gray-500 dark:text-gray-400">{{ $t('admin.totalUsers') }}</div>
						</div>
					</div>
				</el-card>
				<el-card shadow="hover" class="!border-0 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20">
					<div class="flex items-center gap-4">
						<div class="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center">
							<font-awesome-icon :icon="faImage" class="text-xl text-green-500" />
						</div>
						<div>
							<div class="text-2xl font-bold text-gray-800 dark:text-gray-100">{{ systemStats?.imageCount || 0 }}</div>
							<div class="text-sm text-gray-500 dark:text-gray-400">{{ $t('admin.totalImages') }}</div>
						</div>
					</div>
				</el-card>
				<el-card shadow="hover" class="!border-0 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20">
					<div class="flex items-center gap-4">
						<div class="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center">
							<font-awesome-icon :icon="faHardDrive" class="text-xl text-purple-500" />
						</div>
						<div>
							<div class="text-2xl font-bold text-gray-800 dark:text-gray-100">{{ formatBytes(systemStats?.totalSize || 0) }}</div>
							<div class="text-sm text-gray-500 dark:text-gray-400">{{ $t('admin.storageUsed') }}</div>
						</div>
					</div>
				</el-card>
				<el-card shadow="hover" class="!border-0 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20">
					<div class="flex items-center gap-4">
						<div class="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center">
							<font-awesome-icon :icon="faCalendarAlt" class="text-xl text-orange-500" />
						</div>
						<div>
							<div class="text-2xl font-bold text-gray-800 dark:text-gray-100">{{ systemStats?.recentUploads || 0 }}</div>
							<div class="text-sm text-gray-500 dark:text-gray-400">{{ $t('admin.weekUploads') }}</div>
						</div>
					</div>
				</el-card>
			</div>

			<!-- 标签页 -->
			<el-card class="!border-0 shadow-sm">
				<el-tabs v-model="activeTab" @tab-change="handleTabChange">
					<!-- 用户管理 -->
					<el-tab-pane name="users">
						<template #label>
							<span class="flex items-center gap-2">
								<font-awesome-icon :icon="faUsers" />
								{{ $t('admin.users') }}
							</span>
						</template>

						<div class="mb-4 flex items-center gap-4">
							<el-input v-model="userSearch" :placeholder="$t('admin.searchUser')" clearable class="!w-64">
								<template #prefix>
									<font-awesome-icon :icon="faSearch" class="text-gray-400" />
								</template>
							</el-input>
							<el-button @click="loadUsers" :loading="loading">
								<template #icon>
									<font-awesome-icon :icon="faSync" />
								</template>
								{{ $t('common.refresh') }}
							</el-button>
						</div>

						<div class="relative w-full overflow-x-auto pb-4" style="max-width: calc(100vw - 4rem);">
							<el-table :data="filteredUsers" v-loading="loading" stripe table-layout="fixed" style="width: 100%; min-width: 1100px;">
							<el-table-column :label="$t('admin.user')" min-width="200">
								<template #default="{ row }">
									<div class="flex items-center gap-3">
										<el-avatar :size="36" :src="row.avatarUrl">
											{{ row.login.charAt(0).toUpperCase() }}
										</el-avatar>
										<div>
											<div class="font-medium text-gray-800 dark:text-gray-200">{{ row.name || row.login }}</div>
											<div class="text-xs text-gray-400">@{{ row.login }}</div>
										</div>
									</div>
								</template>
							</el-table-column>
							<el-table-column :label="$t('admin.role')" width="120">
								<template #default="{ row }">
									<el-tag :type="row.role === 'admin' ? 'danger' : 'info'" size="small" effect="plain">
										{{ row.role === 'admin' ? $t('admin.roleAdmin') : $t('admin.roleUser') }}
									</el-tag>
								</template>
							</el-table-column>
							<el-table-column :label="$t('admin.viewPermission')" width="120">
								<template #default="{ row }">
									<el-switch 
										v-model="row.canViewAll" 
										@change="toggleViewAll(row)"
										:disabled="row.role === 'admin'"
									/>
								</template>
							</el-table-column>
							<el-table-column :label="$t('admin.uploadCount')" width="100">
								<template #default="{ row }">
									<span class="font-mono">{{ row.uploadCount }}</span>
								</template>
							</el-table-column>
							<el-table-column :label="$t('admin.storageUsage')" min-width="180">
								<template #default="{ row }">
									<div class="space-y-1">
										<el-progress 
											:percentage="getStoragePercent(row)" 
											:stroke-width="6"
											:color="getStoragePercent(row) > 90 ? '#f56c6c' : getStoragePercent(row) > 70 ? '#e6a23c' : '#67c23a'"
										/>
										<div class="text-xs text-gray-400">
											{{ formatBytes(row.storageUsed) }} / {{ formatBytes(row.storageQuota) }}
										</div>
									</div>
								</template>
							</el-table-column>
							<el-table-column :label="$t('admin.lastLogin')" width="160">
								<template #default="{ row }">
									<span class="text-sm text-gray-500">
										{{ row.lastLoginAt ? formatDate(row.lastLoginAt) : $t('admin.neverLogin') }}
									</span>
								</template>
							</el-table-column>
							<el-table-column :label="$t('admin.actions')" fixed="right" width="120">
								<template #default="{ row }">
									<div class="flex items-center gap-2">
										<el-tooltip :content="row.role === 'admin' ? $t('admin.demoteUser') : $t('admin.promoteAdmin')" placement="top">
											<el-button 
												size="small" 
												:type="row.role === 'admin' ? 'warning' : 'success'" 
												@click="toggleRole(row)" 
												circle
											>
												<font-awesome-icon :icon="row.role === 'admin' ? faUser : faUserShield" />
											</el-button>
										</el-tooltip>
										<el-tooltip :content="$t('admin.quota')" placement="top">
											<el-button 
												size="small" 
												type="primary" 
												@click="openQuotaDialog(row)" 
												circle
											>
												<font-awesome-icon :icon="faHardDrive" />
											</el-button>
										</el-tooltip>
									</div>
								</template>
							</el-table-column>
						</el-table>
					</div>
				</el-tab-pane>

					<!-- 访问分析 -->
					<el-tab-pane name="analytics">
						<template #label>
							<span class="flex items-center gap-2">
								<font-awesome-icon :icon="faChartLine" />
								{{ $t('admin.analytics') }}
							</span>
						</template>

						<div v-if="analyticsOverview" class="space-y-6">
							<!-- 访问统计 -->
							<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
								<el-card shadow="never" class="!bg-gray-50 dark:!bg-gray-800/50">
									<div class="text-center">
										<div class="text-3xl font-bold text-blue-500">{{ analyticsOverview.todayViews.toLocaleString() }}</div>
										<div class="text-sm text-gray-500 mt-1">{{ $t('admin.todayViews') }}</div>
									</div>
								</el-card>
								<el-card shadow="never" class="!bg-gray-50 dark:!bg-gray-800/50">
									<div class="text-center">
										<div class="text-3xl font-bold text-green-500">{{ analyticsOverview.weekViews.toLocaleString() }}</div>
										<div class="text-sm text-gray-500 mt-1">{{ $t('admin.weekViews') }}</div>
									</div>
								</el-card>
								<el-card shadow="never" class="!bg-gray-50 dark:!bg-gray-800/50">
									<div class="text-center">
										<div class="text-3xl font-bold text-purple-500">{{ analyticsOverview.monthViews.toLocaleString() }}</div>
										<div class="text-sm text-gray-500 mt-1">{{ $t('admin.monthViews') }}</div>
									</div>
								</el-card>
							</div>

							<!-- 访问来源 -->
							<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
								<el-card shadow="never">
									<template #header>
										<div class="flex items-center gap-2">
											<font-awesome-icon :icon="faGlobe" class="text-blue-500" />
											<span>{{ $t('admin.topCountries') }}</span>
										</div>
									</template>
									<div class="space-y-3">
										<div v-for="(item, index) in analyticsOverview.topCountries" :key="item.country" 
											class="flex items-center justify-between">
											<div class="flex items-center gap-2">
												<span class="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs flex items-center justify-center font-medium">
													{{ index + 1 }}
												</span>
												<span>{{ item.country || $t('common.unknown') }}</span>
											</div>
											<span class="font-mono text-gray-500">{{ item.count.toLocaleString() }}</span>
										</div>
										<el-empty v-if="analyticsOverview.topCountries.length === 0" :description="$t('common.noData')" :image-size="60" />
									</div>
								</el-card>

								<el-card shadow="never">
									<template #header>
										<div class="flex items-center gap-2">
											<font-awesome-icon :icon="faLink" class="text-green-500" />
											<span>{{ $t('admin.topReferers') }}</span>
										</div>
									</template>
									<div class="space-y-3">
										<div v-for="(item, index) in analyticsOverview.topReferers" :key="item.referer" 
											class="flex items-center justify-between">
											<div class="flex items-center gap-2 flex-1 min-w-0">
												<span class="w-5 h-5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 text-xs flex items-center justify-center font-medium shrink-0">
													{{ index + 1 }}
												</span>
												<el-tooltip :content="item.referer" placement="top">
													<span class="truncate text-sm">{{ item.referer }}</span>
												</el-tooltip>
											</div>
											<span class="font-mono text-gray-500 shrink-0 ml-2">{{ item.count.toLocaleString() }}</span>
										</div>
										<el-empty v-if="analyticsOverview.topReferers.length === 0" :description="$t('common.noData')" :image-size="60" />
									</div>
								</el-card>
							</div>

							<!-- 热门图片 -->
							<el-card shadow="never">
								<template #header>
									<div class="flex items-center justify-between">
										<div class="flex items-center gap-2">
											<font-awesome-icon :icon="faEye" class="text-orange-500" />
											<span>{{ $t('admin.topImages') }}</span>
										</div>
										<el-button size="small" @click="loadAnalytics" :loading="loading">{{ $t('common.refresh') }}</el-button>
									</div>
								</template>
								<div class="relative w-full overflow-x-auto pb-4" style="max-width: calc(100vw - 4rem);">
									<el-table :data="topImages" stripe size="small" table-layout="fixed" style="width: 100%; min-width: 1100px;">
									<el-table-column :label="$t('admin.image')" min-width="300">
										<template #default="{ row }">
											<div class="flex items-center gap-2">
												<span class="truncate">{{ row.original_name || row.key }}</span>
											</div>
										</template>
									</el-table-column>
									<el-table-column :label="$t('admin.uploader')" width="120" prop="user_login" />
									<el-table-column :label="$t('admin.size')" width="100">
										<template #default="{ row }">
											{{ formatBytes(row.size) }}
										</template>
									</el-table-column>
									<el-table-column :label="$t('admin.totalViews')" width="100">
										<template #default="{ row }">
											<span class="font-mono">{{ row.view_count.toLocaleString() }}</span>
										</template>
									</el-table-column>
									<el-table-column :label="$t('admin.recentViews')" width="100">
										<template #default="{ row }">
											<span class="font-mono text-orange-500">{{ row.recent_views.toLocaleString() }}</span>
										</template>
									</el-table-column>
								</el-table>
							</div>
						</el-card>
						</div>
						<div v-else class="py-10">
							<el-empty :description="$t('common.loading')" v-loading="loading" />
						</div>
					</el-tab-pane>

					<!-- 操作日志 -->
					<el-tab-pane name="logs">
						<template #label>
							<span class="flex items-center gap-2">
								<font-awesome-icon :icon="faClipboardList" />
								{{ $t('admin.logs') }}
							</span>
						</template>

						<div class="mb-4 flex items-center gap-4 flex-wrap">
							<el-select v-model="auditActionFilter" :placeholder="$t('admin.actionType')" clearable class="!w-40" @change="loadAuditLogs(true)">
								<el-option v-for="(label, key) in $t('admin.actions_labels')" :key="key" :label="label" :value="key" />
							</el-select>
							<el-input v-model="auditUserFilter" :placeholder="$t('admin.username')" clearable class="!w-40" @change="loadAuditLogs(true)">
								<template #prefix>
									<font-awesome-icon :icon="faSearch" class="text-gray-400" />
								</template>
							</el-input>
							<el-button @click="loadAuditLogs(true)" :loading="loading">{{ $t('admin.search') }}</el-button>
						</div>

						<div class="relative w-full overflow-x-auto pb-4" style="max-width: calc(100vw - 4rem);">
							<el-table :data="auditLogs" v-loading="loading" stripe table-layout="fixed" style="width: 100%; min-width: 1100px;">
							<el-table-column :label="$t('admin.time')" width="180">
								<template #default="{ row }">
									<span class="text-sm">{{ formatDate(row.created_at) }}</span>
								</template>
							</el-table-column>
							<el-table-column :label="$t('admin.user')" width="140">
								<template #default="{ row }">
									<span class="font-medium">{{ row.user_login || '-' }}</span>
								</template>
							</el-table-column>
							<el-table-column :label="$t('admin.action')" width="120">
								<template #default="{ row }">
									<el-tag :type="getActionType(row.action)" size="small">
										{{ getActionLabel(row.action) }}
									</el-tag>
								</template>
							</el-table-column>
							<el-table-column :label="$t('admin.target')" min-width="200">
								<template #default="{ row }">
									<el-tooltip v-if="row.target_key" :content="row.target_key" placement="top">
										<span class="truncate block max-w-xs text-sm text-gray-600 dark:text-gray-400">
											{{ row.target_key }}
										</span>
									</el-tooltip>
									<span v-else class="text-gray-400">-</span>
								</template>
							</el-table-column>
							<el-table-column :label="$t('admin.details')" min-width="200">
								<template #default="{ row }">
									<el-tooltip v-if="row.details" :content="row.details" placement="top">
										<span class="truncate block max-w-xs text-xs text-gray-500">
											{{ row.details }}
										</span>
									</el-tooltip>
									<span v-else class="text-gray-400">-</span>
								</template>
							</el-table-column>
						</el-table>
					</div>

					<div v-if="auditLogsHasMore" class="mt-4 text-center">
							<el-button @click="loadAuditLogs(false)" :loading="loading">{{ $t('admin.loadMore') }}</el-button>
						</div>
					</el-tab-pane>
				</el-tabs>
			</el-card>
		</div>

		<!-- 配额设置对话框 -->
		<el-dialog v-model="quotaDialogVisible" :title="$t('admin.setQuota')" width="400px">
			<div v-if="quotaEditUser" class="space-y-4">
				<div class="flex items-center gap-3 mb-4">
					<el-avatar :size="48" :src="quotaEditUser.avatarUrl || undefined">
						{{ quotaEditUser.login.charAt(0).toUpperCase() }}
					</el-avatar>
					<div>
						<div class="font-medium">{{ quotaEditUser.name || quotaEditUser.login }}</div>
						<div class="text-sm text-gray-400">@{{ quotaEditUser.login }}</div>
					</div>
				</div>
				<div>
					<label class="block text-sm font-medium mb-2">{{ $t('admin.storageQuotaMb') }}</label>
					<el-input v-model.number="quotaValue" type="number" :min="0">
						<template #append>MB</template>
					</el-input>
					<div class="text-xs text-gray-400 mt-1">
						{{ $t('admin.currentUsed') }}: {{ formatBytes(quotaEditUser.storageUsed) }}
					</div>
				</div>
				<div class="flex gap-2 pt-2">
					<el-button size="small" @click="quotaValue = 512">512MB</el-button>
					<el-button size="small" @click="quotaValue = 1024">1GB</el-button>
					<el-button size="small" @click="quotaValue = 2048">2GB</el-button>
					<el-button size="small" @click="quotaValue = 5120">5GB</el-button>
				</div>
			</div>
			<template #footer>
				<el-button @click="quotaDialogVisible = false">{{ $t('common.cancel') }}</el-button>
				<el-button type="primary" @click="saveQuota">{{ $t('common.save') }}</el-button>
			</template>
		</el-dialog>
	</div>
</template>
