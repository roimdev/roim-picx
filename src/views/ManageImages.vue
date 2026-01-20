<template>
    <div class="mx-auto max-w-7xl my-8 px-4 sm:px-6 relative min-h-[60vh]">
        <loading-overlay :loading="loading" />

        <div class="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
            <div>
                <h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100">管理图片</h1>
                <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    已上传 <span class="font-medium text-gray-900 dark:text-gray-100">{{ uploadedImages.length }}</span> 张图片，
                    共占用 <span class="font-medium text-gray-900 dark:text-gray-100">{{ formatBytes(imagesTotalSize) }}</span>
                </p>
            </div>
            <div class="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                <!-- Search Input -->
                <div class="relative w-full sm:w-auto">
                    <font-awesome-icon :icon="faSearch" class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
                    <input
                        v-model="searchKeyword"
                        type="text"
                        placeholder="搜索图片..."
                        class="pl-9 pr-8 py-2 w-full sm:w-56 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-200 placeholder-gray-400 focus:border-indigo-400 dark:focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900/30 focus:outline-none transition-all"
                    />
                    <button
                        v-if="searchKeyword"
                        @click="searchKeyword = ''"
                        class="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                        title="清除搜索">
                        <font-awesome-icon :icon="faTimes" class="text-sm" />
                    </button>
                </div>

                <!-- View Toggle -->
                <div class="hidden sm:flex bg-gray-100 dark:bg-gray-800 p-1 rounded-lg mr-2">
                    <button
                        class="p-1.5 rounded-md transition-all duration-200 flex items-center justify-center w-8 h-8"
                        :class="viewMode === 'grid' ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'"
                        @click="viewMode = 'grid'" title="网格视图">
                        <font-awesome-icon :icon="faThLarge" />
                    </button>
                    <button
                        class="p-1.5 rounded-md transition-all duration-200 flex items-center justify-center w-8 h-8"
                        :class="viewMode === 'list' ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'"
                        @click="viewMode = 'list'" title="列表视图">
                        <font-awesome-icon :icon="faList" />
                    </button>
                </div>

                <button
                    class="px-4 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-indigo-600 dark:hover:text-indigo-400 font-medium transition-colors shadow-sm flex items-center gap-2"
                    @click="addFolder">
                    <font-awesome-icon :icon="faFolderPlus" class="text-amber-500" />
                    <span class="hidden sm:inline">新建目录</span>
                    <span class="sm:hidden">新建</span>
                </button>
                <button
                    class="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium transition-colors shadow-sm flex items-center gap-2"
                    @click="listImages">
                    <font-awesome-icon :icon="faRedoAlt" :spin="loading" />
                    <span class="hidden sm:inline">刷新</span>
                </button>
            </div>
        </div>

        <!-- Breadcrumb Navigation -->
        <div class="mb-6" v-if="delimiter !== '/'">
            <nav class="flex items-center space-x-1 text-sm">
                <button @click="changeFolder('/')"
                    class="flex items-center gap-1 px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                    <font-awesome-icon :icon="faHome" class="text-xs" />
                    <span>根目录</span>
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
            <h3 class="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">目录导航</h3>
            <div class="flex items-center gap-3 flex-wrap">
                <div v-for="it in prefixes" :key="String(it)"
                    class="group px-4 py-2.5 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-md cursor-pointer transition-all duration-200 flex items-center gap-3 min-w-[120px]"
                    :class="{ 'ring-2 ring-indigo-500 ring-offset-2 dark:ring-offset-gray-900 border-transparent': delimiter === it }"
                    @click="changeFolder(String(it))">
                    <div class="p-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 group-hover:bg-amber-100 dark:group-hover:bg-amber-900/30 text-amber-500 dark:text-amber-400 transition-colors">
                        <font-awesome-icon :icon="faFolder" class="text-lg" />
                    </div>
                    <span class="font-medium text-gray-700 dark:text-gray-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        {{ it === '/' ? '根目录' : String(it).replace("/", "") }}
                    </span>
                </div>
            </div>
        </div>

        <!-- Image List -->
        <div v-if="uploadedImages.length > 0">
            <h3
                class="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3 flex items-center justify-between">
                <span>图片列表</span>
                <span class="text-[10px] bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full text-gray-500 dark:text-gray-400">
                    {{ uploadedImages.length }} items
                </span>
            </h3>

            <!-- Grid View -->
            <div v-if="viewMode === 'grid'"
                class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6">
                <transition-group name="el-fade-in-linear">
                    <div class="relative" v-for="item in uploadedImages" :key="item.url">
                        <image-box :src="item.url" :name="item.key" :size="item.size" @delete="deleteImage(item.key)"
                            @rename="renameImage(item)" @copy="showLinkDialog({ url: item.url, name: item.key })"
                            @preview="showPreview(item.url)" mode="uploaded" :uploaded-at="item.uploadedAt"
                            :original-name="item.originalName"
                            class="w-full h-full" />
                    </div>
                </transition-group>
            </div>

            <!-- List View -->
            <div v-else class="flex flex-col gap-2">
                <transition-group name="el-fade-in-linear">
                    <image-list-row v-for="item in uploadedImages" :key="item.url" :src="item.url" :name="item.key"
                        :size="item.size" :uploaded-at="item.uploadedAt" :original-name="item.originalName"
                        @delete="deleteImage(item.key)"
                        @rename="renameImage(item)" @copy="showLinkDialog({ url: item.url, name: item.key })"
                        @preview="showPreview(item.url)" />
                </transition-group>
            </div>

            <!-- Load More Sentinel & Indicator -->
            <div ref="loadMoreSentinel" class="py-8 flex flex-col items-center justify-center">
                <template v-if="loadingMore">
                    <div class="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                        <font-awesome-icon :icon="faSpinner" spin class="text-indigo-500 dark:text-indigo-400" />
                        <span>加载更多图片...</span>
                    </div>
                </template>
                <template v-else-if="hasMore">
                    <div class="text-gray-400 dark:text-gray-500 text-sm">下拉加载更多</div>
                </template>
                <template v-else>
                    <div class="text-gray-400 dark:text-gray-500 text-sm">已加载全部图片</div>
                </template>
            </div>
        </div>

        <!-- Empty State -->
        <div v-else-if="!loading" class="py-20 text-center">
            <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 mb-4">
                <font-awesome-icon :icon="searchKeyword ? faSearch : faFolderOpen" class="text-2xl text-gray-400 dark:text-gray-500" />
            </div>
            <h3 class="text-lg font-medium text-gray-900 dark:text-gray-100">{{ searchKeyword ? '未找到匹配图片' : '暂无图片' }}</h3>
            <p class="mt-1 text-gray-500 dark:text-gray-400">{{ searchKeyword ? '尝试使用其他关键词搜索' : '该目录下没有图片文件' }}</p>
            <button v-if="searchKeyword" @click="searchKeyword = ''" class="mt-4 text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-medium transition-colors">
                清除搜索
            </button>
        </div>

        <link-format-dialog v-model="linkDialogVisible" :url="currentLinkImage.url" :name="currentLinkImage.name" />

        <!-- Image Preview -->
        <el-image-viewer v-if="previewVisible" :url-list="[previewUrl]" @close="closePreview" hide-on-click-modal />
    </div>
