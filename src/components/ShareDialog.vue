<template>
    <BaseDialog :model-value="modelValue" :title="$t('share.title')" width="480px" @close="handleClose"
        :show-footer="true">
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
                <BaseSwitch v-model="enablePassword" :label="$t('share.setPassword')" class="mb-3" />
                <transition name="el-fade-in">
                    <div v-if="enablePassword">
                        <BaseInput v-model="password" :placeholder="$t('share.passwordPlaceholder')" />
                    </div>
                </transition>
            </div>

            <!-- Expiration Option -->
            <div>
                <BaseSwitch v-model="enableExpiry" :label="$t('share.setExpiry')" class="mb-3" />
                <transition name="el-fade-in">
                    <div v-if="enableExpiry">
                        <el-date-picker v-model="expireTime" type="datetime"
                            :placeholder="$t('share.expirePlaceholder')" format="YYYY-MM-DD HH:mm"
                            :disabled-date="disabledDate" class="!w-full" />
                    </div>
                </transition>
            </div>

            <!-- Max Views Option -->
            <div>
                <BaseSwitch v-model="enableMaxViews" :label="$t('share.limitViews')" class="mb-3" />
                <transition name="el-fade-in">
                    <div v-if="enableMaxViews">
                        <BaseInput v-model.number="maxViews" type="number"
                            :placeholder="$t('share.maxViewsPlaceholder')" />
                    </div>
                </transition>
            </div>

            <!-- Result -->
            <div v-if="shareUrl"
                class="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl">
                <p class="text-xs text-green-600 dark:text-green-400 mb-2 font-medium">{{ $t('share.shareUrlGenerated')
                }}</p>
                <div class="flex items-center gap-2">
                    <BaseInput :model-value="shareUrl" readonly />
                    <BaseButton type="indigo" size="sm" @click="copyLink">
                        {{ $t('share.copy') }}
                    </BaseButton>
                </div>
            </div>
        </div>

        <template #footer>
            <div class="flex gap-3 w-full">
                <BaseButton @click="handleClose" class="flex-1 !rounded-xl !py-3">
                    {{ $t('common.cancel') }}
                </BaseButton>
                <BaseButton type="indigo" @click="createShare" :loading="loading"
                    class="flex-1 !rounded-xl !py-3 font-bold">
                    <font-awesome-icon :icon="loading ? faSpinner : faShare" :spin="loading" class="mr-2" />
                    {{ shareUrl ? $t('share.regenerate') : $t('share.generate') }}
                </BaseButton>
            </div>
        </template>
    </BaseDialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElDatePicker, ElMessage } from 'element-plus'
import { faShare, faSpinner } from '@fortawesome/free-solid-svg-icons'
import formatBytes from '../utils/format-bytes'
import copy from 'copy-to-clipboard'
import { requestCreateShare } from '../utils/request'
import BaseDialog from './common/BaseDialog.vue'
import BaseButton from './common/BaseButton.vue'
import BaseInput from './common/BaseInput.vue'
import BaseSwitch from './common/BaseSwitch.vue'

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

const loading = ref(false)
const shareUrl = ref('')

const enablePassword = ref(false)
const password = ref('')
const enableExpiry = ref(false)
const expireTime = ref<Date>()
const enableMaxViews = ref(false)
const maxViews = ref(10)

watch(() => props.modelValue, (val) => {
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

const disabledDate = (time: Date) => {
    return time.getTime() < Date.now()
}

const handleClose = () => {
    emit('update:modelValue', false)
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
