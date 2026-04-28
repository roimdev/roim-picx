<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { ElDialog } from 'element-plus'
import { useI18n } from 'vue-i18n'
import BaseButton from './BaseButton.vue'

const props = withDefaults(defineProps<{
    modelValue: boolean
    title?: string
    width?: string
    loading?: boolean
    confirmText?: string
    cancelText?: string
    showFooter?: boolean
    confirmDisabled?: boolean
    confirmType?: 'primary' | 'secondary' | 'danger' | 'white' | 'indigo'
}>(), {
    title: '',
    width: '480px',
    loading: false,
    showFooter: true,
    confirmDisabled: false,
    confirmType: 'indigo'
})

const emit = defineEmits(['update:modelValue', 'confirm', 'cancel', 'close'])
const { t } = useI18n()

// Responsive dialog
const windowWidth = ref(typeof window !== 'undefined' ? window.innerWidth : 1024)
const isMobile = computed(() => windowWidth.value < 640)
const dialogWidth = computed(() => isMobile.value ? '90%' : props.width)

const handleResize = () => {
    windowWidth.value = window.innerWidth
}

onMounted(() => {
    window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
    window.removeEventListener('resize', handleResize)
})

const handleClose = () => {
    emit('update:modelValue', false)
    emit('close')
}

const handleConfirm = () => {
    emit('confirm')
}

const handleCancel = () => {
    emit('update:modelValue', false)
    emit('cancel')
}
</script>

<template>
    <el-dialog :model-value="modelValue" :title="title" :width="dialogWidth" align-center @close="handleClose"
        append-to-body class="rounded-2xl">
        <slot />

        <template #footer v-if="showFooter">
            <slot name="footer">
                <div class="flex gap-3">
                    <BaseButton @click="handleCancel" type="secondary" class="flex-1 !rounded-xl !py-3">
                        {{ cancelText || t('common.cancel') }}
                    </BaseButton>
                    <BaseButton :type="confirmType" @click="handleConfirm" :loading="loading"
                        :disabled="confirmDisabled" class="flex-1 !rounded-xl !py-3 font-bold">
                        {{ confirmText || t('common.confirm') }}
                    </BaseButton>
                </div>
            </slot>
        </template>
    </el-dialog>
</template>

<style>
/* Global override for element-plus dialog */
.el-dialog {
    border-radius: 1rem !important;
    /* Remove fixed height - let it adapt to content */
    max-height: calc(100vh - 100px) !important;
    /* Use flex to manage internal layout */
    display: flex !important;
    flex-direction: column !important;
}

.el-dialog .el-dialog__header {
    margin-right: 0;
    padding: 20px 24px 10px;
    flex-shrink: 0;
}

.el-dialog .el-dialog__body {
    /* Let body grow with content, but allow scrolling if too large */
    overflow-y: auto;
    padding: 20px 24px;
    /* Don't force flex: 1, which would make it take all available space */
    flex-shrink: 1;
}

.el-dialog .el-dialog__footer {
    padding: 10px 24px 20px;
    flex-shrink: 0;
}

/* On mobile, keep radius and reduce padding */
@media (max-width: 640px) {
    .el-dialog {
        border-radius: 1.25rem !important;
    }

    .el-dialog .el-dialog__header {
        padding: 10px 10px 5px;
    }

    .el-dialog .el-dialog__body {
        padding: 10px;
    }

    .el-dialog .el-dialog__footer {
        /* Keep more vertical padding for footer to prevent button squeezing */
        padding: 5px 10px 10px;
    }
}
</style>
