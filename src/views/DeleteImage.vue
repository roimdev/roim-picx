<template>
    <div class="mx-auto max-w-4xl my-8 px-4 sm:px-6 relative min-h-[70vh]">
        <loading-overlay :loading="loading" />

        <!-- Header with gradient accent -->
        <div class="text-center mb-10">
            <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-red-500 to-rose-600 text-white shadow-lg shadow-red-500/30 mb-4">
                <font-awesome-icon :icon="faTrashAlt" class="text-2xl" />
            </div>
            <h1 class="text-3xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 dark:from-gray-100 dark:via-gray-200 dark:to-gray-100 bg-clip-text text-transparent">
                {{ $t('deleteImage.title') }}
            </h1>
            <p class="mt-2 text-gray-500 dark:text-gray-400 max-w-md mx-auto">
                {{ $t('deleteImage.confirmMessage') }}
            </p>
        </div>

        <!-- Main Card with glassmorphism -->
        <div class="relative">
            <!-- Decorative background blobs -->
            <div class="absolute -top-20 -left-20 w-40 h-40 bg-red-200 dark:bg-red-900/20 rounded-full blur-3xl opacity-50"></div>
            <div class="absolute -bottom-20 -right-20 w-40 h-40 bg-rose-200 dark:bg-rose-900/20 rounded-full blur-3xl opacity-50"></div>
            
            <div class="relative backdrop-blur-xl bg-white/80 dark:bg-gray-800/80 rounded-3xl shadow-2xl shadow-gray-200/50 dark:shadow-none border border-white/50 dark:border-gray-700/50 overflow-hidden">
                
                <!-- Error State -->
                <div v-if="error" class="text-center py-16 px-8">
                    <div class="relative inline-block mb-6">
                        <div class="absolute inset-0 bg-red-500/20 rounded-full blur-xl animate-pulse"></div>
                        <div class="relative w-24 h-24 rounded-full bg-gradient-to-br from-red-100 to-red-50 dark:from-red-900/30 dark:to-red-800/20 flex items-center justify-center">
                            <font-awesome-icon :icon="faExclamationTriangle" class="text-4xl text-red-500 dark:text-red-400" />
                        </div>
                    </div>
                    <h2 class="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-3">{{ $t('deleteImage.invalidLinkTitle') }}</h2>
                    <p class="text-gray-500 dark:text-gray-400 mb-8 max-w-sm mx-auto">{{ error }}</p>
                    <button @click="goHome"
                        class="inline-flex items-center gap-2 px-8 py-3.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-semibold transition-all duration-300 hover:shadow-lg">
                        <font-awesome-icon :icon="faHome" />
                        {{ $t('deleteImage.goHome') }}
                    </button>
                </div>

                <!-- Success State -->
                <div v-else-if="deleted" class="text-center py-16 px-8">
                    <div class="relative inline-block mb-6">
                        <div class="absolute inset-0 bg-emerald-500/20 rounded-full blur-xl animate-pulse"></div>
                        <div class="relative w-24 h-24 rounded-full bg-gradient-to-br from-emerald-100 to-emerald-50 dark:from-emerald-900/30 dark:to-emerald-800/20 flex items-center justify-center animate-bounce-gentle">
                            <font-awesome-icon :icon="faCheckCircle" class="text-5xl text-emerald-500 dark:text-emerald-400" />
                        </div>
                    </div>
                    <h2 class="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-3">{{ $t('deleteImage.successTitle') }}</h2>
                    <p class="text-gray-500 dark:text-gray-400 mb-8">{{ $t('deleteImage.successMessage') }}</p>
                    <button @click="goHome"
                        class="inline-flex items-center gap-2 px-8 py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-500/30 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
                        <font-awesome-icon :icon="faHome" />
                        {{ $t('deleteImage.goHome') }}
                    </button>
                </div>

                <!-- Confirmation State -->
                <div v-else-if="imageInfo" class="p-8">
                    <!-- Warning Banner -->
                    <div class="mb-8 p-4 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-2xl border border-amber-200/50 dark:border-amber-700/30">
                        <div class="flex items-start gap-3">
                            <div class="flex-shrink-0 w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-800/30 flex items-center justify-center">
                                <font-awesome-icon :icon="faExclamationTriangle" class="text-amber-600 dark:text-amber-400" />
                            </div>
                            <div>
                                <h3 class="font-bold text-amber-800 dark:text-amber-300">{{ $t('deleteImage.warningTitle') }}</h3>
                                <p class="text-sm text-amber-700/80 dark:text-amber-400/80 mt-0.5">{{ $t('deleteImage.warningMessage') }}</p>
                            </div>
                        </div>
                    </div>

                    <div class="grid grid-cols-1 lg:grid-cols-5 gap-8">
                        <!-- Image Preview -->
                        <div class="lg:col-span-3">
                            <div class="relative group rounded-2xl overflow-hidden bg-gradient-to-br from-gray-100 to-gray-50 dark:from-gray-900 dark:to-gray-800 border border-gray-200/50 dark:border-gray-700/50 shadow-inner">
                                <div class="aspect-video">
                                    <el-image :src="imageInfo.url" fit="contain"
                                        class="w-full h-full transition-transform duration-500 group-hover:scale-[1.02]"
                                        referrer-policy="no-referrer"
                                        :preview-src-list="[imageInfo.url]"
                                        :preview-teleported="true"
                                        :z-index="9999">
                                        <template #placeholder>
                                            <div class="flex items-center justify-center h-full">
                                                <div class="w-12 h-12 rounded-full border-4 border-gray-200 border-t-indigo-500 animate-spin"></div>
                                            </div>
                                        </template>
                                        <template #error>
                                            <div class="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-500">
                                                <font-awesome-icon :icon="faImage" class="text-4xl mb-2 opacity-30" />
                                                <span class="text-sm">{{ $t('deleteImage.previewFailed') }}</span>
                                            </div>
                                        </template>
                                    </el-image>
                                </div>
                                <!-- Hover overlay -->
                                <div class="absolute inset-0 bg-black/0 group-hover:bg-black/5 dark:group-hover:bg-white/5 transition-colors pointer-events-none"></div>
                            </div>
                        </div>

                        <!-- File Info & Actions -->
                        <div class="lg:col-span-2 flex flex-col">
                            <div class="flex-1 space-y-6">
                                <!-- File Name -->
                                <div class="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-700/50">
                                    <div class="flex items-center gap-2 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">
                                        <font-awesome-icon :icon="faFile" />
                                        {{ $t('deleteImage.fileName') }}
                                    </div>
                                    <p class="text-base font-bold text-gray-900 dark:text-gray-100 break-all leading-relaxed">{{ imageInfo.key }}</p>
                                </div>
                                
                                <!-- File Size -->
                                <div class="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-700/50">
                                    <div class="flex items-center gap-2 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">
                                        <font-awesome-icon :icon="faDatabase" />
                                        {{ $t('deleteImage.fileSize') }}
                                    </div>
                                    <span class="inline-flex items-center px-3 py-1.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-lg text-sm font-mono font-bold">
                                        {{ formatBytes(imageInfo.size) }}
                                    </span>
                                </div>
                            </div>
                        
                            <!-- Action Buttons -->
                            <div class="flex flex-col gap-3 mt-8 pt-6 border-t border-gray-100 dark:border-gray-700/50">
                                <button @click="confirmDelete" :disabled="deleting"
                                    class="w-full relative overflow-hidden group/btn flex justify-center items-center gap-2 py-4 px-6 rounded-xl text-base font-bold text-white bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 shadow-lg shadow-red-500/30 transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed hover:-translate-y-0.5 hover:shadow-xl active:translate-y-0">
                                    <span v-if="deleting" class="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                    <font-awesome-icon v-else :icon="faTrashAlt" />
                                    <span>{{ deleting ? $t('deleteImage.deleting') : $t('deleteImage.confirmDelete') }}</span>
                                </button>
                                <button @click="goHome" :disabled="deleting"
                                    class="w-full flex justify-center items-center gap-2 py-3.5 px-6 border-2 border-gray-200 dark:border-gray-700 rounded-xl text-base font-semibold text-gray-600 dark:text-gray-400 bg-transparent hover:bg-gray-100 dark:hover:bg-gray-700/50 hover:border-gray-300 dark:hover:border-gray-600 transition-all duration-200">
                                    {{ $t('deleteImage.cancel') }}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Footer hint -->
        <div class="mt-8 text-center">
            <p class="text-xs text-gray-400 dark:text-gray-600 font-medium tracking-widest uppercase">Secure Delete Action</p>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { requestDelInfo, requestPublicDeleteImage } from '../utils/request'
