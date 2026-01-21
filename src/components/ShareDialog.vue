<template>
    <el-dialog v-model="visible" :title="$t('share.title')" :width="dialogWidth" :fullscreen="isMobile" @close="handleClose">
        <div class="space-y-6">
            <!-- Image Preview -->
            <div class="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                <img :src="imageUrl" class="w-20 h-20 object-cover rounded-lg shadow-sm" />
                <div class="flex-1 min-w-0">
                    <p class="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{{ imageName }}</p>
                    <p class="text-xs text-gray-500 dark:text-gray-400">{{ formatBytes(imageSize) }}</p>
                </div>
            </div>

            <!-- Password Option -->
            <div>
                <label class="flex items-center gap-3 cursor-pointer group mb-3">
                    <div class="relative">
                        <input type="checkbox" v-model="enablePassword" class="sr-only peer" />
                        <div
                            class="w-11 h-6 bg-gray-200 dark:bg-gray-700 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600">
                        </div>
                    </div>
                    <span class="text-sm text-gray-700 dark:text-gray-300">{{ $t('share.setPassword') }}</span>
                </label>
                <transition name="el-fade-in">
                    <div v-if="enablePassword" class="relative">
                        <input v-model="password" type="text" :placeholder="$t('share.passwordPlaceholder')"
                            class="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all" />
                    </div>
                </transition>
            </div>

            <!-- Expiration Option -->
            <div>
                <label class="flex items-center gap-3 cursor-pointer group mb-3">
                    <div class="relative">
                        <input type="checkbox" v-model="enableExpiry" class="sr-only peer" />
                        <div
                            class="w-11 h-6 bg-gray-200 dark:bg-gray-700 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600">
                        </div>
                    </div>
                    <span class="text-sm text-gray-700 dark:text-gray-300">{{ $t('share.setExpiry') }}</span>
                </label>
                <transition name="el-fade-in">
                    <div v-if="enableExpiry">
                        <el-date-picker v-model="expireTime" type="datetime" :placeholder="$t('share.expirePlaceholder')"
                            format="YYYY-MM-DD HH:mm" :disabled-date="disabledDate" class="!w-full" />
                    </div>
                </transition>
            </div>

            <!-- Max Views Option -->
            <div>
                <label class="flex items-center gap-3 cursor-pointer group mb-3">
                    <div class="relative">
                        <input type="checkbox" v-model="enableMaxViews" class="sr-only peer" />
                        <div
                            class="w-11 h-6 bg-gray-200 dark:bg-gray-700 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600">
                        </div>
                    </div>
                    <span class="text-sm text-gray-700 dark:text-gray-300">{{ $t('share.limitViews') }}</span>
                </label>
                <transition name="el-fade-in">
                    <div v-if="enableMaxViews">
                        <input v-model.number="maxViews" type="number" min="1" max="1000" :placeholder="$t('share.maxViewsPlaceholder')"
                            class="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all" />
                    </div>
                </transition>
            </div>

            <!-- Result -->
            <div v-if="shareUrl"
                class="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl">
                <p class="text-xs text-green-600 dark:text-green-400 mb-2 font-medium">{{ $t('share.shareUrlGenerated') }}</p>
                <div class="flex items-center gap-2">
                    <input :value="shareUrl" readonly
                        class="flex-1 px-3 py-2 bg-white dark:bg-gray-900 border border-green-300 dark:border-green-700 rounded-lg text-sm text-gray-900 dark:text-gray-100" />
                    <button @click="copyLink"
                        class="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors">
                        {{ $t('share.copy') }}
                    </button>
                </div>
            </div>
        </div>

        <template #footer>
            <div class="flex gap-3">
                <button @click="handleClose"
                    class="flex-1 py-3 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl font-medium transition-colors">
                    {{ $t('common.cancel') }}
                </button>
                <button @click="createShare" :disabled="loading"
                    class="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-colors disabled:opacity-50">
                    <font-awesome-icon :icon="loading ? faSpinner : faShare" :spin="loading" class="mr-2" />
                    {{ shareUrl ? $t('share.regenerate') : $t('share.generate') }}
                </button>
            </div>
        </template>
    </el-dialog>
</template>

<script setup lang="ts">
import { ref, watch, computed, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElDialog, ElDatePicker, ElMessage } from 'element-plus'
import { faShare, faSpinner } from '@fortawesome/free-solid-svg-icons'
import formatBytes from '../utils/format-bytes'
import copy from 'copy-to-clipboard'
import { requestCreateShare } from '../utils/request'
const { t } = useI18n()

const props = defineProps<{
    modelValue: boolean
    imageKey: string
    imageUrl: string
    imageName: string
    imageSize: number
}>()

const emit = defineEmits<{
    (e: 'update:modelValue', value: boolean): void
}>()

const visible = ref(props.modelValue)
const loading = ref(false)
const shareUrl = ref('')

const enablePassword = ref(false)
const password = ref('')
const enableExpiry = ref(false)
const expireTime = ref<Date>()
const enableMaxViews = ref(false)
const maxViews = ref(10)

// Responsive dialog
const windowWidth = ref(typeof window !== 'undefined' ? window.innerWidth : 1024)
const isMobile = computed(() => windowWidth.value < 640)
const dialogWidth = computed(() => isMobile.value ? '100%' : '480px')

const handleResize = () => {
    windowWidth.value = window.innerWidth
}

onMounted(() => {
    window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
    window.removeEventListener('resize', handleResize)
})

watch(() => props.modelValue, (val) => {
    visible.value = val
    if (val) {
        // Reset state when dialog opens
        shareUrl.value = ''
        enablePassword.value = false
        password.value = ''
        enableExpiry.value = false
        expireTime.value = undefined
        enableMaxViews.value = false
        maxViews.value = 10
    }
})

watch(visible, (val) => {
    emit('update:modelValue', val)
})

const disabledDate = (time: Date) => {
    return time.getTime() < Date.now()
}

const handleClose = () => {
    visible.value = false
}

const createShare = async () => {
    loading.value = true
    try {
        const result = await requestCreateShare({
            imageKey: props.imageKey,
            imageUrl: props.imageUrl,
            password: enablePassword.value ? password.value : undefined,
            expireAt: enableExpiry.value && expireTime.value ? expireTime.value.getTime() : undefined,
            maxViews: enableMaxViews.value ? maxViews.value : undefined
        })
        shareUrl.value = result.url
        ElMessage.success(t('share.shareUrlGenerated'))
    } catch (e: any) {
        ElMessage.error(e.message || t('share.createShareFailed'))
    } finally {
        loading.value = false
    }
}

const copyLink = () => {
    if (copy(shareUrl.value)) {
        ElMessage.success(t('share.linkCopied'))
    }
}
</script>
