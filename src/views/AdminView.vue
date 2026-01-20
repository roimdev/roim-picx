<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox, ElTabs, ElTabPane, ElTable, ElTableColumn, ElButton, ElTag, ElSwitch, ElInput, ElSelect, ElOption, ElCard, ElStatistic, ElProgress, ElAvatar, ElEmpty, ElPagination, ElTooltip, ElDialog } from 'element-plus'
import { faUsers, faChartLine, faClipboardList, faSync, faSearch, faEye, faShieldAlt, faHardDrive, faImage, faCalendarAlt, faGlobe, faLink } from '@fortawesome/free-solid-svg-icons'
import { 
	requestAdminUsers, requestAdminStats, requestAuditLogs, 
	requestSetUserViewAll, requestSetUserRole, requestSetUserQuota,
	requestAnalyticsOverview, requestAnalyticsTrend, requestTopImages,
	requestCurrentUser
} from '../utils/request'
import type { AdminUser, SystemStats, AuditLog, AnalyticsOverview, DailyTrend, TopImage, CurrentUserInfo } from '../utils/types'
import formatBytes from '../utils/format-bytes'

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
		ElMessage.success(`已${user.canViewAll ? '授权' : '取消授权'} ${user.login} 查看所有图片`)
	} catch (e) {
		console.error('Failed to toggle view all:', e)
	}
}

const toggleRole = async (user: AdminUser) => {
	const newRole = user.role === 'admin' ? 'user' : 'admin'
	try {
		await ElMessageBox.confirm(
			`确定要将 ${user.login} 的角色设置为 ${newRole === 'admin' ? '管理员' : '普通用户'} 吗？`,
			'确认操作',
			{ type: 'warning' }
		)
		await requestSetUserRole(user.login, newRole)
		user.role = newRole
		if (newRole === 'admin') {
			user.canViewAll = true
		}
		ElMessage.success(`已将 ${user.login} 设置为${newRole === 'admin' ? '管理员' : '普通用户'}`)
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
		ElMessage.success('配额设置成功')
	} catch (e) {
		console.error('Failed to set quota:', e)
	}
}

