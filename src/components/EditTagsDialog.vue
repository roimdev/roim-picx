<template>
    <BaseDialog v-model="visible" :title="$t('tags.editTags')" width="400px" @confirm="handleConfirm" :loading="loading">
        <div class="py-2">
            <div v-if="imageUrl" class="mb-4 flex justify-center">
                <img :src="imageUrl" class="max-h-32 rounded-lg object-contain" />
            </div>
            <TagsInput v-model="editTags" :placeholder="$t('tags.inputPlaceholder')" :hint="$t('tags.inputHint')" />
        </div>
    </BaseDialog>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElMessage } from 'element-plus'
import BaseDialog from './common/BaseDialog.vue'
import TagsInput from './common/TagsInput.vue'
import { requestUpdateImageTags } from '../utils/request'

const { t } = useI18n()

const props = defineProps<{
    modelValue: boolean
    imageKey: string
    imageUrl?: string
    tags?: string[]
}>()

const emit = defineEmits<{
    (e: 'update:modelValue', value: boolean): void
    (e: 'updated', data: { key: string, tags: string[] }): void
}>()

const visible = computed({
    get: () => props.modelValue,
    set: (value) => emit('update:modelValue', value)
})

const editTags = ref<string[]>([])
const loading = ref(false)

// Sync tags when dialog opens
watch(() => props.modelValue, (newVal) => {
    if (newVal) {
        editTags.value = props.tags ? [...props.tags] : []
    }
})

const handleConfirm = async () => {
    loading.value = true
    try {
        const result = await requestUpdateImageTags({
            key: props.imageKey,
            tags: editTags.value
        })
        ElMessage.success(t('tags.updateSuccess'))
        emit('updated', result)
        visible.value = false
    } catch (e) {
        console.error('Failed to update tags:', e)
    } finally {
        loading.value = false
    }
}
</script>
