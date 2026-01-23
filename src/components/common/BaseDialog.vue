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
const dialogWidth = computed(() => isMobile.value ? '100%' : props.width)

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
    <el-dialog :model-value="modelValue" :title="title" :width="dialogWidth" :fullscreen="isMobile" @close="handleClose"
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
/* Global override for element-plus dialog to match rounded-xl feel if needed, 
   though 'class' on el-dialog might put it on the wrapper. 
   Scope checking: el-dialog appends to body, so scoped styles won't reach it easily without deep selector.
   However, we can use the 'class' prop. */
.el-dialog {
    border-radius: 1rem !important;
    /* rounded-2xl */
}

/* On mobile, remove radius */
@media (max-width: 640px) {
    .el-dialog {
        border-radius: 0 !important;
    }
}
</style>
