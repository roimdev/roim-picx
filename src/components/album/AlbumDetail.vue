<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import {
    ElButton, ElEmpty, ElPagination, ElMessageBox, ElMessage, ElDropdown, ElDropdownMenu, ElDropdownItem, ElDialog, ElImage
} from 'element-plus'
import {
    faArrowLeft, faPlus, faShareAlt, faCog, faTrash, faPen, faCheckSquare, faTimes, faSpinner, faThLarge, faTh, faEye
} from '@fortawesome/free-solid-svg-icons'
import {
    requestGetAlbum, requestDeleteAlbum, requestUpdateAlbum, requestRemoveImagesFromAlbum, requestSetAlbumCover
} from '../../utils/request'
import type { Album, AlbumImage } from '../../utils/types'
import { useIntersectionObserver } from '@vueuse/core'
import { ElImageViewer } from 'element-plus'
import SearchInput from '../common/SearchInput.vue'
import BaseButton from '../common/BaseButton.vue'
import BaseDialog from '../common/BaseDialog.vue'
import LoadingOverlay from '../LoadingOverlay.vue'
import ShareDialog from './ShareAlbumDialog.vue'
import AddImagesDialog from './AddImagesToAlbumDialog.vue'

const router = useRouter()
const route = useRoute()
const { t } = useI18n()

const loading = ref(false)
const albumId = Number(route.params.id)
const album = ref<Album | null>(null)
const images = ref<AlbumImage[]>([])
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(20)

// Selection mode
const isSelectionMode = ref(false)
const selectedKeys = ref<Set<string>>(new Set())

const shareDialogVisible = ref(false)
const addImagesDialogVisible = ref(false)

// Big Image Mode
const isBigMode = ref(false)

// Image Preview
const previewVisible = ref(false)
const previewIndex = ref(0)
const previewList = computed(() => images.value.map(img => img.image_url))

const handlePreview = (index: number) => {
    previewIndex.value = index
    previewVisible.value = true
}

const hasMore = computed(() => images.value.length < total.value)
const loadMoreTrigger = ref<HTMLElement | null>(null)

const loadAlbum = async (isLoadMore = false) => {
    if (loading.value) return
    if (isLoadMore && !hasMore.value) return

    if (!isLoadMore) {
        currentPage.value = 1
        images.value = []
    }

    loading.value = true
    try {
        const res = await requestGetAlbum(albumId, {
            page: currentPage.value,
            limit: pageSize.value
        })
        album.value = res.album
        if (isLoadMore) {
            images.value = [...images.value, ...res.images]
        } else {
            images.value = res.images
        }
        total.value = res.total
    } catch (e) {
        ElMessage.error(t('common.error'))
        if (!isLoadMore) router.push('/albums')
    } finally {
        loading.value = false
    }
}

useIntersectionObserver(
    loadMoreTrigger,
    ([{ isIntersecting }]) => {
        if (isIntersecting && hasMore.value && !loading.value) {
            currentPage.value++
            loadAlbum(true)
        }
    }
)

const handleRefresh = () => {
    loadAlbum(false)
}

const goBack = () => {
    router.push('/albums')
}

// Edit Album Logic
// ... (Can reuse dialog from AlbumList or simple prompt)
const handleEdit = async () => {
    if (!album.value) return
    try {
        const { value: name } = await ElMessageBox.prompt(t('album.name'), t('album.edit'), {
            inputValue: album.value.name,
            inputPattern: /\S+/,
            inputErrorMessage: t('album.nameRequired')
        })

        await requestUpdateAlbum(albumId, { name, description: album.value.description || undefined })
        album.value.name = name
        ElMessage.success(t('album.updateSuccess'))
    } catch (e) { /* cancel */ }
}

const handleDeleteAlbum = async () => {
    try {
        await ElMessageBox.confirm(t('album.confirmDelete'), t('common.warning'), { type: 'warning' })
        await requestDeleteAlbum(albumId)
        ElMessage.success(t('album.deleteSuccess'))
        router.push('/albums')
    } catch (e) { /* cancel */ }
}

const handleOpenAddImages = () => {
    addImagesDialogVisible.value = true
}

const handleOpenShare = () => {
    shareDialogVisible.value = true
}

// Selection Logic
const toggleSelectionMode = () => {
    isSelectionMode.value = !isSelectionMode.value
    selectedKeys.value.clear()
}

const toggleSelect = (key: string) => {
    if (selectedKeys.value.has(key)) {
        selectedKeys.value.delete(key)
    } else {
        selectedKeys.value.add(key)
    }
}

const handleRemoveSelected = async () => {
    if (selectedKeys.value.size === 0) return
    try {
        await ElMessageBox.confirm(t('common.confirm'), t('album.removeImages'), { type: 'warning' })
        await requestRemoveImagesFromAlbum(albumId, Array.from(selectedKeys.value))
        ElMessage.success(t('common.success'))
        selectedKeys.value.clear()
        isSelectionMode.value = false
        handleRefresh()
    } catch (e) { /* error or cancel */ }
}

const handleSetCover = async () => {
    if (selectedKeys.value.size !== 1) {
        ElMessage.warning('Please select exactly one image')
        return
    }
    const key = Array.from(selectedKeys.value)[0]
    const img = images.value.find(i => i.image_key === key)
    if (!img) return

    try {
        await requestSetAlbumCover(albumId, img.image_url)
        ElMessage.success(t('album.updateSuccess'))
        if (album.value) album.value.cover_image = img.image_url
        isSelectionMode.value = false
        selectedKeys.value.clear()
    } catch (e) { /* error */ }
}