const getActionLabel = (action: string) => {
	const labels: Record<string, string> = {
		'upload': '上传',
		'delete': '删除',
		'rename': '重命名',
		'share': '分享',
		'grant_permission': '授权',
		'revoke_permission': '撤销授权',
		'login': '登录'
	}
	return labels[action] || action
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
	return new Date(dateStr).toLocaleString('zh-CN')
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
	<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
		<!-- 非管理员提示 -->
		<div v-if="!isAdmin" class="text-center py-20">
			<el-empty description="您没有管理员权限">
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
							<div class="text-sm text-gray-500 dark:text-gray-400">用户总数</div>
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
							<div class="text-sm text-gray-500 dark:text-gray-400">图片总数</div>
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
							<div class="text-sm text-gray-500 dark:text-gray-400">存储使用</div>
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
							<div class="text-sm text-gray-500 dark:text-gray-400">本周上传</div>
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
								用户管理
							</span>
						</template>

						<div class="mb-4 flex items-center gap-4">
							<el-input v-model="userSearch" placeholder="搜索用户..." clearable class="!w-64">
								<template #prefix>
									<font-awesome-icon :icon="faSearch" class="text-gray-400" />
								</template>
							</el-input>
							<el-button :icon="faSync" @click="loadUsers" :loading="loading">刷新</el-button>
						</div>

						<el-table :data="filteredUsers" v-loading="loading" stripe>
							<el-table-column label="用户" min-width="200">
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
							<el-table-column label="角色" width="120">
								<template #default="{ row }">
									<el-tag :type="row.role === 'admin' ? 'danger' : 'info'" size="small" effect="plain">
										{{ row.role === 'admin' ? '管理员' : '普通用户' }}
									</el-tag>
								</template>
							</el-table-column>
							<el-table-column label="查看权限" width="120">
								<template #default="{ row }">
									<el-switch 
										v-model="row.canViewAll" 
										@change="toggleViewAll(row)"
										:disabled="row.role === 'admin'"
									/>
								</template>
							</el-table-column>
							<el-table-column label="上传数量" width="100">
								<template #default="{ row }">
									<span class="font-mono">{{ row.uploadCount }}</span>
								</template>
							</el-table-column>
							<el-table-column label="存储使用" min-width="180">
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
							<el-table-column label="最后登录" width="160">
								<template #default="{ row }">
									<span class="text-sm text-gray-500">
										{{ row.lastLoginAt ? formatDate(row.lastLoginAt) : '从未登录' }}
									</span>
								</template>
							</el-table-column>
							<el-table-column label="操作" width="180" fixed="right">
								<template #default="{ row }">
									<div class="flex items-center gap-2">
										<el-button size="small" @click="toggleRole(row)">
											{{ row.role === 'admin' ? '降为用户' : '设为管理员' }}
										</el-button>
										<el-button size="small" type="primary" @click="openQuotaDialog(row)">
											配额
										</el-button>
									</div>
								</template>
							</el-table-column>
						</el-table>
					</el-tab-pane>

					<!-- 访问分析 -->
					<el-tab-pane name="analytics">
						<template #label>
							<span class="flex items-center gap-2">
								<font-awesome-icon :icon="faChartLine" />
								访问分析
							</span>
						</template>

						<div v-if="analyticsOverview" class="space-y-6">
							<!-- 访问统计 -->
							<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
								<el-card shadow="never" class="!bg-gray-50 dark:!bg-gray-800/50">
									<div class="text-center">
										<div class="text-3xl font-bold text-blue-500">{{ analyticsOverview.todayViews.toLocaleString() }}</div>
										<div class="text-sm text-gray-500 mt-1">今日访问</div>
									</div>
								</el-card>
								<el-card shadow="never" class="!bg-gray-50 dark:!bg-gray-800/50">
									<div class="text-center">
										<div class="text-3xl font-bold text-green-500">{{ analyticsOverview.weekViews.toLocaleString() }}</div>
										<div class="text-sm text-gray-500 mt-1">本周访问</div>
									</div>
								</el-card>
								<el-card shadow="never" class="!bg-gray-50 dark:!bg-gray-800/50">
									<div class="text-center">
										<div class="text-3xl font-bold text-purple-500">{{ analyticsOverview.monthViews.toLocaleString() }}</div>
										<div class="text-sm text-gray-500 mt-1">本月访问</div>
									</div>
								</el-card>
							</div>

							<!-- 访问来源 -->
							<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
								<el-card shadow="never">
									<template #header>
										<div class="flex items-center gap-2">
											<font-awesome-icon :icon="faGlobe" class="text-blue-500" />
											<span>访问地区 Top 10</span>
										</div>
									</template>
									<div class="space-y-3">
										<div v-for="(item, index) in analyticsOverview.topCountries" :key="item.country" 
											class="flex items-center justify-between">
											<div class="flex items-center gap-2">
												<span class="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs flex items-center justify-center font-medium">
													{{ index + 1 }}
												</span>
												<span>{{ item.country || '未知' }}</span>
											</div>
											<span class="font-mono text-gray-500">{{ item.count.toLocaleString() }}</span>
										</div>
										<el-empty v-if="analyticsOverview.topCountries.length === 0" description="暂无数据" :image-size="60" />
									</div>
								</el-card>

								<el-card shadow="never">
									<template #header>
										<div class="flex items-center gap-2">
											<font-awesome-icon :icon="faLink" class="text-green-500" />
											<span>来源网站 Top 10</span>
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
										<el-empty v-if="analyticsOverview.topReferers.length === 0" description="暂无数据" :image-size="60" />
									</div>
								</el-card>
							</div>

							<!-- 热门图片 -->
							<el-card shadow="never">
								<template #header>
									<div class="flex items-center justify-between">
										<div class="flex items-center gap-2">
											<font-awesome-icon :icon="faEye" class="text-orange-500" />
											<span>热门图片 (近30天)</span>
										</div>
										<el-button size="small" @click="loadAnalytics" :loading="loading">刷新</el-button>
									</div>
								</template>
								<el-table :data="topImages" stripe size="small">
									<el-table-column label="图片" min-width="300">
										<template #default="{ row }">
											<div class="flex items-center gap-2">
												<span class="truncate">{{ row.original_name || row.key }}</span>
											</div>
										</template>
									</el-table-column>
									<el-table-column label="上传者" width="120" prop="user_login" />
									<el-table-column label="大小" width="100">
										<template #default="{ row }">
											{{ formatBytes(row.size) }}
										</template>
									</el-table-column>
									<el-table-column label="总访问" width="100">
										<template #default="{ row }">
											<span class="font-mono">{{ row.view_count.toLocaleString() }}</span>
										</template>
									</el-table-column>
									<el-table-column label="近期访问" width="100">
										<template #default="{ row }">
											<span class="font-mono text-orange-500">{{ row.recent_views.toLocaleString() }}</span>
										</template>
									</el-table-column>
								</el-table>
							</el-card>
						</div>
						<div v-else class="py-10">
							<el-empty description="加载中..." v-loading="loading" />
						</div>
					</el-tab-pane>

					<!-- 操作日志 -->
					<el-tab-pane name="logs">
						<template #label>
							<span class="flex items-center gap-2">
								<font-awesome-icon :icon="faClipboardList" />
								操作日志
							</span>
						</template>

						<div class="mb-4 flex items-center gap-4 flex-wrap">
							<el-select v-model="auditActionFilter" placeholder="操作类型" clearable class="!w-40" @change="loadAuditLogs(true)">
								<el-option label="上传" value="upload" />
								<el-option label="删除" value="delete" />
								<el-option label="重命名" value="rename" />
								<el-option label="分享" value="share" />
								<el-option label="授权" value="grant_permission" />
								<el-option label="撤销授权" value="revoke_permission" />
								<el-option label="登录" value="login" />
							</el-select>
							<el-input v-model="auditUserFilter" placeholder="用户名" clearable class="!w-40" @change="loadAuditLogs(true)">
								<template #prefix>
									<font-awesome-icon :icon="faSearch" class="text-gray-400" />
								</template>
							</el-input>
							<el-button @click="loadAuditLogs(true)" :loading="loading">搜索</el-button>
						</div>

						<el-table :data="auditLogs" v-loading="loading" stripe>
							<el-table-column label="时间" width="180">
								<template #default="{ row }">
									<span class="text-sm">{{ formatDate(row.created_at) }}</span>
								</template>
							</el-table-column>
							<el-table-column label="用户" width="140">
								<template #default="{ row }">
									<span class="font-medium">{{ row.user_login || '-' }}</span>
								</template>
							</el-table-column>
							<el-table-column label="操作" width="120">
								<template #default="{ row }">
									<el-tag :type="getActionType(row.action)" size="small">
										{{ getActionLabel(row.action) }}
									</el-tag>
								</template>
							</el-table-column>
							<el-table-column label="目标" min-width="200">
								<template #default="{ row }">
									<el-tooltip v-if="row.target_key" :content="row.target_key" placement="top">
										<span class="truncate block max-w-xs text-sm text-gray-600 dark:text-gray-400">
											{{ row.target_key }}
										</span>
									</el-tooltip>
									<span v-else class="text-gray-400">-</span>
								</template>
							</el-table-column>
							<el-table-column label="详情" min-width="200">
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

						<div v-if="auditLogsHasMore" class="mt-4 text-center">
							<el-button @click="loadAuditLogs(false)" :loading="loading">加载更多</el-button>
						</div>
					</el-tab-pane>
				</el-tabs>
			</el-card>
		</div>

		<!-- 配额设置对话框 -->
		<el-dialog v-model="quotaDialogVisible" title="设置存储配额" width="400px">
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
					<label class="block text-sm font-medium mb-2">存储配额 (MB)</label>
					<el-input v-model.number="quotaValue" type="number" :min="0">
						<template #append>MB</template>
					</el-input>
					<div class="text-xs text-gray-400 mt-1">
						当前使用: {{ formatBytes(quotaEditUser.storageUsed) }}
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
				<el-button @click="quotaDialogVisible = false">取消</el-button>
				<el-button type="primary" @click="saveQuota">保存</el-button>
			</template>
		</el-dialog>
	</div>
</template>
