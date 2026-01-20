<template>
    <div class="mx-auto max-w-7xl my-8 px-4 sm:px-6 relative min-h-[60vh]">
        <loading-overlay :loading="loading" />

        <div class="flex items-center justify-between mb-8">
            <div>
                <h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100">上传图片</h1>
                <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    支持拖拽、粘贴或点击上传，单张限制 {{ formatBytes(imageSizeLimit) }}
                </p>
            </div>
        </div>

        <!-- Path and Options -->
        <div
            class="mb-8 p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div>
                    <label class="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">储存目录</label>
                    <div class="relative group">
                        <font-awesome-icon :icon="faFolder"
                            class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 text-sm group-focus-within:text-indigo-500 transition-colors" />
                        <el-autocomplete v-model="customPath" :fetch-suggestions="querySearch" size="large"
                            placeholder="默认根目录 (例如: wallpaper/)" class="!w-full custom-autocomplete"
                            :trigger-on-focus="true" clearable>
                            <template #default="{ item }">
                                <div class="flex items-center gap-2">
                                    <font-awesome-icon :icon="faFolder" class="text-amber-500" />
                                    <span>{{ item.value }}</span>
                                </div>
                            </template>
                        </el-autocomplete>
                    </div>
                    <p class="mt-2 text-[11px] text-gray-400 dark:text-gray-500">
                        可以使用 "/" 分隔多级目录，例如: <code class="text-indigo-600 dark:text-indigo-400">2024/travel/</code>
                    </p>
                </div>

                <div>
                    <label class="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">文件命名</label>
                    <div class="flex items-center h-[46px]">
                        <label class="flex items-center gap-3 cursor-pointer group">
                            <div class="relative">
                                <input type="checkbox" v-model="keepName" class="sr-only peer" />
                                <div
                                    class="w-11 h-6 bg-gray-200 dark:bg-gray-700 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600">
                                </div>
                            </div>
                            <span
                                class="text-sm text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-gray-200 transition-colors">使用原文件名</span>
                        </label>
                    </div>
                </div>

                <div>
                    <label class="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">过期销毁</label>
                    <div class="space-y-3">
                        <label class="flex items-center gap-3 cursor-pointer group">
                            <div class="relative">
                                <input type="checkbox" v-model="enableExpiry" class="sr-only peer" />
                                <div
                                    class="w-11 h-6 bg-gray-200 dark:bg-gray-700 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600">
                                </div>
                            </div>
                            <span
                                class="text-sm text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-gray-200 transition-colors">开启过期自动删除</span>
                        </label>
                        <transition name="el-fade-in">
                            <div v-if="enableExpiry" class="relative group">
                                <font-awesome-icon :icon="faClock"
                                    class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 text-sm group-focus-within:text-indigo-500 transition-colors" />
                                <el-date-picker v-model="expireTime" type="datetime" placeholder="选择过期时间"
                                    format="YYYY-MM-DD HH:mm:ss" :disabled-date="disabledDate"
                                    class="!w-full custom-date-picker" />
                            </div>
                        </transition>
                    </div>
                </div>

                <div>
                    <label class="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">图片压缩</label>
                    <div class="relative" ref="compressionDropdownRef">
                        <button type="button" @click="compressionDropdownOpen = !compressionDropdownOpen"
                            class="w-full pl-10 pr-10 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-gray-100 hover:border-gray-300 dark:hover:border-gray-600 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all text-left flex items-center justify-between">
                            <font-awesome-icon :icon="faCompress"
                                class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 text-sm" />
                            <span class="flex-1">
                                <span class="font-medium">{{ currentCompressionLevel.label }}</span>
                                <span class="text-gray-500 dark:text-gray-400 ml-2">{{
                                    currentCompressionLevel.description }}</span>
                            </span>
                            <font-awesome-icon :icon="faChevronDown"
                                class="text-gray-400 text-xs transition-transform duration-200"
                                :class="{ 'rotate-180': compressionDropdownOpen }" />
                        </button>
                        <transition name="el-zoom-in-top">
                            <div v-if="compressionDropdownOpen"
                                class="absolute z-50 mt-2 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl overflow-hidden">
                                <div v-for="level in compressionLevels" :key="level.value"
                                    @click="selectCompressionLevel(level.value)"
                                    class="px-4 py-3 cursor-pointer transition-all hover:bg-indigo-50 dark:hover:bg-indigo-900/20 flex items-center gap-3"
                                    :class="{ 'bg-indigo-50 dark:bg-indigo-900/30': compressionLevel === level.value }">
                                    <div class="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold"
                                        :class="{
                                            'bg-gray-100 dark:bg-gray-700 text-gray-500': level.value === 'none',
                                            'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400': level.value === 'high',
                                            'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400': level.value === 'balanced',
                                            'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400': level.value === 'small'
                                        }">
                                        {{ level.value === 'none' ? '0' : level.value === 'high' ? 'H' : level.value ===
                                            'balanced' ?
                                            'M' : 'S' }}
                                    </div>
                                    <div class="flex-1">
                                        <p class="text-sm font-medium text-gray-900 dark:text-gray-100">{{ level.label
                                        }}</p>
                                        <p class="text-xs text-gray-500 dark:text-gray-400">{{ level.description }} · 最大
                                            {{
                                                level.maxSizeMB }}MB</p>
                                    </div>
                                    <font-awesome-icon v-if="compressionLevel === level.value" :icon="faCheck"
                                        class="text-indigo-600 dark:text-indigo-400" />
                                </div>
                            </div>
                        </transition>
                    </div>
                </div>
            </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-4 gap-8">
            <div class="lg:col-span-3 space-y-6">
                <!-- Dropzone Area -->
                <div class="relative group">
                    <div class="border-2 border-dashed rounded-3xl p-12 text-center transition-all duration-300 cursor-pointer min-h-[340px] flex flex-col items-center justify-center bg-white dark:bg-gray-800"
                        :class="isDragging ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/10' : 'border-gray-200 dark:border-gray-700 hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-gray-50 dark:hover:bg-gray-700/50'"
                        @drop.prevent="onFileDrop" @dragover.prevent="isDragging = true"
                        @dragleave.prevent="isDragging = false"
                        @click="convertedImages.length === 0 ? input?.click() : null">
                        <input type="file" ref="input" multiple accept="image/*" class="hidden"
                            @change="onInputChange" />

                        <template v-if="convertedImages.length === 0">
                            <div
                                class="w-20 h-20 mb-6 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                                <font-awesome-icon :icon="faCloudUploadAlt" class="text-4xl" />
                            </div>
                            <h2 class="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">点击或拖拽图片到这里</h2>
                            <p class="text-gray-500 dark:text-gray-400 max-w-xs mx-auto text-sm leading-relaxed">
                                支持单张或多张图片上传，最大支持 20MB，支持 JPG, PNG, GIF, WEBP, SVG 等格式
                            </p>
                        </template>
                        <template v-else>
                            <transition-group name="el-fade-in-linear" tag="div"
                                class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 w-full">
                                <div v-for="item in convertedImages" :key="item.tmpSrc" class="relative group/item">
                                    <image-box :src="item.tmpSrc" :size="item.file.size" :name="item.file.name"
                                        @delete="removeImage(item.tmpSrc)" mode="converted"
                                        class="w-full h-full shadow-sm rounded-xl overflow-hidden group-hover/item:shadow-md transition-shadow" />
                                </div>
                            </transition-group>
                        </template>
                    </div>
                </div>

                <!-- Result Area -->
                <div v-if="imgResultList.length > 0" class="mt-12 space-y-4">
                    <div class="flex items-center justify-between px-2">
                        <h3 class="text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                            <font-awesome-icon :icon="faCheckSquare" class="text-green-500" />
                            上传结果
                        </h3>
                        <button @click="imgResultList = []"
                            class="text-xs text-gray-400 hover:text-red-500 transition-colors">
                            清除全部
                        </button>
                    </div>
                    <result-list :image-list="imgResultList" />
                </div>
            </div>

            <!-- Side Actions -->
            <div class="lg:col-span-1">
                <div class="sticky top-24 space-y-6">
                    <div v-if="convertedImages.length > 0"
                        class="bg-indigo-50/50 dark:bg-indigo-900/10 rounded-2xl p-5 border border-indigo-100 dark:border-indigo-900/30">
                        <div class="flex items-center justify-between mb-4">
                            <h3 class="text-sm font-bold text-indigo-950 dark:text-indigo-200">待上传信息</h3>
                            <span
                                class="text-[10px] bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300 px-2 py-0.5 rounded-full font-bold">
                                {{ convertedImages.length }} 张
                            </span>
                        </div>
                        <div class="text-xs text-gray-500 dark:text-gray-400 space-y-2 mb-6">
                            <div class="flex justify-between">
                                <span>原始大小</span>
                                <span class="font-bold text-gray-900 dark:text-gray-100">{{
                                    formatBytes(originalTotalSize)
                                    }}</span>
                            </div>
                            <div v-if="compressionLevel !== 'none'" class="flex justify-between">
                                <span>压缩后</span>
                                <span class="font-bold text-green-600 dark:text-green-400">{{
                                    formatBytes(imagesTotalSize)
                                    }}</span>
                            </div>
                            <div v-if="compressionLevel !== 'none' && compressionRatio < 1"
                                class="flex justify-between">
                                <span>节省</span>
                                <span class="font-bold text-indigo-600 dark:text-indigo-400">{{ Math.round((1 -
                                    compressionRatio) * 100) }}%</span>
                            </div>
                        </div>
                        <div class="flex flex-col gap-3">
                            <button
                                class="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 dark:shadow-none transition-all hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2 disabled:opacity-50"
                                :disabled="loading" @click="uploadImages">
                                <font-awesome-icon :icon="faUpload" v-if="!loading" />
                                <font-awesome-icon :icon="faSpinner" spin v-else />
                                立即上传
                            </button>
                            <button
                                class="w-full py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl font-medium transition-all"
                                @click="clearInput">
                                清空选择
                            </button>
                        </div>
                    </div>

                    <div v-else
                        class="bg-gray-50 dark:bg-gray-800/50 border border-dashed border-gray-200 dark:border-gray-700 rounded-2xl p-8 text-center text-gray-400">
                        <font-awesome-icon :icon="faImages" class="text-3xl mb-3 opacity-20" />
                        <p class="text-xs">暂无待上传图片</p>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { faImages, faTrashAlt, faCopy, faCheckSquare } from '@fortawesome/free-regular-svg-icons'
