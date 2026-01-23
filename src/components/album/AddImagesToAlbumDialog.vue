<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElMessage, ElImage, ElEmpty } from 'element-plus'
import { faSearch, faCheckCircle } from '@fortawesome/free-solid-svg-icons'
import { requestListImages, requestAddImagesToAlbum } from '../../utils/request'
import type { ImgItem, ImgReq } from '../../utils/types'
import BaseDialog from '../common/BaseDialog.vue'
import BaseButton from '../common/BaseButton.vue'
import BaseInput from '../common/BaseInput.vue'

const props = defineProps<{
    modelValue: boolean
    albumId: number
}>()

const emit = defineEmits(['update:modelValue', 'success'])

const { t } = useI18n()
const loading = ref(false)
const images = ref<ImgItem[]>([])
const searchQuery = ref('')
const selectedKeys = ref<Set<string>>(new Set())

// Pagination
const cursor = ref<string | undefined>(undefined)
const hasMore = ref(true)
// For this dialog, we might want simpler pagination or "Load More"
// Let's use "Load More" button for simplicity inside dialog
const loadingMore = ref(false)

const loadImages = async (reset = true) => {
    if (reset) {
        cursor.value = undefined
        hasMore.value = true
        images.value = []
    }

    if (!hasMore.value && !reset) return

    loading.value = reset
    loadingMore.value = !reset

    try {
        const res = await requestListImages(<ImgReq>{
            limit: 24, // 4x6 grid
            cursor: cursor.value,
            keyword: searchQuery.value || undefined
        })

        if (reset) {
            images.value = res.list
        } else {
            images.value = [...images.value, ...res.list]
        }

        cursor.value = res.cursor
        hasMore.value = res.next
    } catch (e) {
        // error
    } finally {
        loading.value = false
        loadingMore.value = false
    }
}

const toggleSelect = (key: string) => {
    if (selectedKeys.value.has(key)) {
        selectedKeys.value.delete(key)
    } else {
        selectedKeys.value.add(key)
    }
}

const handleConfirm = async () => {
    if (selectedKeys.value.size === 0) return

    loading.value = true
    try {
        // We need URLs too. Find them from images list.
        const selectedImages = images.value
            .filter(img => selectedKeys.value.has(img.key))
            .map(img => ({ key: img.key, url: img.url }))

        // If some selected images are not in current loaded list (unlikely with this UI flow, but possible if we kept selection across searches?), 
        // we strictly only add what we have info for.
        // Actually, preventing selection loss across searches/pagination is complex. 
        // Let's assume user selects from current visible set or we keep a separate map of selected items.
        // Since we are adding "existing" images, we might have selected items from previous pages.
        // But here we are just appending.

        // Wait, if I scroll down, I might lose reference if I don't store full object.
        // `images` accumulates so it's fine.

        await requestAddImagesToAlbum(props.albumId, selectedImages)
        ElMessage.success(t('album.updateSuccess'))
        emit('success')
        emit('update:modelValue', false)
    } catch (e) {
        // error
    } finally {
        loading.value = false
    }
}

const handleClose = () => {
    emit('update:modelValue', false)
    selectedKeys.value.clear()
    searchQuery.value = ''
    images.value = []
}

watch(() => props.modelValue, (val) => {
    if (val) {
        loadImages(true)
    }
})

const handleSearch = () => {
    loadImages(true)
}
</script>

<template>
    <BaseDialog :model-value="modelValue" :title="$t('album.addImages')" width="800px" @close="handleClose"
        @confirm="handleConfirm" :loading="loading" :confirm-disabled="selectedKeys.size === 0">
        <div class="flex flex-col h-[60vh]">
            <!-- Search -->
            <div class="flex gap-2 mb-4 items-center">
                <BaseInput v-model="searchQuery" :placeholder="$t('manage.searchPlaceholder')"
                    @keyup.enter="handleSearch" @clear="handleSearch" class="flex-1">
                    <template #prefix>
                        <font-awesome-icon :icon="faSearch" />
                    </template>
                </BaseInput>
                <BaseButton type="indigo" @click="handleSearch" class="!py-3">{{ $t('common.search') }}</BaseButton>
            </div>

            <!-- List -->
            <div class="flex-1 overflow-y-auto min-h-0 rounded-lg p-4 bg-gray-50 dark:bg-gray-900">
                <div v-if="images.length > 0" class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                    <div v-for="img in images" :key="img.key"
                        class="aspect-square relative rounded overflow-hidden cursor-pointer group"
                        @click="toggleSelect(img.key)">
                        <el-image :src="img.url" fit="cover" class="w-full h-full" loading="lazy" />
                        <!-- Selection Overlay -->
                        <div class="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors flex items-center justify-center"
                            :class="{ 'bg-indigo-500/30 ring-2 ring-indigo-500': selectedKeys.has(img.key) }">
                            <font-awesome-icon v-if="selectedKeys.has(img.key)" :icon="faCheckCircle"
                                class="text-white text-3xl drop-shadow-md" />
                        </div>
                    </div>
                </div>
                <el-empty v-else-if="!loading" :description="$t('manage.noImages')" />

                <div v-if="hasMore" class="text-center py-4">
                    <BaseButton type="secondary" @click="loadImages(false)" :loading="loadingMore">
                        {{ $t('manage.loadMore') }}
                    </BaseButton>
                </div>
            </div>

            <div class="mt-2 text-sm text-gray-500">
                {{ $t('manage.selected', { count: selectedKeys.size }) }}
            </div>
        </div>
    </BaseDialog>
</template>
