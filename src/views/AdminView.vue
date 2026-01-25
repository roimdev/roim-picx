<script setup lang="ts">
import { ref, onMounted, computed, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElEmpty, ElCard, ElTabs, ElTabPane } from 'element-plus'
import {
	faUsers, faChartLine, faClipboardList,
	faShieldAlt, faCog
} from '@fortawesome/free-solid-svg-icons'
import {
	requestAdminStats,
	requestCurrentUser
} from '../utils/request'
import type { SystemStats, CurrentUserInfo } from '../utils/types'
import formatBytes from '../utils/format-bytes'

import AdminStats from '../components/admin/AdminStats.vue'
import AdminUsers from '../components/admin/AdminUsers.vue'
import AdminAnalytics from '../components/admin/AdminAnalytics.vue'
import AdminLogs from '../components/admin/AdminLogs.vue'
import AdminSettings from '../components/admin/AdminSettings.vue'

const { t } = useI18n()

const activeTab = ref('users')

// Component refs
const usersRef = ref<InstanceType<typeof AdminUsers> | null>(null)
const analyticsRef = ref<InstanceType<typeof AdminAnalytics> | null>(null)
const logsRef = ref<InstanceType<typeof AdminLogs> | null>(null)
const settingsRef = ref<InstanceType<typeof AdminSettings> | null>(null)

// 当前用户信息
const currentUserInfo = ref<CurrentUserInfo | null>(null)
const isAdmin = computed(() => currentUserInfo.value?.role === 'admin' || currentUserInfo.value?.isAdmin)

// 系统统计
const systemStats = ref<SystemStats | null>(null)

const loadCurrentUser = async () => {
	try {
		currentUserInfo.value = await requestCurrentUser()
	} catch (e) {
		console.error('Failed to load current user:', e)
	}
}

const loadSystemStats = async () => {
	try {
		systemStats.value = await requestAdminStats()
	} catch (e) {
		console.error('Failed to load system stats:', e)
	}
}

const handleTabChange = async (tab: string | number) => {
	// Wait for DOM update so ref is available if it was v-if'ed (though we use el-tabs)
	await nextTick()

	const tabStr = String(tab)
	if (tabStr === 'users') {
		usersRef.value?.init()
	} else if (tabStr === 'analytics') {
		analyticsRef.value?.init()
	} else if (tabStr === 'logs') {
		logsRef.value?.init()
	} else if (tabStr === 'settings') {
		settingsRef.value?.init()
	}
}

onMounted(async () => {
	await loadCurrentUser()
	if (isAdmin.value) {
		loadSystemStats()
		// Initialize the default tab
		handleTabChange(activeTab.value)
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
			<AdminStats :stats="systemStats" />

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
						<AdminUsers ref="usersRef" />
					</el-tab-pane>

					<!-- 访问分析 -->
					<el-tab-pane name="analytics">
						<template #label>
							<span class="flex items-center gap-2">
								<font-awesome-icon :icon="faChartLine" />
								{{ $t('admin.analytics') }}
							</span>
						</template>
						<AdminAnalytics ref="analyticsRef" />
					</el-tab-pane>

					<!-- 操作日志 -->
					<el-tab-pane name="logs">
						<template #label>
							<span class="flex items-center gap-2">
								<font-awesome-icon :icon="faClipboardList" />
								{{ $t('admin.logs') }}
							</span>
						</template>
						<AdminLogs ref="logsRef" />
					</el-tab-pane>

					<!-- 系统设置 -->
					<el-tab-pane name="settings">
						<template #label>
							<span class="flex items-center gap-2">
								<font-awesome-icon :icon="faCog" />
								{{ $t('admin.settings') }}
							</span>
						</template>
						<AdminSettings ref="settingsRef" />
					</el-tab-pane>
				</el-tabs>
			</el-card>
		</div>
	</div>
</template>