import { faUpload, faCloudUploadAlt, faFolder, faSpinner, faClock, faCompress, faChevronDown, faCheck } from '@fortawesome/free-solid-svg-icons'
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import LoadingOverlay from '../components/LoadingOverlay.vue'
import formatBytes from '../utils/format-bytes'
import { ElNotification as elNotify } from 'element-plus'
import { requestUploadImages, requestListImages } from '../utils/request'
import { useRouter } from 'vue-router'
import ImageBox from '../components/ImageBox.vue'
import ResultList from '../components/ResultList.vue'
import type { ConvertedImage, ImgItem, ImgReq } from '../utils/types'
import { ElAutocomplete, ElCheckbox, ElDatePicker } from 'element-plus'
import { compressionLevels, compressImage, type CompressionLevel } from '../utils/compress'

const isDragging = ref(false)
const convertedImages = ref<ConvertedImage[]>([])
const originalFiles = ref<File[]>([]) // Store original files for re-compression
const imgResultList = ref<ImgItem[]>([])
const imagesTotalSize = computed(() =>
    convertedImages.value.reduce((total, item) => total + item.file.size, 0)
)

const imageSizeLimit = 20 * 1024 * 1024
const input = ref<HTMLInputElement>()
const loading = ref(false)
const router = useRouter()
const customPath = ref('')
const keepName = ref(false)
const enableExpiry = ref(false)
const expireTime = ref<Date>()
const directorySuggestions = ref<{ value: string }[]>([])
const compressionLevel = ref('none')
const originalTotalSize = ref(0)
const compressionDropdownOpen = ref(false)
const compressionDropdownRef = ref<HTMLElement | null>(null)

