<script setup lang="ts">
import { ref, watch, onMounted, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElMessage } from 'element-plus'
import { requestListAlbums, requestAddImagesToAlbum } from '../../utils/request'
import type { Album } from '../../utils/types'
import BaseDialog from '../common/BaseDialog.vue'
import { faCheckCircle } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'

const props = defineProps<{
    modelValue: boolean
    imageKeys: string[]
    imageUrls: string[] // We need URLs for the backend API
}>()

const emit = defineEmits(['update:modelValue', 'success'])

const { t } = useI18n()
const loading = ref(false)
const albums = ref<Album[]>([])
const selectedAlbumId = ref<number | undefined>(undefined)

const visible = computed({
    get: () => props.modelValue,
    set: (val) => emit('update:modelValue', val)
})

const loadAlbums = async () => {
    try {
        const res = await requestListAlbums()
        albums.value = res
    } catch (e) {
        // error
    }
}

const handleConfirm = async () => {
    if (!selectedAlbumId.value) return
    if (props.imageKeys.length === 0) return

    loading.value = true
    try {
        // Construct array of { key, url }
        // We assume keys and urls are parallel arrays or we pass objects
        // The props definition imageKeys/imageUrls implies parallel.
        const images = props.imageKeys.map((key, index) => ({
            key,
            url: props.imageUrls[index] || ''
        }))

        await requestAddImagesToAlbum(selectedAlbumId.value, images)
        ElMessage.success(t('album.updateSuccess'))
        emit('success')
        visible.value = false
    } catch (e) {
        // error
    } finally {
        loading.value = false
    }
}

watch(() => props.modelValue, (val) => {
    if (val && albums.value.length === 0) {
        loadAlbums()
    }
    if (val) {
        selectedAlbumId.value = undefined
    }
})

onMounted(() => {
    // Preload potentially?
})
</script>

<template>
    <BaseDialog v-model="visible" :title="$t('album.uploadTo')" width="400px" @confirm="handleConfirm"
        :loading="loading" :confirm-disabled="!selectedAlbumId">
        <div class="space-y-4">
            <div v-if="albums.length === 0" class="text-gray-500 text-center py-4">
                {{ $t('album.empty') }}
            </div>
            <div v-else class="max-h-60 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                <div v-for="album in albums" :key="album.id"
                    class="flex items-center p-3 rounded-xl border-2 cursor-pointer transition-all duration-200" :class="[
                        selectedAlbumId === album.id
                            ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-900/20 shadow-sm'
                            : 'border-transparent bg-gray-50 dark:bg-gray-800/40 hover:bg-gray-100 dark:hover:bg-gray-800'
                    ]" @click="selectedAlbumId = album.id">
                    <div class="w-10 h-10 rounded-lg bg-gray-200 dark:bg-gray-700 overflow-hidden mr-3 flex-shrink-0">
                        <img v-if="album.cover_image" :src="album.cover_image" class="w-full h-full object-cover" />
                    </div>
                    <div class="flex-1 min-w-0">
                        <div class="font-medium truncate text-gray-900 dark:text-gray-100">{{ album.name }}</div>
                        <div class="text-xs text-gray-500">{{ album.imageCount }} {{ $t('album.items') }}</div>
                    </div>
                    <div v-if="selectedAlbumId === album.id" class="ml-2 text-indigo-600 dark:text-indigo-400">
                        <font-awesome-icon :icon="faCheckCircle" class="text-lg" />
                    </div>
                </div>
            </div>
        </div>
    </BaseDialog>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
    width: 4px;
}

.custom-scrollbar::-webkit-scrollbar-track {
    background: transparent;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
    background: #e2e8f0;
    border-radius: 10px;
}

.dark .custom-scrollbar::-webkit-scrollbar-thumb {
    background: #334155;
}
</style>
