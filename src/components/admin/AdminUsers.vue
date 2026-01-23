<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElMessage, ElMessageBox, ElTable, ElTableColumn, ElButton, ElTag, ElSwitch, ElInput, ElDialog, ElAvatar, ElProgress, ElTooltip, ElPagination } from 'element-plus'
import {
    faUsers, faSync, faSearch, faUser, faUserShield, faHardDrive
} from '@fortawesome/free-solid-svg-icons'
import {
    requestAdminUsers, requestSetUserViewAll, requestSetUserRole, requestSetUserQuota
} from '../../utils/request'
import type { AdminUser } from '../../utils/types'
import formatBytes from '../../utils/format-bytes'

const { t, locale } = useI18n()

const loading = ref(false)
const users = ref<AdminUser[]>([])
const userSearch = ref('')
const currentPage = ref(1)
const pageSize = ref(10)
const total = ref(0) // 总用户数

const loadUsers = async () => {
    loading.value = true
    try {
        const res = await requestAdminUsers({
            page: currentPage.value,
            limit: pageSize.value,
            keyword: userSearch.value || undefined
        })
        users.value = res.list
        total.value = res.total
    } catch (e) {
        console.error('Failed to load users:', e)
    } finally {
        loading.value = false
    }
}

// 配额设置对话框
const quotaDialogVisible = ref(false)
const quotaEditUser = ref<AdminUser | null>(null)
const quotaValue = ref(0)

const handlePageChange = (page: number) => {
    currentPage.value = page
    loadUsers()
}

const handleSearch = () => {
    currentPage.value = 1
    loadUsers()
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

const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString(locale.value === 'zh-CN' ? 'zh-CN' : 'en-US')
}

const getStoragePercent = (user: AdminUser) => {
    if (!user.storageQuota || user.storageQuota === 0) return 0
    return Math.round((user.storageUsed / user.storageQuota) * 100)
}

// Expose methods for parent to call
defineExpose({
    loadUsers,
    init: () => {
        if (users.value.length === 0) {
            loadUsers()
        }
    }
})
</script>

<template>
    <div>
        <div class="mb-4 flex items-center gap-4">
            <el-input v-model="userSearch" :placeholder="$t('admin.searchUser')" clearable class="!w-64"
                @keyup.enter="handleSearch" @clear="handleSearch">
                <template #prefix>
                    <font-awesome-icon :icon="faSearch" class="text-gray-400" />
                </template>
            </el-input>
            <el-button @click="handleSearch" :loading="loading">
                <template #icon>
                    <font-awesome-icon :icon="faSync" />
                </template>
                {{ $t('common.refresh') }}
            </el-button>
        </div>

        <div class="relative w-full overflow-x-auto pb-4" style="max-width: calc(100vw - 4rem);">
            <el-table :data="users" v-loading="loading" stripe table-layout="fixed"
                style="width: 100%; min-width: 1100px;">
                <el-table-column :label="$t('admin.user')" min-width="200">
                    <template #default="{ row }">
                        <div class="flex items-center gap-3">
                            <el-avatar :size="36" :src="row.avatarUrl">
                                {{ row.login.charAt(0).toUpperCase() }}
                            </el-avatar>
                            <div>
                                <div class="font-medium text-gray-800 dark:text-gray-200">{{ row.name || row.login }}
                                </div>
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
                        <el-switch v-model="row.canViewAll" @change="toggleViewAll(row)"
                            :disabled="row.role === 'admin'" />
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
                            <el-progress :percentage="row.storageQuota === 0 ? 0 : getStoragePercent(row)"
                                :stroke-width="6"
                                :color="row.storageQuota === 0 ? '#67c23a' : (getStoragePercent(row) > 90 ? '#f56c6c' : getStoragePercent(row) > 70 ? '#e6a23c' : '#67c23a')" />
                            <div class="text-xs text-gray-400">
                                {{ formatBytes(row.storageUsed) }} / {{ row.storageQuota === 0 ? $t('admin.unlimited') :
                                    formatBytes(row.storageQuota) }}
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
                            <el-tooltip
                                :content="row.role === 'admin' ? $t('admin.demoteUser') : $t('admin.promoteAdmin')"
                                placement="top">
                                <el-button size="small" :type="row.role === 'admin' ? 'warning' : 'success'"
                                    @click="toggleRole(row)" circle>
                                    <font-awesome-icon :icon="row.role === 'admin' ? faUser : faUserShield" />
                                </el-button>
                            </el-tooltip>
                            <el-tooltip :content="$t('admin.quota')" placement="top">
                                <el-button size="small" type="primary" @click="openQuotaDialog(row)" circle>
                                    <font-awesome-icon :icon="faHardDrive" />
                                </el-button>
                            </el-tooltip>
                        </div>
                    </template>
                </el-table-column>
            </el-table>
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
                        {{ $t('admin.quotaHint') }}
                    </div>
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