const selectCompressionLevel = async (value: string) => {
    if (value === compressionLevel.value) {
        compressionDropdownOpen.value = false
        return
    }
    compressionLevel.value = value
    compressionDropdownOpen.value = false

    // Re-compress existing images with new level
    if (originalFiles.value.length > 0) {
        await recompressImages()
    }
}

// Close dropdown when clicking outside
const handleClickOutside = (event: MouseEvent) => {
    if (compressionDropdownRef.value && !compressionDropdownRef.value.contains(event.target as Node)) {
        compressionDropdownOpen.value = false
    }
}

const currentCompressionLevel = computed(() =>
    compressionLevels.find(l => l.value === compressionLevel.value) || compressionLevels[0]
)

const compressionRatio = computed(() => {
    if (originalTotalSize.value === 0) return 1
    return imagesTotalSize.value / originalTotalSize.value
})

// Re-compress all images with new compression level
const recompressImages = async () => {
    if (originalFiles.value.length === 0) return

    loading.value = true

    // Clean up old URLs
    convertedImages.value.forEach(item => URL.revokeObjectURL(item.tmpSrc))
    convertedImages.value = []

    // Re-compress each original file
    for (const file of originalFiles.value) {
        try {
            const result = await compressImage(file, currentCompressionLevel.value)
            convertedImages.value = [
                ...convertedImages.value,
                {
                    file: result.file,
                    tmpSrc: URL.createObjectURL(result.file)
                }
            ]
        } catch (e) {
            console.error('Re-compression error:', e)
            convertedImages.value = [
                ...convertedImages.value,
                {
                    file,
                    tmpSrc: URL.createObjectURL(file)
                }
            ]
        }
    }

    loading.value = false
}

