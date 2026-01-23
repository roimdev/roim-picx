<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ElMessage, ElImage, ElEmpty, ElCard, ElImageViewer } from 'element-plus'
import { faLock, faUnlock, faThLarge, faImage as faImageIcon, faExclamationCircle, faExclamationTriangle } from '@fortawesome/free-solid-svg-icons'
import { requestGetAlbumShareInfo, requestVerifyAlbumShare } from '../../utils/request'
import type { AlbumShareInfo, AlbumImage } from '../../utils/types'
import formatBytes from '../../utils/format-bytes'
import BaseButton from '../common/BaseButton.vue'
import BaseInput from '../common/BaseInput.vue'

const route = useRoute()
const { t } = useI18n()

const token = route.params.token as string
const loading = ref(false)
const shareInfo = ref<AlbumShareInfo | null>(null)
const images = ref<AlbumImage[]>([])
const verified = ref(false)
const password = ref('')
const passwordError = ref('')

const errorTitle = ref('')
const errorMsg = ref('')

// Preview
const previewVisible = ref(false)
const previewIndex = ref(0)
const previewUrls = ref<string[]>([])

// View mode: 'grid' or 'large'
const viewMode = ref<'grid' | 'large'>('grid')

const loadInfo = async () => {
    loading.value = true
    try {
        const res = await requestGetAlbumShareInfo(token)
        shareInfo.value = res
        if (!res.hasPassword) {
            verifyAndLoad()
        }
    } catch (e: any) {
        errorTitle.value = t('share.invalidLinkTitle')
        errorMsg.value = e || t('share.invalidLinkMessage')
    } finally {
        loading.value = false
    }
}

const verifyAndLoad = async () => {
    loading.value = true
    try {
        const res = await requestVerifyAlbumShare(token, password.value)
        images.value = res.images
        previewUrls.value = res.images.map(i => i.image_url)
        verified.value = true
    } catch (e: any) {
        passwordError.value = e
    } finally {
        loading.value = false
    }
}

const showPreview = (index: number) => {
    previewIndex.value = index
    previewVisible.value = true
}

const closePreview = () => {
    previewVisible.value = false
}

onMounted(() => {
    loadInfo()
})
</script>

<template>
    <div class="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
        <!-- Minimal Header -->
        <div class="h-16 bg-white dark:bg-gray-800 shadow-sm flex items-center justify-center px-4">
            <div class="flex items-center gap-2 font-bold text-xl">
                <img src="../../assets/picx-logo.png" class="w-8 h-8" />
                <span>PICX Album</span>
            </div>
        </div>

        <div class="max-w-7xl mx-auto p-4 md:p-8">
            <!-- Error State -->
            <div v-if="errorTitle" class="flex flex-col items-center justify-center py-20">
                <div
                    class="w-20 h-20 mx-auto mb-6 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
                    <font-awesome-icon :icon="faExclamationTriangle" class="text-3xl text-red-500" />
                </div>
                <h2 class="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">{{ errorTitle }}</h2>
                <p class="text-gray-500">{{ errorMsg }}</p>
            </div>

            <!-- Lock Screen -->
            <div v-else-if="!verified && shareInfo" class="max-w-lg mx-auto mt-20">
                <div class="bg-white dark:bg-gray-800 rounded-3xl shadow-xl p-8">
                    <div class="text-center mb-8">
                        <div v-if="shareInfo.coverImage"
                            class="w-20 h-20 mx-auto rounded-full overflow-hidden mb-4 shadow-md">
                            <img :src="shareInfo.coverImage" class="w-full h-full object-cover" />
                        </div>
                        <div v-else
                            class="w-16 h-16 mx-auto mb-4 rounded-2xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                            <font-awesome-icon :icon="faLock" class="text-2xl text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <h2 class="text-xl font-bold text-gray-900 dark:text-gray-100 mb-1">{{ shareInfo.albumName }}
                        </h2>
                        <p class="text-sm text-gray-500 dark:text-gray-400">{{ shareInfo.ownerName }}</p>
                        <p class="text-sm text-gray-500 dark:text-gray-400 mt-2">{{ $t('share.passwordHint') }}</p>
                    </div>

                    <div class="space-y-6">
                        <div class="flex flex-col justify-center">
                            <BaseInput v-model="password" type="password" :placeholder="$t('share.enterPassword')"
                                @keyup.enter="verifyAndLoad" class="w-full !text-center !text-lg !tracking-widest"
                                @input="passwordError = ''" />
                            <div v-if="passwordError"
                                class="mt-4 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm flex items-center justify-center gap-2 animate-pulse">
                                <font-awesome-icon :icon="faExclamationCircle" />
                                <span>{{ passwordError }}</span>
                            </div>
                        </div>
                        <BaseButton type="indigo" @click="verifyAndLoad" :loading="loading" block :disabled="!password"
                            class="!py-4 !font-bold">
                            <font-awesome-icon v-if="!loading" :icon="faUnlock" class="mr-2" />
                            {{ $t('share.verify') }}
                        </BaseButton>
                    </div>
                </div>
            </div>

            <!-- Album Content -->
            <div v-else-if="verified && shareInfo">
                <!-- Album Info -->
                <div class="mb-8">
                    <div class="flex items-start justify-between gap-4 mb-4">
                        <div class="flex-1">
                            <h1 class="text-3xl font-bold mb-2">{{ shareInfo.albumName }}</h1>
                            <p class="text-gray-500 max-w-2xl">{{ shareInfo.description }}</p>
                            <div class="flex items-center gap-4 mt-4 text-sm text-gray-400">
                                <span>{{ images.length }} {{ $t('album.items') }}</span>
                            </div>
                        </div>
                        <!-- View Mode Toggle -->
                        <div class="flex gap-2 flex-shrink-0">
                            <button @click="viewMode = 'grid'" :class="[
                                'p-2 rounded-lg transition-all',
                                viewMode === 'grid'
                                    ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                            ]">
                                <font-awesome-icon :icon="faThLarge" class="text-lg" />
                            </button>
                            <button @click="viewMode = 'large'" :class="[
                                'p-2 rounded-lg transition-all',
                                viewMode === 'large'
                                    ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                            ]">
                                <font-awesome-icon :icon="faImageIcon" class="text-lg" />
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Grid View -->
                <div v-if="viewMode === 'grid'"
                    class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    <div v-for="(img, index) in images" :key="img.image_key"
                        class="aspect-square relative rounded-lg overflow-hidden group cursor-pointer bg-gray-100 dark:bg-gray-800"
                        @click="showPreview(index)">
                        <el-image :src="img.image_url" fit="cover"
                            class="w-full h-full transition-transform duration-500 group-hover:scale-110"
                            loading="lazy" />
                    </div>
                </div>

                <!-- Large View -->
                <div v-else class="space-y-6">
                    <div v-for="(img, index) in images" :key="img.image_key"
                        class="relative rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 cursor-pointer group"
                        @click="showPreview(index)">
                        <el-image :src="img.image_url" fit="contain"
                            class="w-full max-h-[80vh] transition-transform duration-300 group-hover:scale-105"
                            loading="lazy" />
                        <div
                            class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                            <p class="text-white text-sm truncate">{{ img.image_key }}</p>
                        </div>
                    </div>
                </div>

                <el-image-viewer v-if="previewVisible" :url-list="previewUrls" :initial-index="previewIndex"
                    @close="closePreview" />
            </div>

            <loading-overlay v-if="loading && !verified" :loading="loading" />
        </div>
    </div>
</template>
