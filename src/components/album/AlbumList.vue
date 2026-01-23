<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import {
    ElInput, ElButton, ElDialog, ElCard, ElEmpty, ElDropdown, ElDropdownMenu, ElDropdownItem,
    ElMessageBox, ElMessage
} from 'element-plus'
import {
    faPlus, faSearch, faFolder, faEllipsisVertical, faPen, faTrash, faTimes, faShareNodes, faRedo
} from '@fortawesome/free-solid-svg-icons'
import SearchInput from '../common/SearchInput.vue'
import BaseButton from '../common/BaseButton.vue'
import BaseDialog from '../common/BaseDialog.vue'
import BaseInput from '../common/BaseInput.vue'
import ShareDialog from '../ShareDialog.vue'
import LoadingOverlay from '../LoadingOverlay.vue'
import { requestListAlbums, requestCreateAlbum, requestDeleteAlbum, requestUpdateAlbum } from '../../utils/request'
import type { Album } from '../../utils/types'

const router = useRouter()
const { t } = useI18n()

const loading = ref(false)
const albums = ref<Album[]>([])
const searchQuery = ref('')

const dialogVisible = ref(false)
const dialogMode = ref<'create' | 'edit'>('create')
const currentAlbum = ref<Partial<Album>>({})
const formLoading = ref(false)

const shareDialogVisible = ref(false)
const shareTargetAlbum = ref<Album>()

const loadAlbums = async (keyword?: string) => {
    loading.value = true
    try {
        const res = await requestListAlbums(keyword)
        albums.value = res
    } catch (e) {
        // error handled in request.ts
    } finally {
        loading.value = false
    }
}

// Debounced search handler
let searchDebounceTimer: ReturnType<typeof setTimeout> | null = null
const handleSearch = () => {
    if (searchDebounceTimer) {
        clearTimeout(searchDebounceTimer)
    }
    searchDebounceTimer = setTimeout(() => {
        loadAlbums(searchQuery.value)
    }, 300)
}

// Watch search keyword changes
watch(searchQuery, () => {
    handleSearch()
})

const handleCreate = () => {
    dialogMode.value = 'create'
    currentAlbum.value = { name: '', description: '' }
    dialogVisible.value = true
}

const handleEdit = (album: Album) => {
    dialogMode.value = 'edit'
    currentAlbum.value = { ...album }
    dialogVisible.value = true
}

const handleSubmit = async () => {
    if (!currentAlbum.value.name) {
        ElMessage.warning(t('album.nameRequired'))
        return
    }

    formLoading.value = true
    try {
        if (dialogMode.value === 'create') {
            await requestCreateAlbum({
                name: currentAlbum.value.name,
                description: currentAlbum.value.description || undefined
            })
            ElMessage.success(t('album.createSuccess'))
        } else {
            await requestUpdateAlbum(currentAlbum.value.id!, {
                name: currentAlbum.value.name!,
                description: currentAlbum.value.description || undefined,
                coverImage: currentAlbum.value.cover_image || undefined
            })
            ElMessage.success(t('album.updateSuccess'))
        }
        dialogVisible.value = false
        loadAlbums()
    } catch (e) {
        // handled
    } finally {
        formLoading.value = false
    }
}

const handleDelete = async (album: Album) => {
    try {
        await ElMessageBox.confirm(
            t('album.confirmDelete'),
            t('common.warning'),
            { type: 'warning' }
        )
        await requestDeleteAlbum(album.id)
        ElMessage.success(t('album.deleteSuccess'))
        loadAlbums()
    } catch (e) {
        // cancel or error
    }
}

const handleShare = (album: Album) => {
    shareTargetAlbum.value = album
    shareDialogVisible.value = true
}

const goToAlbum = (id: number) => {
    router.push(`/albums/${id}`)
}

onMounted(() => {
    loadAlbums()
})
</script>

