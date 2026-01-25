<template>
    <div class="mx-auto max-w-7xl my-8 px-4 sm:px-6 relative min-h-[60vh]">
        <loading-overlay :loading="loading" />

        <div class="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
            <div>
                <h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100">{{ $t('manage.title') }}</h1>
                <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    {{ $t('manage.uploadedCount', { count: uploadedImages.length, size: formatBytes(imagesTotalSize) })
                    }}
                </p>
            </div>
            <div class="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                <!-- Search Input -->
                <!-- Search Input -->
                <SearchInput v-model="searchKeyword" :placeholder="$t('manage.searchPlaceholder')" />


                <!-- View Toggle -->
                <div class="hidden sm:flex bg-gray-100 dark:bg-gray-800 p-1 rounded-lg mr-2">
                    <button
                        class="p-1.5 rounded-md transition-all duration-200 flex items-center justify-center w-8 h-8"
                        :class="viewMode === 'grid' ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'"
                        @click="viewMode = 'grid'" :title="$t('manage.gridView')">
                        <font-awesome-icon :icon="faThLarge" />
                    </button>
                    <button
                        class="p-1.5 rounded-md transition-all duration-200 flex items-center justify-center w-8 h-8"
                        :class="viewMode === 'list' ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'"
                        @click="viewMode = 'list'" :title="$t('manage.listView')">
                        <font-awesome-icon :icon="faList" />
                    </button>
                </div>

                <BaseButton @click="addFolder">
                    <div class="flex items-center gap-2">
                        <font-awesome-icon :icon="faFolderPlus" class="text-amber-500" />
                        <span class="hidden sm:inline">{{ $t('manage.newFolder') }}</span>
                        <span class="sm:hidden">{{ $t('manage.new') }}</span>
                    </div>
                </BaseButton>
                <BaseButton type="indigo" @click="listImages" :loading="loading">
                    <div class="flex items-center gap-2">
                        <font-awesome-icon v-if="!loading" :icon="faRedoAlt" />
                        <span class="hidden sm:inline">{{ $t('common.refresh') }}</span>
                    </div>
                </BaseButton>

            </div>
        </div>

        <!-- Breadcrumb Navigation -->
        <div class="mb-6" v-if="delimiter !== '/'">
            <nav class="flex items-center space-x-1 text-sm">
                <button @click="changeFolder('/')"
                    class="flex items-center gap-1 px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                    <font-awesome-icon :icon="faHome" class="text-xs" />
                    <span>{{ $t('manage.rootFolder') }}</span>
                </button>
                <template v-for="(segment, index) in breadcrumbSegments" :key="index">
                    <font-awesome-icon :icon="faChevronRight" class="text-gray-400 dark:text-gray-600 text-xs" />
                    <button v-if="index < breadcrumbSegments.length - 1" @click="navigateToBreadcrumb(index)"
                        class="px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                        {{ segment }}
                    </button>
                    <span v-else class="px-2 py-1 text-indigo-600 dark:text-indigo-400 font-medium">
                        {{ segment }}
                    </span>
                </template>
            </nav>
        </div>

        <!-- Folder Navigation -->
        <div class="mb-8" v-if="prefixes.length > 0">
            <h3 class="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">{{
                $t('manage.folderNav') }}</h3>
            <div class="flex items-center gap-3 flex-wrap">
                <div v-for="it in prefixes" :key="String(it)"
                    class="group px-4 py-2.5 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-md cursor-pointer transition-all duration-200 flex items-center gap-3 min-w-[120px]"
                    :class="{ 'ring-2 ring-indigo-500 ring-offset-2 dark:ring-offset-gray-900 border-transparent': delimiter === it }"
                    @click="changeFolder(String(it))">
                    <div
                        class="p-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 group-hover:bg-amber-100 dark:group-hover:bg-amber-900/30 text-amber-500 dark:text-amber-400 transition-colors">
                        <font-awesome-icon :icon="faFolder" class="text-lg" />
                    </div>
                    <span
                        class="font-medium text-gray-700 dark:text-gray-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        {{ it === '/' ? $t('manage.rootFolder') : String(it).replace("/", "") }}
                    </span>
                </div>
            </div>
        </div>

        <!-- Image List -->
        <div v-if="uploadedImages.length > 0">
            <h3
                class="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3 flex items-center justify-between">
                <span>{{ $t('manage.imageList') }}</span>
                <span
                    class="text-[10px] bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full text-gray-500 dark:text-gray-400">
                    {{ $t('manage.items', { count: uploadedImages.length }) }}
                </span>
            </h3>

            <!-- Grid View -->
            <div v-if="viewMode === 'grid'"
                class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                <transition-group name="el-fade-in-linear">
                    <div class="relative" v-for="item in uploadedImages" :key="item.url">
                        <ManageImageCard :item="item" @delete="deleteImage(item.key)" @rename="renameImage(item)"
                            @copy="showLinkDialog({ url: item.url, name: item.key })" @preview="showPreview(item.url)"
                            @share="showShareDialog(item)" @addToAlbum="showAddToAlbumDialog(item)"
                            @editTags="showEditTagsDialog(item)" class="w-full h-full" />
                    </div>
                </transition-group>
            </div>

            <!-- List View -->
            <div v-else class="flex flex-col gap-2">
                <transition-group name="el-fade-in-linear">
                    <image-list-row v-for="item in uploadedImages" :key="item.url" :src="item.url" :name="item.key"
                        :size="item.size" :uploaded-at="item.uploadedAt" :original-name="item.originalName"
                        :uploader-name="item.uploaderName" :tags="item.tags" @delete="deleteImage(item.key)"
                        @rename="renameImage(item)" @copy="showLinkDialog({ url: item.url, name: item.key })"
                        @preview="showPreview(item.url)" @share="showShareDialog(item)"
                        @addToAlbum="showAddToAlbumDialog(item)" @editTags="showEditTagsDialog(item)" />
                </transition-group>
            </div>

            <!-- Load More Sentinel & Indicator -->
            <div ref="loadMoreSentinel" class="py-8 flex flex-col items-center justify-center">
                <template v-if="loadingMore">
                    <div class="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                        <font-awesome-icon :icon="faSpinner" spin class="text-indigo-500 dark:text-indigo-400" />
                        <span>{{ $t('manage.loadingMore') }}</span>
                    </div>
                </template>
                <template v-else-if="hasMore">
                    <div class="text-gray-400 dark:text-gray-500 text-sm">{{ $t('manage.pullToLoad') }}</div>
                </template>
                <template v-else>
                    <div class="text-gray-400 dark:text-gray-500 text-sm">{{ $t('manage.allLoaded') }}</div>
                </template>
            </div>
        </div>

        <!-- Empty State -->
        <div v-else-if="!loading" class="py-20 text-center">
            <div
                class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 mb-4">
                <font-awesome-icon :icon="searchKeyword ? faSearch : faFolderOpen"
                    class="text-2xl text-gray-400 dark:text-gray-500" />
            </div>
            <h3 class="text-lg font-medium text-gray-900 dark:text-gray-100">{{ searchKeyword ?
                $t('manage.noSearchResult') :
                $t('manage.noImages') }}
            </h3>
            <p class="mt-1 text-gray-500 dark:text-gray-400">{{ searchKeyword ? $t('manage.tryOtherKeyword') :
                $t('manage.emptyFolder') }}</p>
            <button v-if="searchKeyword" @click="searchKeyword = ''"
                class="mt-4 text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-medium transition-colors">
                {{ $t('manage.clearSearch') }}
            </button>
        </div>

        <link-format-dialog v-model="linkDialogVisible" :url="currentLinkImage.url" :name="currentLinkImage.name" />

        <!-- Share Dialog -->
        <share-dialog v-model="shareDialogVisible" type="image" :image-key="currentShareImage.key"
            :image-url="currentShareImage.url" :image-name="currentShareImage.name"
            :image-size="currentShareImage.size" />

        <AddToAlbumDialog v-model="addToAlbumDialogVisible" :image-keys="currentAddToAlbumImages.keys"
            :image-urls="currentAddToAlbumImages.urls" />

        <!-- Edit Tags Dialog -->
        <EditTagsDialog v-model="editTagsDialogVisible" :image-key="currentEditTagsImage.key"
            :image-url="currentEditTagsImage.url" :tags="currentEditTagsImage.tags" @updated="handleTagsUpdated" />

        <!-- Rename Dialog -->
        <BaseDialog v-model="renameDialogVisible" :title="$t('manage.renameImage')" width="400px"
            @confirm="handleRenameConfirm" :loading="loading">
            <div class="py-2">
                <BaseInput v-model="renameValue" :label="$t('manage.renamePrompt')"
                    :placeholder="$t('manage.renamePrompt')" @keyup.enter="handleRenameConfirm" autofocus />
            </div>
        </BaseDialog>

        <!-- New Folder Dialog -->
        <BaseDialog v-model="folderDialogVisible" :title="$t('manage.newFolder')" width="400px"
            @confirm="handleAddFolderConfirm" :loading="loading">
            <div class="py-2">
                <BaseInput v-model="folderNameValue" :label="$t('manage.folderNamePrompt')"
                    :placeholder="$t('manage.folderNamePrompt')" @keyup.enter="handleAddFolderConfirm" autofocus />
            </div>
        </BaseDialog>

        <!-- Image Preview -->
        <el-image-viewer v-if="previewVisible" :url-list="[previewUrl]" @close="closePreview" hide-on-click-modal />
    </div>
