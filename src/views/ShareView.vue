<template>
    <div
        class="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 flex items-center justify-center p-4">
        <div class="w-full max-w-lg">
            <!-- Loading State -->
            <div v-if="loading" class="text-center py-20">
                <font-awesome-icon :icon="faSpinner" spin class="text-4xl text-indigo-500 mb-4" />
                <p class="text-gray-500 dark:text-gray-400">{{ $t('share.loading') }}</p>
            </div>

            <!-- Error State -->
            <div v-else-if="error" class="text-center py-20">
                <div
                    class="w-20 h-20 mx-auto mb-6 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
                    <font-awesome-icon :icon="faExclamationTriangle" class="text-3xl text-red-500" />
                </div>
                <h2 class="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">{{ errorTitle }}</h2>
                <p class="text-gray-500 dark:text-gray-400">{{ errorMessage }}</p>
            </div>

            <!-- Password Form -->
            <div v-else-if="needPassword && !imageUrl" class="bg-white dark:bg-gray-800 rounded-3xl shadow-xl p-8">
                <div class="text-center mb-8">
                    <div
                        class="w-16 h-16 mx-auto mb-4 rounded-2xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                        <font-awesome-icon :icon="faLock" class="text-2xl text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <h2 class="text-xl font-bold text-gray-900 dark:text-gray-100">{{ $t('share.needPassword') }}</h2>
                    <p class="text-sm text-gray-500 dark:text-gray-400 mt-2">{{ $t('share.passwordHint') }}</p>
                </div>

                <form @submit.prevent="verifyPassword" class="space-y-6">
                    <div class="flex justify-center">
                        <BaseInput v-model="password" type="password" :placeholder="$t('share.passwordPlaceholder')"
                            autofocus class="w-full !text-center !text-lg !tracking-widest" />
                    </div>
                    <BaseButton type="indigo" block @click="verifyPassword" :loading="verifying" :disabled="!password"
                        class="!py-4 !font-bold">
                        <font-awesome-icon v-if="!verifying" :icon="faUnlock" class="mr-2" />
                        {{ $t('share.verifyPassword') }}
                    </BaseButton>
                </form>
            </div>

            <!-- Image Display -->
            <div v-else-if="imageUrl" class="bg-white dark:bg-gray-800 rounded-3xl shadow-xl overflow-hidden">
                <div class="relative">
                    <img :src="imageUrl" class="w-full max-h-[70vh] object-contain bg-gray-100 dark:bg-gray-900"
                        @click="showPreview = true" />
                </div>

                <div class="p-6 space-y-4">
                    <!-- Stats -->
                    <div class="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                        <span>
                            <font-awesome-icon :icon="faEye" class="mr-2" />
                            {{ $t('share.viewCount', { count: shareResult?.views || 0 }) }}
                            <span v-if="shareResult?.maxViews">{{ $t('share.viewLimit', { max: shareResult.maxViews })
                            }}</span>
                        </span>
                    </div>

                    <!-- Download Button -->
                    <BaseButton type="indigo" block @click="handleDownload" class="!py-3 !font-bold">
                        <font-awesome-icon :icon="faDownload" class="mr-2" />
                        {{ $t('share.downloadImage') }}
                    </BaseButton>
                </div>
            </div>

            <!-- Footer -->
            <div class="text-center mt-8 text-sm text-gray-400 dark:text-gray-500">
                Powered by <a href="https://github.com/roimdev"
                    class="text-indigo-500 hover:text-indigo-600">roim-picx</a>
            </div>
        </div>

        <!-- Image Preview -->
        <el-image-viewer v-if="showPreview" :url-list="[imageUrl]" @close="showPreview = false" hide-on-click-modal />
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import { faSpinner, faLock, faUnlock, faEye, faDownload, faExclamationTriangle } from '@fortawesome/free-solid-svg-icons'
import { ElImageViewer, ElMessage } from 'element-plus'
import { requestGetShareInfo, requestVerifyShare, type ShareDetail, type ShareImageResult } from '../utils/request'
import BaseInput from '../components/common/BaseInput.vue'
import BaseButton from '../components/common/BaseButton.vue'

const route = useRoute()
const { t } = useI18n()
const shareId = route.params.id as string

const loading = ref(true)
const error = ref(false)
const errorTitle = ref('')
const errorMessage = ref('')

const shareInfo = ref<ShareDetail | null>(null)
const needPassword = ref(false)
const password = ref('')
const verifying = ref(false)

const imageUrl = ref('')
const imageName = ref('shared-image')
const shareResult = ref<ShareImageResult | null>(null)
const showPreview = ref(false)

onMounted(async () => {
    try {
        shareInfo.value = await requestGetShareInfo(shareId)
        needPassword.value = shareInfo.value.hasPassword

        // If no password required, get image directly
        if (!needPassword.value) {
            await verifyPassword()
        }
    } catch (e: any) {
        error.value = true
        if (e.includes('过期')) {
            errorTitle.value = t('share.linkExpiredTitle')
            errorMessage.value = t('share.linkExpiredMessage')
        } else if (e.includes('次数')) {
            errorTitle.value = t('share.maxViewsReachedTitle')
            errorMessage.value = t('share.maxViewsReachedMessage')
        } else {
            errorTitle.value = t('share.invalidLinkTitle')
            errorMessage.value = t('share.invalidLinkMessage')
        }
    } finally {
        loading.value = false
    }
})

const verifyPassword = async () => {
    verifying.value = true
    try {
        const result = await requestVerifyShare(shareId, needPassword.value ? password.value : undefined)
        shareResult.value = result
        imageUrl.value = result.imageUrl
        imageName.value = result.imageKey.split('/').pop() || 'image'
    } catch (e: any) {
        if (e.includes('密码')) {
            ElMessage.error(t('share.passwordError'))
        } else {
            error.value = true
            errorTitle.value = t('share.verifyFailed')
            errorMessage.value = e
        }
    } finally {
        verifying.value = false
    }
}
const handleDownload = () => {
    if (imageUrl.value) {
        window.open(imageUrl.value, '_blank')
    }
}
</script>
