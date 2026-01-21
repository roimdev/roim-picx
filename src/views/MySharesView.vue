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
                class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2">
                <font-awesome-icon :icon="faSync" :class="{ 'animate-spin': loading }" />
                {{ $t('common.refresh') }}
            </button>
        </div>

        <!-- Share List -->
        <div v-if="shares.length > 0" class="space-y-4">
            <div v-for="share in shares" :key="share.id"
                class="p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow">
                <div class="flex gap-4">
                    <!-- Thumbnail -->
                    <div class="flex-shrink-0 w-24 h-24 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700">
                        <img :src="share.imageUrl" :alt="share.imageKey" class="w-full h-full object-cover" />
                    </div>

                    <!-- Info -->
                    <div class="flex-1 min-w-0">
                        <div class="flex items-start justify-between gap-2">
                            <div class="min-w-0">
                                <p class="font-medium text-gray-900 dark:text-gray-100 truncate">{{ share.imageKey }}</p>
                                <div class="flex items-center gap-2 mt-1 flex-wrap">
                                    <span v-if="share.hasPassword"
                                        class="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs rounded-full">
                                        <font-awesome-icon :icon="faLock" class="text-[10px]" />
                                        {{ $t('myShares.hasPassword') }}
                                    </span>
                                    <span v-if="share.isExpired"
                                        class="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-xs rounded-full">
                                        {{ $t('myShares.expired') }}
                                    </span>
                                    <span v-else-if="share.isMaxedOut"
                                        class="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 text-xs rounded-full">
                                        {{ $t('myShares.maxedOut') }}
                                    </span>
                                    <span v-else
                                        class="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs rounded-full">
                                        {{ $t('myShares.active') }}
                                    </span>
                                </div>
                            </div>
                            <div class="flex items-center gap-2 flex-shrink-0">
                                <button @click="copyShareLink(share)"
                                    class="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
                                    :title="$t('myShares.copyLink')">
                                    <font-awesome-icon :icon="faCopy" />
                                </button>
                                <button @click="deleteShare(share)"
                                    class="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                    :title="$t('common.delete')">
                                    <font-awesome-icon :icon="faTrash" />
                                </button>
                            </div>
                        </div>

                        <div class="mt-2 text-xs text-gray-500 dark:text-gray-400 flex items-center gap-4 flex-wrap">
                            <span class="flex items-center gap-1">
                                <font-awesome-icon :icon="faEye" />
                                {{ share.views }}{{ share.maxViews ? `/${share.maxViews}` : '' }} {{ $t('myShares.views') }}
                            </span>
                            <span class="flex items-center gap-1">
                                <font-awesome-icon :icon="faClock" />
                                {{ formatDate(share.createdAt) }}
                            </span>
                            <span v-if="share.expireAt" class="flex items-center gap-1">
                                <font-awesome-icon :icon="faCalendarTimes" />
                                {{ $t('myShares.expiresAt') }} {{ formatDate(share.expireAt) }}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Empty State -->
        <div v-else-if="!loading"
            class="text-center py-16 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700">
            <font-awesome-icon :icon="faShareAlt" class="text-5xl text-gray-300 dark:text-gray-600 mb-4" />
            <p class="text-gray-500 dark:text-gray-400">{{ $t('myShares.empty') }}</p>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElMessage, ElMessageBox } from 'element-plus'
import { requestMyShares, requestDeleteShare, type MyShare } from '../utils/request'
import LoadingOverlay from '../components/LoadingOverlay.vue'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { faSync, faLock, faCopy, faTrash, faEye, faClock, faCalendarTimes, faShareAlt } from '@fortawesome/free-solid-svg-icons'

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
    return new Date(timestamp).toLocaleString()
}

const copyShareLink = async (share: MyShare) => {
    try {
        await navigator.clipboard.writeText(share.url)
        ElMessage.success(t('myShares.linkCopied'))
    } catch (e) {
        ElMessage.error(t('myShares.copyFailed'))
    }
}

const deleteShare = async (share: MyShare) => {
    try {
        await ElMessageBox.confirm(
            t('myShares.deleteConfirmMsg'),
            t('myShares.deleteConfirmTitle'),
            {
                confirmButtonText: t('common.confirm'),
                cancelButtonText: t('common.cancel'),
                type: 'warning'
            }
        )
        await requestDeleteShare(share.id)
        shares.value = shares.value.filter(s => s.id !== share.id)
        ElMessage.success(t('myShares.deleted'))
    } catch (e) {
        // User cancelled or error
    }
}

onMounted(() => {
    fetchMyShares()
})
</script>
