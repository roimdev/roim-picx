<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElSelect, ElOption, ElInput, ElButton, ElTable, ElTableColumn, ElTag, ElTooltip } from 'element-plus'
import { faSearch } from '@fortawesome/free-solid-svg-icons'
import { requestAuditLogs } from '../../utils/request'
import type { AuditLog } from '../../utils/types'

const { t, tm, locale } = useI18n()

const loading = ref(false)
const auditLogs = ref<AuditLog[]>([])
const auditLogsHasMore = ref(false)
const auditOffset = ref(0)
const auditActionFilter = ref('')
const auditUserFilter = ref('')

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

defineExpose({
    loadAuditLogs,
    init: () => {
        if (auditLogs.value.length === 0) {
            loadAuditLogs(true)
        }
    }
})
</script>

<template>
    <div>
        <div class="mb-4 flex items-center gap-4 flex-wrap">
            <el-select v-model="auditActionFilter" :placeholder="$t('admin.actionType')" clearable class="!w-40"
                @change="loadAuditLogs(true)">
                <el-option v-for="(label, key) in tm('admin.actions_labels')" :key="key" :label="label" :value="key" />
            </el-select>
            <el-input v-model="auditUserFilter" :placeholder="$t('admin.username')" clearable class="!w-40"
                @change="loadAuditLogs(true)">
                <template #prefix>
                    <font-awesome-icon :icon="faSearch" class="text-gray-400" />
                </template>
            </el-input>
            <el-button @click="loadAuditLogs(true)" :loading="loading">{{ $t('admin.search') }}</el-button>
        </div>

        <div class="relative w-full overflow-x-auto pb-4" style="max-width: calc(100vw - 4rem);">
            <el-table :data="auditLogs" v-loading="loading" stripe table-layout="fixed"
                style="width: 100%; min-width: 1100px;">
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
    </div>
</template>