import formatBytes from '../utils/format-bytes'
import { faExclamationTriangle, faCheckCircle, faTrashAlt, faImage, faHome, faFile, faDatabase } from '@fortawesome/free-solid-svg-icons'
import LoadingOverlay from '../components/LoadingOverlay.vue'
import type { ImgItem } from '../utils/types'
import { ElImage } from 'element-plus'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const token = route.params.token as string

const loading = ref(true)
const deleting = ref(false)
const deleted = ref(false)
const error = ref('')
const imageInfo = ref<ImgItem | null>(null)

const fetchInfo = async () => {
    try {
        loading.value = true
        error.value = ''
        const data = await requestDelInfo(token)
        imageInfo.value = data
    } catch (err: any) {
        error.value = err.message || t('deleteImage.fetchInfoFailed')
    } finally {
        loading.value = false
    }
}

const confirmDelete = async () => {
    try {
        deleting.value = true
        await requestPublicDeleteImage(token)
        deleted.value = true
    } catch (err: any) {
        error.value = err.message || t('admin.deleteFailed')
    } finally {
        deleting.value = false
    }
}

const goHome = () => {
    router.push('/')
}

onMounted(() => {
    if (!token) {
        error.value = t('deleteImage.invalidToken')
        loading.value = false
        return
    }
    fetchInfo()
})
</script>

<style scoped>
@keyframes bounce-gentle {
    0%, 100% {
        transform: translateY(0);
    }
    50% {
        transform: translateY(-8px);
    }
}

.animate-bounce-gentle {
    animation: bounce-gentle 2s ease-in-out infinite;
}
</style>