</template>

<script setup lang="ts">
import { requestListImages, requestDeleteImage, createFolder, requestRenameImage } from '../utils/request'
import formatBytes from '../utils/format-bytes'
import type { ImgItem, ImgReq, Folder } from '../utils/types'
import { ElImageViewer } from 'element-plus'
import { ref, onMounted, onUnmounted, computed, watch, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import {
    ElMessage, ElDialog, ElButton, ElInput, ElDropdown, ElDropdownMenu, ElDropdownItem,
    ElBreadcrumb, ElBreadcrumbItem, ElMessageBox
} from 'element-plus'
import ManageImageCard from '../components/ManageImageCard.vue'
import ImageListRow from '../components/ImageListRow.vue'
import ShareDialog from '../components/ShareDialog.vue'
import AddToAlbumDialog from '../components/album/AddToAlbumDialog.vue'
import LinkFormatDialog from '../components/LinkFormatDialog.vue'
import EditTagsDialog from '../components/EditTagsDialog.vue'
import BaseDialog from '../components/common/BaseDialog.vue'
import BaseInput from '../components/common/BaseInput.vue'
import LoadingOverlay from '../components/LoadingOverlay.vue'
import SearchInput from '../components/common/SearchInput.vue'
import BaseButton from '../components/common/BaseButton.vue' // Import BaseButton
import {
    faSearch, faThLarge, faList, faFolderPlus, faRedoAlt, faHome, faChevronRight,
    faFolder, faCloudUploadAlt, faTimes, faSpinner, faFolderOpen
} from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
const { t } = useI18n()

const loading = ref(false)
const loadingMore = ref(false)
const delimiter = ref('/')
const viewMode = ref<'grid' | 'list'>('grid')
const searchKeyword = ref('')
const uploadedImages = ref<ImgItem[]>([])
const prefixes = ref<String[]>([])
const cursor = ref<string | undefined>(undefined)
const hasMore = ref(true)
const loadMoreSentinel = ref<HTMLElement | null>(null)
let observer: IntersectionObserver | null = null
const PAGE_SIZE = 20

const linkDialogVisible = ref(false)
const currentLinkImage = ref<{ url: string, name: string }>({ url: '', name: '' })

const showLinkDialog = (image: { url: string, name: string }) => {
    currentLinkImage.value = image
    linkDialogVisible.value = true
    currentLinkImage.value = image
    linkDialogVisible.value = true
}

// Share dialog state
const shareDialogVisible = ref(false)
const currentShareImage = ref<{ key: string, url: string, name: string, size: number }>({ key: '', url: '', name: '', size: 0 })

const showShareDialog = (item: ImgItem) => {
    currentShareImage.value = {
        key: item.key,
        url: item.url,
        name: item.key,
        size: item.size
    }
    shareDialogVisible.value = true
}

// Add to Album dialog state
const addToAlbumDialogVisible = ref(false)
const currentAddToAlbumImages = ref<{ keys: string[], urls: string[] }>({ keys: [], urls: [] })

const showAddToAlbumDialog = (item: ImgItem) => {
    currentAddToAlbumImages.value = {
        keys: [item.key],
        urls: [item.url]
    }
    addToAlbumDialogVisible.value = true
}

// Rename state
const renameDialogVisible = ref(false)
const renameValue = ref('')
const currentRenameItem = ref<ImgItem | null>(null)
const renamePathPrefix = ref('')
const oldFileName = ref('')

// Add Folder state
const folderDialogVisible = ref(false)
const folderNameValue = ref('')

// Edit Tags state
const editTagsDialogVisible = ref(false)
const currentEditTagsImage = ref<{ key: string, url: string, tags: string[] }>({ key: '', url: '', tags: [] })

const showEditTagsDialog = (item: ImgItem) => {
    currentEditTagsImage.value = {
        key: item.key,
        url: item.url,
        tags: item.tags || []
    }
    editTagsDialogVisible.value = true
}

const handleTagsUpdated = (data: { key: string, tags: string[] }) => {
    const index = uploadedImages.value.findIndex(img => img.key === data.key)
    if (index !== -1) {
        uploadedImages.value[index] = { ...uploadedImages.value[index], tags: data.tags }
    }
}

// Preview state
const previewVisible = ref(false)
const previewUrl = ref('')

const showPreview = (url: string) => {
    previewUrl.value = url
    previewVisible.value = true
}

const closePreview = () => {
    previewVisible.value = false
    previewUrl.value = ''
}

const imagesTotalSize = computed(() =>
    uploadedImages.value.reduce((total, item) => total + item.size, 0)
)

// Debounced search handler
let searchDebounceTimer: ReturnType<typeof setTimeout> | null = null
const handleSearch = () => {
    if (searchDebounceTimer) {
        clearTimeout(searchDebounceTimer)
    }
    searchDebounceTimer = setTimeout(() => {
        listImages()
    }, 300)
}

// Watch search keyword changes
watch(searchKeyword, () => {
    handleSearch()
})

// Breadcrumb navigation
const breadcrumbSegments = computed(() => {
    if (delimiter.value === '/') return []
    // Remove trailing slash and split
    const path = delimiter.value.replace(/\/$/, '')
    return path.split('/').filter(s => s.length > 0)
})

const navigateToBreadcrumb = (index: number) => {
    const segments = breadcrumbSegments.value.slice(0, index + 1)
    const newPath = segments.join('/') + '/'
    changeFolder(newPath)
}

const changeFolder = (path: string) => {
    console.log(path)
    delimiter.value = path
    listImages()
}
const addFolder = () => {
    folderNameValue.value = ''
    folderDialogVisible.value = true
}

const handleAddFolderConfirm = async () => {
    if (!folderNameValue.value) {
        folderDialogVisible.value = false
        return
    }

    // Basic validation
    if (!/^[A-Za-z0-9_-\u4e00-\u9fa5]+$/.test(folderNameValue.value)) {
        ElMessage.error(t('manage.invalidFolderName'))
        return
    }

    loading.value = true
    try {
        await createFolder(<Folder>{
            name: folderNameValue.value
        })
        ElMessage.success(t('manage.folderCreated'))
        folderDialogVisible.value = false
        listImages()
    } catch (err) {
        console.error(err)
    } finally {
        loading.value = false
    }
}
// Initial load - reset state and load first page
const listImages = () => {
    loading.value = true
    uploadedImages.value = []
    cursor.value = undefined
    hasMore.value = true

    const keyword = searchKeyword.value.trim()
    requestListImages(<ImgReq>{
        limit: PAGE_SIZE,
        delimiter: delimiter.value,
        keyword: keyword || undefined
    }).then((data) => {
        uploadedImages.value = data.list.filter((item) => item.size !== 0)
        cursor.value = data.cursor
        hasMore.value = data.next
        if (data.prefixes && data.prefixes.length) {
            prefixes.value = data.prefixes
            if (delimiter.value !== '/') {
                prefixes.value = ['/', ...data.prefixes]
            }
        } else {
            prefixes.value = ['/']
        }
    }).catch(() => { })
        .finally(() => {
            loading.value = false
        })
}

// Load more - append to existing list
const loadMore = () => {
    if (loadingMore.value || !hasMore.value || !cursor.value) return

    loadingMore.value = true
    const keyword = searchKeyword.value.trim()
    requestListImages(<ImgReq>{
        limit: PAGE_SIZE,
        delimiter: delimiter.value,
        cursor: cursor.value,
        keyword: keyword || undefined
    }).then((data) => {
        uploadedImages.value = [...uploadedImages.value, ...data.list]
        cursor.value = data.cursor
        hasMore.value = data.next
    }).catch(() => { })
        .finally(() => {
            loadingMore.value = false
        })
}

// Setup IntersectionObserver for infinite scroll
const setupObserver = () => {
    if (observer) {
        observer.disconnect()
    }
    if (!loadMoreSentinel.value) return

    observer = new IntersectionObserver(
        (entries) => {
            const entry = entries[0]
            if (entry.isIntersecting && hasMore.value && !loadingMore.value && !loading.value) {
                loadMore()
            }
        },
        {
            rootMargin: '100px',
            threshold: 0.1
        }
    )
    observer.observe(loadMoreSentinel.value)
}

// Watch for sentinel element to setup observer
watch(loadMoreSentinel, (newVal) => {
    if (newVal) {
        setupObserver()
    }
})

onMounted(() => {
    listImages()
    nextTick(() => {
        setupObserver()
    })
})

onUnmounted(() => {
    if (observer) {
        observer.disconnect()
    }
})

const deleteImage = (src: string) => {
    requestDeleteImage({
        keys: src
    }).then((res) => {
        uploadedImages.value = uploadedImages.value.filter((item) => item.key !== res)
    })
}

const renameImage = (item: ImgItem) => {
    // Extract filename from key
    const oldKey = item.key
    const pathParts = oldKey.split('/')
    const fileName = pathParts.pop() || ''
    const path = pathParts.join('/')

    currentRenameItem.value = item
    renameValue.value = fileName
    oldFileName.value = fileName
    renamePathPrefix.value = path ? path + '/' : ''
    renameDialogVisible.value = true
}

const handleRenameConfirm = async () => {
    if (!currentRenameItem.value || !renameValue.value || renameValue.value === oldFileName.value) {
        renameDialogVisible.value = false
        return
    }

    // Basic validation
    if (/[/\\:*?"<>|]/.test(renameValue.value)) {
        ElMessage.error(t('manage.invalidFileName'))
        return
    }

    loading.value = true
    const oldKey = currentRenameItem.value.key
    const newKey = renamePathPrefix.value + renameValue.value

    try {
        const res = await requestRenameImage({
            oldKey: oldKey,
            newKey: newKey
        }) as any

        if (res.code === 200 || res.newKey) {
            ElMessage.success(t('manage.renameSuccess'))
            // Update local list
            const index = uploadedImages.value.findIndex(img => img.key === oldKey)
            if (index !== -1) {
                const updatedItem = { ...uploadedImages.value[index] }
                updatedItem.key = res.data?.newKey || res.newKey || newKey
                updatedItem.url = updatedItem.url.replace(encodeURIComponent(oldKey), encodeURIComponent(updatedItem.key))
                    .replace(oldKey, updatedItem.key)
                uploadedImages.value[index] = updatedItem
            }
            renameDialogVisible.value = false
            listImages() // Refresh list to be sure
        } else {
            ElMessage.error(res.msg || t('manage.renameFailed'))
        }
    } catch (err) {
        console.error(err)
    } finally {
        loading.value = false
    }
}
</script>