const disabledDate = (time: Date) => {
    return time.getTime() < Date.now()
}

const querySearch = (queryString: string, cb: any) => {
    const results = queryString
        ? directorySuggestions.value.filter(createFilter(queryString))
        : directorySuggestions.value
    cb(results)
}

const createFilter = (queryString: string) => {
    return (restaurant: { value: string }) => {
        return (restaurant.value.toLowerCase().indexOf(queryString.toLowerCase()) === 0)
    }
}

const fetchDirectories = () => {
    requestListImages(<ImgReq>{
        limit: 100,
        delimiter: '/'
    }).then((data) => {
        if (data.prefixes && data.prefixes.length) {
            directorySuggestions.value = data.prefixes.map(prefix => ({
                value: String(prefix).replace(/\/$/, '') // Remove trailing slash for display
            }))
        }
    }).catch(err => {
        console.error('Failed to fetch directories:', err)
    })
}

const onInputChange = () => {
    appendConvertedImages(input.value?.files)
}
const onFileDrop = (e: DragEvent) => {
    appendConvertedImages(e.dataTransfer?.files)
}
const onPaste = (e: ClipboardEvent) => {
    appendConvertedImages(e.clipboardData?.files)
}

onMounted(() => {
    document.onpaste = onPaste
    document.addEventListener('click', handleClickOutside)
    fetchDirectories()
})

onUnmounted(() => {
    document.onpaste = null
    document.removeEventListener('click', handleClickOutside)
    convertedImages.value.forEach((item) => URL.revokeObjectURL(item.tmpSrc))
})

const clearInput = () => {
    convertedImages.value.forEach(item => URL.revokeObjectURL(item.tmpSrc))
    convertedImages.value = []
    originalFiles.value = []
    originalTotalSize.value = 0
    imgResultList.value = []
    // Reset input to allow selecting the same file again
    if (input.value) {
        input.value.value = ''
    }
}

