<template>
    <div
        class="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 flex items-center justify-center p-4">
        <div class="w-full max-w-lg">
            <!-- Loading State -->
            <div v-if="loading" class="text-center py-20">
                <font-awesome-icon :icon="faSpinner" spin class="text-4xl text-indigo-500 mb-4" />
                <p class="text-gray-500 dark:text-gray-400">加载中...</p>
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
                    <h2 class="text-xl font-bold text-gray-900 dark:text-gray-100">需要访问密码</h2>
                    <p class="text-sm text-gray-500 dark:text-gray-400 mt-2">请输入密码以查看分享内容</p>
                </div>

                <form @submit.prevent="verifyPassword" class="space-y-6">
                    <div>
                        <input v-model="password" type="password" placeholder="输入访问密码" autofocus
                            class="w-full px-4 py-4 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-center text-lg tracking-widest focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all" />
                    </div>
                    <button type="submit" :disabled="verifying || !password"
                        class="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-colors disabled:opacity-50">
                        <font-awesome-icon :icon="verifying ? faSpinner : faUnlock" :spin="verifying" class="mr-2" />
                        验证密码
                    </button>
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
                            已查看 {{ shareResult?.views || 0 }} 次
                            <span v-if="shareResult?.maxViews">/ {{ shareResult.maxViews }} 次</span>
                        </span>
                    </div>

                    <!-- Download Button -->
                    <a :href="imageUrl" :download="imageName" target="_blank"
                        class="block w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-center rounded-xl font-bold transition-colors">
                        <font-awesome-icon :icon="faDownload" class="mr-2" />
                        下载图片
                    </a>
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
import { useRoute } from 'vue-router'
import { faSpinner, faLock, faUnlock, faEye, faDownload, faExclamationTriangle } from '@fortawesome/free-solid-svg-icons'
import { ElImageViewer, ElMessage } from 'element-plus'
import { requestGetShareInfo, requestVerifyShare, type ShareDetail, type ShareImageResult } from '../utils/request'

const route = useRoute()
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
            errorTitle.value = '链接已过期'
            errorMessage.value = '此分享链接已超过有效期'
        } else if (e.includes('次数')) {
            errorTitle.value = '已达到查看上限'
            errorMessage.value = '此分享链接已达到最大查看次数'
        } else {
            errorTitle.value = '链接无效'
            errorMessage.value = '分享链接不存在或已被删除'
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
            ElMessage.error('密码错误')
        } else {
            error.value = true
            errorTitle.value = '验证失败'
            errorMessage.value = e
        }
    } finally {
        verifying.value = false
    }
}
</script>
