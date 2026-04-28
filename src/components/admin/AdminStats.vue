<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElCard } from 'element-plus'
import {
    faUsers, faHardDrive, faImage, faCalendarAlt
} from '@fortawesome/free-solid-svg-icons'
import type { SystemStats } from '../../utils/types'
import formatBytes from '../../utils/format-bytes'

const { t } = useI18n()

const props = defineProps<{
    stats: SystemStats | null
}>()
</script>

<template>
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <el-card shadow="hover"
            class="!border-0 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20">
            <div class="flex items-center gap-4">
                <div class="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
                    <font-awesome-icon :icon="faUsers" class="text-xl text-blue-500" />
                </div>
                <div>
                    <div class="text-2xl font-bold text-gray-800 dark:text-gray-100">{{ stats?.userCount || 0 }}</div>
                    <div class="text-sm text-gray-500 dark:text-gray-400">{{ $t('admin.totalUsers') }}</div>
                </div>
            </div>
        </el-card>
        <el-card shadow="hover"
            class="!border-0 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20">
            <div class="flex items-center gap-4">
                <div class="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center">
                    <font-awesome-icon :icon="faImage" class="text-xl text-green-500" />
                </div>
                <div>
                    <div class="text-2xl font-bold text-gray-800 dark:text-gray-100">{{ stats?.imageCount || 0 }}</div>
                    <div class="text-sm text-gray-500 dark:text-gray-400">{{ $t('admin.totalImages') }}</div>
                </div>
            </div>
        </el-card>
        <el-card shadow="hover"
            class="!border-0 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20">
            <div class="flex items-center gap-4">
                <div class="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center">
                    <font-awesome-icon :icon="faHardDrive" class="text-xl text-purple-500" />
                </div>
                <div>
                    <div class="text-2xl font-bold text-gray-800 dark:text-gray-100">{{ formatBytes(stats?.totalSize ||
                        0) }}</div>
                    <div class="text-sm text-gray-500 dark:text-gray-400">{{ $t('admin.storageUsed') }}</div>
                </div>
            </div>
        </el-card>
        <el-card shadow="hover"
            class="!border-0 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20">
            <div class="flex items-center gap-4">
                <div class="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center">
                    <font-awesome-icon :icon="faCalendarAlt" class="text-xl text-orange-500" />
                </div>
                <div>
                    <div class="text-2xl font-bold text-gray-800 dark:text-gray-100">{{ stats?.recentUploads || 0 }}
                    </div>
                    <div class="text-sm text-gray-500 dark:text-gray-400">{{ $t('admin.weekUploads') }}</div>
                </div>
            </div>
        </el-card>
    </div>
</template>
