<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElCard, ElEmpty, ElTable, ElTableColumn, ElTooltip } from 'element-plus'
import {
    faGlobe, faLink, faEye
} from '@fortawesome/free-solid-svg-icons'
import BaseButton from '../common/BaseButton.vue'
import {
    requestAnalyticsOverview, requestAnalyticsTrend, requestTopImages
} from '../../utils/request'
import type { AnalyticsOverview, DailyTrend, TopImage } from '../../utils/types'
import formatBytes from '../../utils/format-bytes'

const { t } = useI18n()

const loading = ref(false)
const analyticsOverview = ref<AnalyticsOverview | null>(null)
const analyticsTrend = ref<DailyTrend[]>([])
const topImages = ref<TopImage[]>([])

const loadAnalytics = async () => {
    loading.value = true
    try {
        const [overview, trend, top] = await Promise.all([
            requestAnalyticsOverview(),
            requestAnalyticsTrend(),
            requestTopImages(10, 30)
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

defineExpose({
    loadAnalytics,
    init: () => {
        if (!analyticsOverview.value) {
            loadAnalytics()
        }
    }
})
</script>

<template>
    <div>
        <div v-if="analyticsOverview" class="space-y-6">
            <!-- 访问统计 -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <el-card shadow="never" class="!bg-gray-50 dark:!bg-gray-800/50">
                    <div class="text-center">
                        <div class="text-3xl font-bold text-blue-500">{{ analyticsOverview.todayViews.toLocaleString()
                        }}</div>
                        <div class="text-sm text-gray-500 mt-1">{{ $t('admin.todayViews') }}</div>
                    </div>
                </el-card>
                <el-card shadow="never" class="!bg-gray-50 dark:!bg-gray-800/50">
                    <div class="text-center">
                        <div class="text-3xl font-bold text-green-500">{{ analyticsOverview.weekViews.toLocaleString()
                        }}</div>
                        <div class="text-sm text-gray-500 mt-1">{{ $t('admin.weekViews') }}</div>
                    </div>
                </el-card>
                <el-card shadow="never" class="!bg-gray-50 dark:!bg-gray-800/50">
                    <div class="text-center">
                        <div class="text-3xl font-bold text-purple-500">{{ analyticsOverview.monthViews.toLocaleString()
                        }}</div>
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
                                <span
                                    class="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs flex items-center justify-center font-medium">
                                    {{ index + 1 }}
                                </span>
                                <span>{{ item.country || $t('common.unknown') }}</span>
                            </div>
                            <span class="font-mono text-gray-500">{{ item.count.toLocaleString() }}</span>
                        </div>
                        <el-empty v-if="analyticsOverview.topCountries.length === 0" :description="$t('common.noData')"
                            :image-size="60" />
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
                                <span
                                    class="w-5 h-5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 text-xs flex items-center justify-center font-medium shrink-0">
                                    {{ index + 1 }}
                                </span>
                                <el-tooltip :content="item.referer" placement="top">
                                    <span class="truncate text-sm">{{ item.referer }}</span>
                                </el-tooltip>
                            </div>
                            <span class="font-mono text-gray-500 shrink-0 ml-2">{{ item.count.toLocaleString() }}</span>
                        </div>
                        <el-empty v-if="analyticsOverview.topReferers.length === 0" :description="$t('common.noData')"
                            :image-size="60" />
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
                        <BaseButton size="sm" @click="loadAnalytics" :loading="loading">{{ $t('common.refresh')
                        }}</BaseButton>
                    </div>
                </template>
                <div class="relative w-full overflow-x-auto pb-4" style="max-width: calc(100vw - 4rem);">
                    <el-table :data="topImages" stripe size="small" table-layout="fixed"
                        style="width: 100%; min-width: 1100px;">
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
    </div>
</template>
