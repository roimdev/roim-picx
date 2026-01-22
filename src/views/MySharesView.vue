<template>
    <div class="mx-auto max-w-7xl my-8 px-4 sm:px-6 relative min-h-[60vh]">
        <loading-overlay :loading="loading" />

        <div class="flex items-center justify-between mb-8">
            <div>
                <h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100">{{ $t('myShares.title') }}</h1>
                <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    {{ $t('myShares.subtitle') }}
                </p>
            </div>
            <button @click="fetchMyShares"
                class="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium transition-colors shadow-sm flex items-center gap-2">
                <font-awesome-icon :icon="faSync" :class="{ 'animate-spin': loading }" />
                <span class="hidden sm:inline">{{ $t('common.refresh') }}</span>
            </button>
        </div>

        <!-- Share List Header -->
        <div v-if="shares.length > 0">
            <h3 class="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3 flex items-center justify-between">
                <span>{{ $t('myShares.shareList') }}</span>
                <span class="text-[10px] bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full text-gray-500 dark:text-gray-400">
                    {{ $t('manage.items', { count: shares.length }) }}
                </span>
            </h3>

            <!-- Share List - matching ImageListRow style -->
            <div class="flex flex-col gap-2">
                <div v-for="share in shares" :key="share.id"
                    class="group flex items-center gap-4 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700 hover:shadow-sm transition-all duration-200">
                    <!-- Thumbnail -->
                    <div class="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700">
                        <el-image class="w-full h-full object-cover" :src="share.imageUrl" fit="cover" lazy>
                            <template #placeholder>
                                <div class="w-full h-full flex items-center justify-center text-gray-300 dark:text-gray-600">
                                    <font-awesome-icon :icon="faImage" class="text-xl" />
                                </div>
                            </template>
                            <template #error>
                                <div class="w-full h-full flex items-center justify-center text-gray-300 dark:text-gray-600">
                                    <font-awesome-icon :icon="faImage" class="text-xl" />
                                </div>
                            </template>
                        </el-image>
                    </div>

                    <!-- Info -->
                    <div class="flex-1 min-w-0">
                        <h4 class="text-sm font-medium text-gray-900 dark:text-gray-100 truncate mb-1" :title="share.imageKey">
                            {{ share.imageKey }}
                        </h4>
                        <div class="flex items-center gap-2 flex-wrap mb-1">
                            <span v-if="share.hasPassword"
                                class="inline-flex items-center gap-1 px-1.5 py-0.5 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 text-[10px] rounded">
                                <font-awesome-icon :icon="faLock" class="text-[8px]" />
                                {{ $t('myShares.hasPassword') }}
                            </span>
                            <span v-if="share.isExpired"
                                class="inline-flex items-center px-1.5 py-0.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-[10px] rounded">
                                {{ $t('myShares.expired') }}
                            </span>
                            <span v-else-if="share.isMaxedOut"
                                class="inline-flex items-center px-1.5 py-0.5 bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 text-[10px] rounded">
                                {{ $t('myShares.maxedOut') }}
                            </span>
                            <span v-else
                                class="inline-flex items-center px-1.5 py-0.5 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 text-[10px] rounded">
                                {{ $t('myShares.active') }}
                            </span>
                        </div>
                        <div class="flex items-center gap-3 text-xs text-gray-400 dark:text-gray-500">
                            <span class="flex items-center gap-1">
                                <font-awesome-icon :icon="faEye" class="text-[10px]" />
                                {{ share.views }}{{ share.maxViews ? `/${share.maxViews}` : '' }}
                            </span>
                            <span>{{ formatDate(share.createdAt) }}</span>
                            <span v-if="share.expireAt" class="hidden sm:flex items-center gap-1 text-amber-500 dark:text-amber-400">
                                <font-awesome-icon :icon="faCalendarTimes" class="text-[10px]" />
                                {{ formatDate(share.expireAt) }}
                            </span>
                        </div>
                    </div>

                    <!-- Actions -->
                    <div class="flex items-center gap-2">
                        <el-tooltip :content="$t('myShares.copyLink')" placement="top" :show-after="500">
                            <button @click="copyShareLink(share)"
                                class="w-8 h-8 rounded-full text-gray-400 dark:text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors flex items-center justify-center">
                                <font-awesome-icon :icon="faLink" class="text-sm" />
                            </button>
                        </el-tooltip>

                        <el-tooltip :content="$t('myShares.openShare')" placement="top" :show-after="500">
                            <button @click="openShare(share)"
                                class="w-8 h-8 rounded-full text-gray-400 dark:text-gray-500 hover:text-green-600 dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30 transition-colors flex items-center justify-center">
                                <font-awesome-icon :icon="faExternalLinkAlt" class="text-sm" />
                            </button>
                        </el-tooltip>

                        <el-popconfirm :title="$t('myShares.deleteConfirmMsg')" :confirm-button-type="'danger'" 
                            :confirm-button-text="$t('common.delete')" :cancel-button-text="$t('common.cancel')"
                            width="200" @confirm="deleteShare(share)">
                            <template #reference>
                                <button
                                    class="w-8 h-8 rounded-full text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors flex items-center justify-center">
                                    <font-awesome-icon :icon="faTrash" class="text-sm" />
                                </button>
                            </template>
                        </el-popconfirm>
                    </div>
                </div>
            </div>
        </div>

        <!-- Empty State -->
        <div v-else-if="!loading" class="py-20 text-center">
            <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 mb-4">
                <font-awesome-icon :icon="faShareAlt" class="text-2xl text-gray-400 dark:text-gray-500" />
            </div>
            <h3 class="text-lg font-medium text-gray-900 dark:text-gray-100">{{ $t('myShares.empty') }}</h3>
            <p class="mt-1 text-gray-500 dark:text-gray-400">{{ $t('myShares.emptyHint') }}</p>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElMessage, ElTooltip, ElPopconfirm, ElImage } from 'element-plus'
import { requestMyShares, requestDeleteShare, type MyShare } from '../utils/request'
import LoadingOverlay from '../components/LoadingOverlay.vue'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { faSync, faLock, faLink, faTrash, faEye, faCalendarTimes, faShareAlt, faImage, faExternalLinkAlt } from '@fortawesome/free-solid-svg-icons'

const { t } = useI18n()

const loading = ref(false)
const shares = ref<MyShare[]>([])

const fetchMyShares = async () => {
    loading.value = true
    try {
        shares.value = await requestMyShares()
    } catch (e) {
        console.error('Failed to fetch shares:', e)
    } finally {
        loading.value = false
    }
}

const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString()
}

const copyShareLink = async (share: MyShare) => {
    try {
        await navigator.clipboard.writeText(share.url)
        ElMessage.success(t('myShares.linkCopied'))
    } catch (e) {
        ElMessage.error(t('myShares.copyFailed'))
    }
}

const openShare = (share: MyShare) => {
    window.open(share.url, '_blank')
}

const deleteShare = async (share: MyShare) => {
    try {
        await requestDeleteShare(share.id)
        shares.value = shares.value.filter(s => s.id !== share.id)
        ElMessage.success(t('myShares.deleted'))
    } catch (e) {
        // Error handled
    }
}

onMounted(() => {
    fetchMyShares()
})
</script>