const appendConvertedImages = async (files: FileList | null | undefined) => {
    if (!files) return

    loading.value = true
    for (let i = 0; i < files.length; i++) {
        const file = files.item(i)
        if (!file) continue
        if (file.size > imageSizeLimit) {
            elNotify({
                message: `${file.name} 文件过大`,
                type: 'error'
            })
            continue
        }

        if (!file.type.startsWith('image/')) {
            elNotify({
                message: `${file.name} 不是图片文件`,
                type: 'error'
            })
            continue
        }

        // Store original file for re-compression
        originalFiles.value = [...originalFiles.value, file]
        originalTotalSize.value += file.size

        // Compress image if compression is enabled
        try {
            const result = await compressImage(file, currentCompressionLevel.value)
            convertedImages.value = [
                ...convertedImages.value,
                {
                    file: result.file,
                    tmpSrc: URL.createObjectURL(result.file)
                }
            ]
        } catch (e) {
            console.error('Compression error:', e)
            convertedImages.value = [
                ...convertedImages.value,
                {
                    file,
                    tmpSrc: URL.createObjectURL(file)
                }
            ]
        }
    }
    // Reset input to allow selecting the same file again
    if (input.value) {
        input.value.value = ''
    }
    loading.value = false
}

const removeImage = (tmpSrc: string) => {
    const index = convertedImages.value.findIndex(item => item.tmpSrc === tmpSrc)
    if (index !== -1) {
        // Get original file size for the removed image
        if (index < originalFiles.value.length) {
            const originalFile = originalFiles.value[index]
            originalTotalSize.value = Math.max(0, originalTotalSize.value - originalFile.size)
            originalFiles.value = originalFiles.value.filter((_, i) => i !== index)
        }
    }
    convertedImages.value = convertedImages.value.filter((item) => item.tmpSrc !== tmpSrc)
    URL.revokeObjectURL(tmpSrc)
}

const uploadImages = () => {
    loading.value = true

    const formData = new FormData()
    if (customPath.value) {
        formData.append('path', customPath.value)
    }
    if (keepName.value) {
        formData.append('keepName', 'true')
    }
    if (enableExpiry.value && expireTime.value) {
        formData.append('expireAt', expireTime.value.getTime().toString())
    }
    for (let item of convertedImages.value) {
        formData.append('files', item.file)
    }

    requestUploadImages(formData)
        .then((res) => {
            elNotify({
                title: '上传完成',
                message: `共 ${convertedImages.value.length} 张图片，${formatBytes(
                    imagesTotalSize.value
                )}`,
                type: 'success'
            })
            convertedImages.value = []
            imgResultList.value = res
            // console.log(res)
            // router.push('/')
        })
        .catch(() => { })
        .finally(() => {
            loading.value = false
        })
}
</script>

<style scoped>
.custom-date-picker :deep(.el-input__wrapper) {
    padding-left: 2.5rem;
    border-radius: 0.75rem;
    border: 1px solid #e5e7eb;
    background-color: #f9fafb;
    transition: all 0.2s;
}

.dark .custom-date-picker :deep(.el-input__wrapper) {
    border-color: #374151;
    background-color: #111827;
}

.custom-date-picker :deep(.el-input__wrapper:hover) {
    border-color: #d1d5db;
}

.dark .custom-date-picker :deep(.el-input__wrapper:hover) {
    border-color: #4b5563;
}

.custom-date-picker :deep(.el-input__wrapper.is-focus) {
    border-color: #6366f1;
    background-color: #ffffff;
    box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.1);
}

.dark .custom-date-picker :deep(.el-input__wrapper.is-focus) {
    border-color: #818cf8;
    background-color: #1f2937;
    box-shadow: 0 0 0 4px rgba(129, 140, 248, 0.1);
}

.custom-date-picker :deep(.el-input__inner) {
    color: #111827;
    font-size: 0.875rem;
}

.dark .custom-date-picker :deep(.el-input__inner) {
    color: #f3f4f6;
}

.custom-date-picker :deep(.el-input__inner::placeholder) {
    color: #9ca3af;
}

.dark .custom-date-picker :deep(.el-input__inner::placeholder) {
    color: #6b7280;
}
</style>
