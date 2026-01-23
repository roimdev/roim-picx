<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElDialog, ElInput, ElButton, ElSwitch, ElDatePicker, ElMessage } from 'element-plus'
import { faCopy, faRedo } from '@fortawesome/free-solid-svg-icons'
import { requestShareAlbum } from '../../utils/request'
import type { AlbumShareInfo } from '../../utils/types'

const props = defineProps<{
    modelValue: boolean
    albumId: number
    albumName: string
}>()

const emit = defineEmits(['update:modelValue'])

const { t } = useI18n()
const loading = ref(false)
const shareResult = ref<AlbumShareInfo | null>(null)

// Form
const hasPassword = ref(false)
const password = ref('')
const hasExpiry = ref(false)
const expireTime = ref<Date | null>(null)
const maxViews = ref<number | undefined>(undefined)

const handleClose = () => {
    emit('update:modelValue', false)
    // reset form? keep for convenience?
}

const createShare = async () => {
    loading.value = true
    try {
        const res = await requestShareAlbum(props.albumId, {
            password: hasPassword.value ? password.value : undefined,
            expireAt: hasExpiry.value && expireTime.value ? expireTime.value.getTime() : undefined,
            maxViews: maxViews.value || undefined
        })
        shareResult.value = res
        ElMessage.success(t('share.createSuccess'))
    } catch (e) {
        // handled
    } finally {
        loading.value = false
    }
}

const copyLink = async () => {
    if (!shareResult.value) return
    try {
        await navigator.clipboard.writeText(shareResult.value.url)
        ElMessage.success(t('share.linkCopied'))
    } catch (e) {
        ElMessage.error(t('share.copyFailed'))
    }
}

// Reset when dialog opens
watch(() => props.modelValue, (val) => {
    if (val) {
        shareResult.value = null
        hasPassword.value = false
        password.value = ''
        hasExpiry.value = false
        expireTime.value = null
        maxViews.value = undefined
    }
})
</script>

<template>
    <el-dialog :model-value="modelValue" :title="$t('album.shareTitle') + ' - ' + albumName" width="500px"
        @close="handleClose">
        <div v-if="!shareResult" class="space-y-4">
            <!-- Password -->
            <div class="flex items-center justify-between">
                <span class="text-sm font-medium">{{ $t('share.setPassword') }}</span>
                <el-switch v-model="hasPassword" />
            </div>
            <div v-if="hasPassword">
                <el-input v-model="password" type="password" show-password
                    :placeholder="$t('share.passwordPlaceholder')" />
            </div>

            <!-- Expiry -->
            <div class="flex items-center justify-between">
                <span class="text-sm font-medium">{{ $t('share.setExpiry') }}</span>
                <el-switch v-model="hasExpiry" />
            </div>
            <div v-if="hasExpiry">
                <el-date-picker v-model="expireTime" type="datetime" :placeholder="$t('share.expirePlaceholder')"
                    class="!w-full" />
            </div>

            <!-- Max Views -->
            <div>
                <span class="text-sm font-medium block mb-2">{{ $t('share.limitViews') }}</span>
                <el-input v-model.number="maxViews" type="number" :placeholder="$t('share.maxViewsPlaceholder')" />
            </div>
        </div>

        <div v-else class="space-y-4">
            <div class="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <p class="text-sm text-gray-500 mb-2">{{ $t('share.link') }}</p>
                <div class="flex gap-2">
                    <el-input readonly :model-value="shareResult.url" />
                    <el-button type="primary" @click="copyLink">
                        <font-awesome-icon :icon="faCopy" class="mr-2" />
                        {{ $t('common.copy') }}
                    </el-button>
                </div>
            </div>
            <div class="text-sm text-gray-500 space-y-1">
                <p v-if="shareResult.hasPassword">🔒 {{ $t('share.hasPassword') }}</p>
                <p v-if="shareResult.expireAt">⏱ {{ new Date(shareResult.expireAt).toLocaleString() }}</p>
            </div>
            <div class="text-center pt-2">
                <el-button text @click="shareResult = null">
                    <font-awesome-icon :icon="faRedo" class="mr-2" />
                    {{ $t('share.create') }} {{ $t('common.new') }}
                </el-button>
            </div>
        </div>

        <template #footer>
            <div v-if="!shareResult">
                <el-button @click="handleClose">{{ $t('common.cancel') }}</el-button>
                <el-button type="primary" @click="createShare" :loading="loading">
                    {{ $t('share.generate') }}
                </el-button>
            </div>
            <div v-else>
                <el-button @click="handleClose">{{ $t('common.close') }}</el-button>
            </div>
        </template>
    </el-dialog>
</template>