// Image mode toggle
const toggleMode = () => {
    isBigMode.value = !isBigMode.value
}

onMounted(() => {
    loadAlbum()
})
</script>

<template>
    <div class="mx-auto max-w-7xl my-8 px-4 sm:px-6 relative min-h-[60vh]">
        <LoadingOverlay :loading="loading" />
        <!-- Header -->
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div class="flex items-center gap-4">
                <BaseButton circle @click="goBack">
                    <font-awesome-icon :icon="faArrowLeft" />
                </BaseButton>
                <div>
                    <h1 class="text-2xl font-bold flex items-center gap-2">
                        {{ album?.name }}
                        <font-awesome-icon :icon="faPen"
                            class="text-xs text-gray-400 cursor-pointer hover:text-indigo-500" @click="handleEdit" />
                    </h1>
                    <p class="text-sm text-gray-500">{{ album?.description }}</p>
                </div>
            </div>

            <div class="flex items-center gap-2">
                <!-- Mode Toggle -->
                <BaseButton circle @click="toggleMode" :title="isBigMode ? 'Switch to Grid' : 'Switch to Big Image'">
                    <font-awesome-icon :icon="isBigMode ? faTh : faThLarge" />
                </BaseButton>

                <template v-if="isSelectionMode">
                    <span class="text-xs text-gray-500 mr-2">{{ selectedKeys.size }} selected</span>
                    <BaseButton type="danger" @click="handleRemoveSelected" :disabled="selectedKeys.size === 0">
                        {{ $t('album.removeImages') }}
                    </BaseButton>
                    <BaseButton type="indigo" @click="handleSetCover" :disabled="selectedKeys.size !== 1">
                        {{ $t('album.setCover') }}
                    </BaseButton>
                    <BaseButton circle @click="toggleSelectionMode">
                        <font-awesome-icon :icon="faTimes" />
                    </BaseButton>
                </template>
                <template v-else>
                    <BaseButton type="indigo" @click="toggleSelectionMode">
                        <font-awesome-icon :icon="faCheckSquare" class="mr-2" /> {{ $t('common.edit') }}
                    </BaseButton>
                    <BaseButton type="indigo" @click="handleOpenAddImages">
                        <font-awesome-icon :icon="faPlus" class="mr-2" /> {{ $t('album.addImages') }}
                    </BaseButton>
                    <BaseButton type="indigo" @click="handleOpenShare">
                        <font-awesome-icon :icon="faShareAlt" class="mr-2" /> {{ $t('album.share') }}
                    </BaseButton>
                    <el-dropdown trigger="click">
                        <BaseButton circle>
                            <font-awesome-icon :icon="faCog" />
                        </BaseButton>
                        <template #dropdown>
                            <el-dropdown-menu>
                                <el-dropdown-item class="text-red-500" @click="handleDeleteAlbum">
                                    <font-awesome-icon :icon="faTrash" class="mr-2" />{{ $t('common.delete') }}
                                </el-dropdown-item>
                            </el-dropdown-menu>
                        </template>
                    </el-dropdown>
                </template>
            </div>
        </div>

        <!-- Images -->
        <div class="flex-1">
            <div v-if="images.length > 0">
                <div class="grid gap-4 transition-all duration-300"
                    :class="isBigMode ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6'">
                    <div v-for="(img, index) in images" :key="img.image_key"
                        class="relative aspect-square rounded-xl overflow-hidden group cursor-pointer border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md transition-all"
                        :class="{ 'ring-2 ring-indigo-500': selectedKeys.has(img.image_key) }"
                        @click="isSelectionMode ? toggleSelect(img.image_key) : handlePreview(index)">
                        <el-image :src="img.image_url" fit="cover"
                            class="w-full h-full transition-transform duration-500 group-hover:scale-105"
                            loading="lazy" />
                        <div v-if="!isSelectionMode"
                            class="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <font-awesome-icon :icon="faEye" class="text-white text-2xl" />
                        </div>

                        <!-- Checkbox Overlay -->
                        <div v-if="isSelectionMode" class="absolute top-3 right-3 z-10">
                            <div class="w-6 h-6 rounded-full border-2 border-white flex items-center justify-center transition-colors shadow-sm"
                                :class="selectedKeys.has(img.image_key) ? 'bg-indigo-500 border-indigo-500' : 'bg-black/30 hover:bg-black/50'">
                                <font-awesome-icon v-if="selectedKeys.has(img.image_key)" :icon="faCheckSquare"
                                    class="text-white text-xs" />
                            </div>
                        </div>
                    </div>
                </div>

                <div ref="loadMoreTrigger" class="h-10 flex items-center justify-center mt-4">
                    <div v-if="loading && images.length > 0" class="flex items-center gap-2 text-gray-400">
                        <font-awesome-icon :icon="faSpinner" spin />
                        <span class="text-sm">Loading...</span>
                    </div>
                </div>
            </div>
            <el-empty v-else :description="$t('album.empty')">
                <!-- <el-button type="primary">{{ $t('album.addImages') }}</el-button> -->
            </el-empty>
        </div>

        <!-- Share Dialog -->
        <ShareDialog v-if="album" v-model="shareDialogVisible" :album-id="album.id" :album-name="album.name" />

        <AddImagesDialog v-if="album" v-model="addImagesDialogVisible" :album-id="album.id" @success="handleRefresh" />

        <!-- Image Viewer -->
        <el-image-viewer v-if="previewVisible" :url-list="previewList" :initial-index="previewIndex"
            @close="previewVisible = false" />
    </div>
</template>
