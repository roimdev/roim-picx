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
import BaseInput from '../common/BaseInput.vue'
import BaseButton from '../common/BaseButton.vue'
import BaseDialog from '../common/BaseDialog.vue'
import LoadingOverlay from '../LoadingOverlay.vue'
import ShareDialog from '../ShareDialog.vue'
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
const editDialogVisible = ref(false)
const deleteDialogVisible = ref(false)
const editForm = ref({ name: '', description: '' })

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
const handleEdit = () => {
    if (!album.value) return
    editForm.value = {
        name: album.value.name,
        description: album.value.description || ''
    }
    editDialogVisible.value = true
}

const handleSaveEdit = async () => {
    if (!editForm.value.name) {
        ElMessage.warning(t('album.nameRequired'))
        return
    }

    loading.value = true
    try {
        await requestUpdateAlbum(albumId, {
            name: editForm.value.name,
            description: editForm.value.description || undefined
        })
        if (album.value) {
            album.value.name = editForm.value.name
            album.value.description = editForm.value.description
        }
        ElMessage.success(t('album.updateSuccess'))
        editDialogVisible.value = false
    } catch (e) {
        // error handled
    } finally {
        loading.value = false
    }
}

const handleDeleteAlbum = () => {
    deleteDialogVisible.value = true
}

const confirmDeleteAlbum = async () => {
    loading.value = true
    try {
        await requestDeleteAlbum(albumId)
        ElMessage.success(t('album.deleteSuccess'))
        deleteDialogVisible.value = false
        router.push('/albums')
    } catch (e) {
        // error handled
    } finally {
        loading.value = false
    }
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
            <div class="flex items-center gap-3">
                <BaseButton circle @click="goBack" class="flex-shrink-0">
                    <font-awesome-icon :icon="faArrowLeft" />
                </BaseButton>
                <div class="min-w-0">
                    <h1
                        class="text-xl sm:text-2xl font-bold flex items-center gap-2 text-gray-900 dark:text-gray-100 mb-0.5">
                        <span class="truncate">{{ album?.name }}</span>
                        <font-awesome-icon :icon="faPen"
                            class="text-[10px] text-gray-400 cursor-pointer hover:text-indigo-500 flex-shrink-0"
                            @click="handleEdit" />
                    </h1>
                    <p class="text-xs sm:text-sm text-gray-500 truncate">{{ album?.description }}</p>
                </div>
            </div>

            <div class="flex items-center gap-2">
                <!-- Mode Toggle -->
                <BaseButton circle @click="toggleMode" :title="isBigMode ? 'Switch to Grid' : 'Switch to Big Image'">
                    <font-awesome-icon :icon="isBigMode ? faTh : faThLarge" />
                </BaseButton>

                <template v-if="isSelectionMode">
                    <div class="flex items-center gap-2 w-full sm:w-auto">
                        <span class="text-[10px] text-gray-500 mr-1 whitespace-nowrap">{{ selectedKeys.size }}
                            selected</span>
                        <BaseButton type="danger" @click="handleRemoveSelected" :disabled="selectedKeys.size === 0"
                            class="flex-1 sm:flex-initial">
                            <span class="hidden sm:inline">{{ $t('album.removeImages') }}</span>
                            <span class="sm:hidden">{{ $t('common.delete') }}</span>
                        </BaseButton>
                        <BaseButton type="indigo" @click="handleSetCover" :disabled="selectedKeys.size !== 1"
                            class="flex-1 sm:flex-initial">
                            <span class="hidden sm:inline">{{ $t('album.setCover') }}</span>
                            <span class="sm:hidden">{{ $t('common.save') }}</span>
                        </BaseButton>
                        <BaseButton circle @click="toggleSelectionMode" class="flex-shrink-0">
                            <font-awesome-icon :icon="faTimes" />
                        </BaseButton>
                    </div>
                </template>
                <template v-else>
                    <div class="flex items-center gap-2 w-full sm:w-auto">
                        <BaseButton type="indigo" @click="toggleSelectionMode" class="flex-1 sm:flex-initial">
                            <font-awesome-icon :icon="faCheckSquare" class="sm:mr-2" />
                            <span class="hidden sm:inline">{{ $t('common.edit') }}</span>
                        </BaseButton>
                        <BaseButton type="indigo" @click="handleOpenAddImages" class="flex-1 sm:flex-initial">
                            <font-awesome-icon :icon="faPlus" class="sm:mr-2" />
                            <span class="hidden sm:inline">{{ $t('album.addImages') }}</span>
                        </BaseButton>
                        <BaseButton type="indigo" @click="handleOpenShare" class="flex-1 sm:flex-initial">
                            <font-awesome-icon :icon="faShareAlt" class="sm:mr-2" />
                            <span class="hidden sm:inline">{{ $t('album.share') }}</span>
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
                    </div>
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
        <ShareDialog v-if="album" v-model="shareDialogVisible" type="album" :album-id="album.id"
            :album-name="album.name" :cover-image="album.cover_image" />

        <AddImagesDialog v-if="album" v-model="addImagesDialogVisible" :album-id="album.id" @success="handleRefresh" />

        <!-- Edit Dialog -->
        <BaseDialog v-model="editDialogVisible" :title="$t('album.edit')" @confirm="handleSaveEdit" :loading="loading">
            <div class="flex flex-col gap-4">
                <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{{ $t('album.name')
                        }}</label>
                    <BaseInput v-model="editForm.name" :placeholder="$t('album.namePlaceholder')" />
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{{
                        $t('album.description') }}</label>
                    <BaseInput v-model="editForm.description" type="textarea" :rows="3"
                        :placeholder="$t('album.descPlaceholder')" />
                </div>
            </div>
        </BaseDialog>

        <!-- Delete Confirmation Dialog -->
        <BaseDialog v-model="deleteDialogVisible" :title="$t('common.warning')" :confirm-text="$t('common.delete')"
            confirm-type="danger" @confirm="confirmDeleteAlbum" :loading="loading">
            <p class="text-gray-600 dark:text-gray-400">{{ $t('album.confirmDelete') }}</p>
        </BaseDialog>

        <!-- Image Viewer -->
        <el-image-viewer v-if="previewVisible" :url-list="previewList" :initial-index="previewIndex"
            @close="previewVisible = false" />
    </div>
</template>
