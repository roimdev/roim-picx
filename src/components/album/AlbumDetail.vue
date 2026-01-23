<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import {
    ElButton, ElEmpty, ElPagination, ElMessageBox, ElMessage, ElDropdown, ElDropdownMenu, ElDropdownItem, ElDialog, ElImage
} from 'element-plus'
import {
    faArrowLeft, faPlus, faShareAlt, faCog, faTrash, faPen, faCheckSquare, faTimes
} from '@fortawesome/free-solid-svg-icons'
import {
    requestGetAlbum, requestDeleteAlbum, requestUpdateAlbum, requestRemoveImagesFromAlbum, requestSetAlbumCover
} from '../../utils/request'
import type { Album, AlbumImage } from '../../utils/types'
import ImageBox from '../ImageBox.vue'
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

const loadAlbum = async () => {
    loading.value = true
    try {
        const res = await requestGetAlbum(albumId, {
            page: currentPage.value,
            limit: pageSize.value
        })
        album.value = res.album
        images.value = res.images
        total.value = res.total
    } catch (e) {
        ElMessage.error(t('common.error'))
        router.push('/albums')
    } finally {
        loading.value = false
    }
}

const handlePageChange = (page: number) => {
    currentPage.value = page
    loadAlbum()
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
        loadAlbum()
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

// Add Images (Placeholder for now, usually needs a picker)
// For MV, maybe just show a message or link to upload page?
// "在上传图片的时候选择指定的相册" -> This means modification to Upload page.
// "用户可以选择已有的图片加入到相册" -> Needs a picker.
// Let's implement picker later.

onMounted(() => {
    loadAlbum()
})
</script>

<template>
    <div class="mx-auto max-w-7xl my-8 px-4 sm:px-6 relative min-h-[60vh]">
        <!-- Header -->
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div class="flex items-center gap-4">
                <el-button circle @click="goBack">
                    <font-awesome-icon :icon="faArrowLeft" />
                </el-button>
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
                <template v-if="isSelectionMode">
                    <span class="text-sm text-gray-500 mr-2">{{ selectedKeys.size }} selected</span>
                    <el-button type="danger" plain size="small" @click="handleRemoveSelected"
                        :disabled="selectedKeys.size === 0">
                        {{ $t('album.removeImages') }}
                    </el-button>
                    <el-button type="primary" plain size="small" @click="handleSetCover"
                        :disabled="selectedKeys.size !== 1">
                        {{ $t('album.setCover') }}
                    </el-button>
                    <el-button circle size="small" @click="toggleSelectionMode">
                        <font-awesome-icon :icon="faTimes" />
                    </el-button>
                </template>
                <template v-else>
                    <el-button type="primary" plain @click="toggleSelectionMode">
                        <font-awesome-icon :icon="faCheckSquare" class="mr-2" /> {{ $t('common.edit') }}
                    </el-button>
                    <el-button type="primary" @click="addImagesDialogVisible = true">
                        <font-awesome-icon :icon="faPlus" class="mr-2" /> {{ $t('album.addImages') }}
                    </el-button>
                    <el-button type="primary" @click="shareDialogVisible = true">
                        <font-awesome-icon :icon="faShareAlt" class="mr-2" /> {{ $t('album.share') }}
                    </el-button>
                    <el-dropdown trigger="click">
                        <el-button circle>
                            <font-awesome-icon :icon="faCog" />
                        </el-button>
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
        <div v-loading="loading" class="flex-1">
            <div v-if="images.length > 0">
                <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                    <div v-for="img in images" :key="img.image_key"
                        class="relative aspect-square rounded-lg overflow-hidden group cursor-pointer border border-gray-100 dark:border-gray-800"
                        :class="{ 'ring-2 ring-indigo-500': selectedKeys.has(img.image_key) }"
                        @click="isSelectionMode ? toggleSelect(img.image_key) : null">
                        <el-image :src="img.image_url" fit="cover"
                            class="w-full h-full transition-transform duration-300 group-hover:scale-105"
                            loading="lazy" />

                        <!-- Checkbox Overlay -->
                        <div v-if="isSelectionMode" class="absolute top-2 right-2 z-10">
                            <div class="w-5 h-5 rounded-full border-2 border-white flex items-center justify-center transition-colors"
                                :class="selectedKeys.has(img.image_key) ? 'bg-indigo-500 border-indigo-500' : 'bg-black/30 hover:bg-black/50'">
                                <font-awesome-icon v-if="selectedKeys.has(img.image_key)" :icon="faCheckSquare"
                                    class="text-white text-xs" />
                            </div>
                        </div>
                    </div>
                </div>

                <div class="mt-6 flex justify-center">
                    <el-pagination background layout="prev, pager, next" :total="total" :page-size="pageSize"
                        :current-page="currentPage" @current-change="handlePageChange" />
                </div>
            </div>
            <el-empty v-else :description="$t('album.empty')">
                <!-- <el-button type="primary">{{ $t('album.addImages') }}</el-button> -->
            </el-empty>
        </div>

        <!-- Share Dialog -->
        <ShareDialog v-if="album" v-model="shareDialogVisible" :album-id="album.id" :album-name="album.name" />

        <AddImagesDialog v-if="album" v-model="addImagesDialogVisible" :album-id="album.id" @success="loadAlbum" />
    </div>
</template>