<template>
    <div class="mx-auto max-w-7xl my-8 px-4 sm:px-6 relative min-h-[60vh]">
        <LoadingOverlay :loading="loading" />
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100">{{ $t('album.title') }}</h1>
            <div class="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
                <SearchInput v-model="searchQuery" :placeholder="$t('common.search')" @search="handleSearch"
                    @clear="handleSearch" class="flex-1 sm:flex-initial" />

                <BaseButton @click="loadAlbums()" class="flex-shrink-0 !p-2 w-10 h-10 flex items-center justify-center">
                    <font-awesome-icon :icon="faRedo" :class="{ 'animate-spin': loading }" />
                </BaseButton>

                <BaseButton type="indigo" @click="handleCreate" class="flex-shrink-0">
                    <font-awesome-icon :icon="faPlus" />
                    <span class="hidden sm:inline ml-1">{{ $t('album.create') }}</span>
                    <span class="sm:hidden ml-1">{{ $t('common.add') }}</span>
                </BaseButton>
            </div>
        </div>
        <div>
            <div v-if="albums.length > 0"
                class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                <div v-for="album in albums" :key="album.id"
                    class="group relative bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all cursor-pointer border border-gray-100 dark:border-gray-700"
                    @click="goToAlbum(album.id)">
                    <!-- Cover Image -->
                    <div class="aspect-[4/3] bg-gray-100 dark:bg-gray-900 relative">
                        <!-- Share Badge -->
                        <div v-if="album.shareInfo && album.shareInfo.id"
                            class="absolute top-2 left-2 px-2 py-1 bg-black/50 backdrop-blur-sm rounded-lg text-white text-xs font-bold z-10 flex items-center gap-1">
                            <font-awesome-icon :icon="faShareNodes" class="text-[10px]" />
                            <span>{{ $t('album.shared') }}</span>
                        </div>

                        <img v-if="album.cover_image" :src="album.cover_image" class="w-full h-full object-cover" />
                        <div v-else
                            class="w-full h-full flex items-center justify-center text-gray-300 dark:text-gray-600">
                            <font-awesome-icon :icon="faFolder" class="text-6xl" />
                        </div>

                        <!-- Overlay Actions -->
                        <div class="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                            @click.stop>
                            <el-dropdown trigger="click">
                                <div
                                    class="w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 cursor-pointer">
                                    <font-awesome-icon :icon="faEllipsisVertical" />
                                </div>
                                <template #dropdown>
                                    <el-dropdown-menu>
                                        <el-dropdown-item @click="handleShare(album)">
                                            <font-awesome-icon :icon="faShareNodes" class="mr-2" />{{ album.shareInfo ?
                                                $t('album.shareTitle') : $t('album.share') }}
                                        </el-dropdown-item>
                                        <el-dropdown-item @click="handleEdit(album)">
                                            <font-awesome-icon :icon="faPen" class="mr-2" />{{ $t('common.edit') }}
                                        </el-dropdown-item>
                                        <el-dropdown-item class="text-red-500" @click="handleDelete(album)">
                                            <font-awesome-icon :icon="faTrash" class="mr-2" />{{ $t('common.delete') }}
                                        </el-dropdown-item>
                                    </el-dropdown-menu>
                                </template>
                            </el-dropdown>
                        </div>
                    </div>

                    <!-- Info -->
                    <div class="p-4">
                        <h3 class="font-medium text-lg truncate mb-1">{{ album.name }}</h3>
                        <p class="text-sm text-gray-500">{{ album.imageCount }} {{ $t('album.items') }}</p>
                    </div>
                </div>
            </div>
            <el-empty v-else :description="$t('album.empty')" />
        </div>
    </div>

    <!-- Create/Edit Dialog -->
    <BaseDialog v-model="dialogVisible" :title="dialogMode === 'create' ? $t('album.create') : $t('album.edit')"
        @confirm="handleSubmit" :loading="formLoading">
        <div class="space-y-4">
            <BaseInput v-model="currentAlbum.name" :label="$t('album.name')"
                :placeholder="$t('album.namePlaceholder')" />
            <BaseInput v-model="currentAlbum.description" type="textarea" :label="$t('album.description')"
                :placeholder="$t('album.descPlaceholder')" />
        </div>
    </BaseDialog>

    <!-- Share Dialog -->
    <ShareDialog v-if="shareTargetAlbum" v-model="shareDialogVisible" type="album" :album-id="shareTargetAlbum.id"
        :album-name="shareTargetAlbum.name" :cover-image="shareTargetAlbum.cover_image || undefined"
        :share-info="shareTargetAlbum.shareInfo" />

</template>