</template>

<script setup lang="ts">
import { requestListImages, requestDeleteImage, createFolder, requestRenameImage } from '../utils/request'
import LoadingOverlay from '../components/LoadingOverlay.vue'
import formatBytes from '../utils/format-bytes'
import { computed, onMounted, onUnmounted, ref, watch, nextTick } from 'vue'
import type { ImgItem, ImgReq, Folder } from '../utils/types'
import ImageBox from '../components/ImageBox.vue'
import ImageListRow from '../components/ImageListRow.vue'
import LinkFormatDialog from '../components/LinkFormatDialog.vue'
import { ElMessageBox, ElMessage, ElImageViewer } from 'element-plus'
import { faRedoAlt, faFolder, faFolderPlus, faFolderOpen, faThLarge, faList, faSpinner, faHome, faChevronRight, faSearch, faTimes } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";

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
    ElMessageBox.prompt('请输入目录名称（支持英文字母、数字、下划线和连字符）', '新增目录', {
        confirmButtonText: '创建',
        cancelButtonText: '取消',
        inputPattern: /^[A-Za-z0-9_-\u4e00-\u9fa5]+$/,
        inputErrorMessage: '无效的目录名称，仅支持中英文、数字、下划线和连字符',
    }).then(({ value }) => {
        loading.value = true
        createFolder(<Folder>{
            name: value
        }).then((res) => {
            console.log(res)
            ElMessage.success('文件夹创建成功')
            listImages()
        }).catch(() => {
            ElMessage.error('文件夹创建失败')
        }).finally(() => {
            loading.value = false
        })
    }).catch(() => { })
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
        uploadedImages.value = data.list
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
    const pathPrefix = path ? path + '/' : ''

    ElMessageBox.prompt('请输入新的文件名', '重命名图片', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        inputValue: fileName,
        inputPattern: /^[^/\\:*?"<>|]+$/,
        inputErrorMessage: '文件名包含非法字符'
    }).then(({ value }) => {
        if (value === fileName) return

        loading.value = true
        const newKey = pathPrefix + value

        requestRenameImage({
            oldKey: oldKey,
            newKey: newKey
        }).then((res: any) => {
            if (res.code === 200 || res.newKey) {
                ElMessage.success('重命名成功')
                // Update local list
                const index = uploadedImages.value.findIndex(img => img.key === oldKey)
                if (index !== -1) {
                    const updatedItem = { ...uploadedImages.value[index] }
                    updatedItem.key = res.data?.newKey || newKey
                    updatedItem.url = updatedItem.url.replace(encodeURIComponent(oldKey), encodeURIComponent(updatedItem.key))
                        .replace(oldKey, updatedItem.key) // Fallback for simple replace
                    uploadedImages.value[index] = updatedItem
                }
                listImages() // Refresh list to be sure
            } else {
                ElMessage.error(res.msg || '重命名失败')
            }
        }).catch((err) => {
            console.error(err)
            // ElMessage.error('重命名失败')
        }).finally(() => {
            loading.value = false
        })
    }).catch(() => { })
}
</script>
