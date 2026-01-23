<template>
    <BaseDialog :model-value="modelValue" :title="type === 'image' ? $t('share.title') : $t('album.shareTitle')"
        width="480px" @close="handleClose" :show-footer="true">
        <div class="space-y-6">
            <!-- Preview Area -->
            <div class="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                <img :src="displayCover" class="w-20 h-20 object-cover rounded-lg shadow-sm" />
                <div class="flex-1 min-w-0">
                    <p class="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{{ displayName }}</p>
                    <p class="text-xs text-gray-500 dark:text-gray-400">{{ displaySubtext }}</p>
                </div>
            </div>

            <!-- Options (Standard for both) -->
            <div v-if="!shareUrl" class="space-y-6">
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
            </div>

            <!-- Result -->
            <div v-else
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
                    {{ shareUrl ? $t('common.close') : $t('common.cancel') }}
                </BaseButton>
                <BaseButton type="indigo" @click="handleAction" :loading="loading"
                    class="flex-1 !rounded-xl !py-3 font-bold">
                    <font-awesome-icon :icon="loading ? faSpinner : (shareUrl ? faRedo : faShare)" :spin="loading"
                        class="mr-2" />
                    {{ shareUrl ? $t('share.regenerate') : $t('share.generate') }}
                </BaseButton>
            </div>
        </template>
    </BaseDialog>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElDatePicker, ElMessage } from 'element-plus'
import { faShare, faSpinner, faRedo } from '@fortawesome/free-solid-svg-icons'
import formatBytes from '../utils/format-bytes'
import copy from 'copy-to-clipboard'
import { requestCreateShare, requestShareAlbum } from '../utils/request'
import BaseDialog from './common/BaseDialog.vue'
import BaseButton from './common/BaseButton.vue'
import BaseInput from './common/BaseInput.vue'
import BaseSwitch from './common/BaseSwitch.vue'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'

const { t } = useI18n()

interface Props {
    modelValue: boolean
    type: 'image' | 'album'
    // Image specific
    imageKey?: string
    imageUrl?: string
    imageName?: string
    imageSize?: number
    // Album specific
    albumId?: number
    albumName?: string
    coverImage?: string
}

const props = withDefaults(defineProps<Props>(), {
    type: 'image'
})

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

// Computed helpers for preview
const displayName = computed(() => {
    return props.type === 'image' ? props.imageName : props.albumName
})

const displayCover = computed(() => {
    return props.type === 'image' ? props.imageUrl : props.coverImage // Album cover could be added if available, for now empty or default
})

const displaySubtext = computed(() => {
    if (props.type === 'image') {
        return props.imageSize ? formatBytes(props.imageSize) : ''
    }
    return t('album.shareTitle')
})

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

const handleAction = () => {
    if (shareUrl.value) {
        shareUrl.value = ''
    } else {
        createShare()
    }
}

const createShare = async () => {
    loading.value = true
    try {
        let result
        if (props.type === 'image') {
            if (!props.imageKey || !props.imageUrl) throw new Error('Missing image details')
            result = await requestCreateShare({
                imageKey: props.imageKey,
                imageUrl: props.imageUrl,
                password: enablePassword.value ? password.value : undefined,
                expireAt: enableExpiry.value && expireTime.value ? expireTime.value.getTime() : undefined,
                maxViews: enableMaxViews.value ? maxViews.value : undefined
            })
        } else {
            if (!props.albumId) throw new Error('Missing album id')
            result = await requestShareAlbum(props.albumId, {
                password: enablePassword.value ? password.value : undefined,
                expireAt: enableExpiry.value && expireTime.value ? expireTime.value.getTime() : undefined,
                maxViews: enableMaxViews.value ? maxViews.value : undefined
            })
        }

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
