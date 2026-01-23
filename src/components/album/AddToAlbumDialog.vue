<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElDialog, ElButton, ElMessage, ElSelect, ElOption, ElRadioGroup, ElRadio } from 'element-plus'
import { requestListAlbums, requestAddImagesToAlbum } from '../../utils/request'
import type { Album } from '../../utils/types'

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
        emit('update:modelValue', false)
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
    <el-dialog :model-value="modelValue" :title="$t('album.uploadTo')" class="!w-[90%] sm:!w-[400px]"
        @close="emit('update:modelValue', false)" append-to-body>
        <div class="space-y-4">
            <div v-if="albums.length === 0" class="text-gray-500 text-center py-4">
                {{ $t('album.empty') }}
            </div>
            <div v-else class="max-h-60 overflow-y-auto space-y-2">
                <div v-for="album in albums" :key="album.id"
                    class="flex items-center p-3 rounded-lg border cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 dark:border-gray-700 transition-colors"
                    :class="{ 'ring-2 ring-indigo-500 border-transparent': selectedAlbumId === album.id }"
                    @click="selectedAlbumId = album.id">
                    <div class="w-10 h-10 rounded bg-gray-200 dark:bg-gray-700 overflow-hidden mr-3 flex-shrink-0">
                        <img v-if="album.cover_image" :src="album.cover_image" class="w-full h-full object-cover" />
                    </div>
                    <div class="flex-1 min-w-0">
                        <div class="font-medium truncate">{{ album.name }}</div>
                        <div class="text-xs text-gray-500">{{ album.imageCount }} {{ $t('album.items') }}</div>
                    </div>
                </div>
            </div>
        </div>

        <template #footer>
            <el-button @click="emit('update:modelValue', false)">{{ $t('common.cancel') }}</el-button>
            <el-button type="primary" @click="handleConfirm" :loading="loading" :disabled="!selectedAlbumId">
                {{ $t('common.confirm') }}
            </el-button>
        </template>
    </el-dialog>
</template>
