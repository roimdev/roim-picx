<template>
    <div class="mx-auto max-w-7xl my-8 px-4 sm:px-6 relative min-h-[60vh]">
        <loading-overlay :loading="loading" />

        <div class="flex items-center justify-between mb-8">
            <div>
                <h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100">{{ $t('upload.title') }}</h1>
                <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    {{ $t('upload.subtitle', { limit: formatBytes(imageSizeLimit) }) }}
                </p>
            </div>
        </div>

        <!-- Path and Options -->
        <div
            class="mb-8 p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div>
                    <label class="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">{{
                        $t('upload.storageDir') }}</label>
                    <div class="relative group">
                        <font-awesome-icon :icon="faFolder"
                            class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 text-sm group-focus-within:text-indigo-500 transition-colors" />
                        <el-autocomplete v-model="customPath" :fetch-suggestions="querySearch" size="large"
                            :placeholder="$t('upload.storageDirPlaceholder')" class="!w-full custom-autocomplete"
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
                        {{ $t('upload.storageDirHint') }}<code
                            class="text-indigo-600 dark:text-indigo-400">2024/travel/</code>
                    </p>
                </div>

                <div>
                    <BaseSwitch v-model="keepName" :label="$t('upload.fileName')" />
                    <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">
                        {{ $t('upload.useOriginalName') }}
                    </p>
                </div>

                <div>
                    <BaseSwitch v-model="enableExpiry" :label="$t('upload.expiry')" />
                    <p class="mt-2 text-sm text-gray-500 dark:text-gray-400 mb-2">
                        {{ $t('upload.enableExpiry') }}
                    </p>
                    <transition name="el-fade-in">
                        <div v-if="enableExpiry" class="relative group mt-2">
                            <font-awesome-icon :icon="faClock"
                                class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 text-sm group-focus-within:text-indigo-500 transition-colors" />
                            <el-date-picker v-model="expireTime" type="datetime"
                                :placeholder="$t('upload.selectExpireTime')" format="YYYY-MM-DD HH:mm:ss"
                                :disabled-date="disabledDate" class="!w-full custom-date-picker" />
                        </div>
                    </transition>
                </div>

                <div>
                    <label class="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">{{
                        $t('upload.compression')
                    }}</label>
                    <CustomSelect v-model="compressionLevel" :options="compressionOptions"
                        @change="selectCompressionLevel">
                        <template #trigger="{ option }">
                            <div class="flex items-center gap-2 text-gray-700 dark:text-gray-200">
                                <font-awesome-icon :icon="faCompress" class="text-gray-400 dark:text-gray-500" />
                                <span class="font-medium">{{ option?.label }}</span>
                                <span class="text-gray-500 dark:text-gray-400 ml-2" v-if="option?.description">{{
                                    option.description }}</span>
                            </div>
                        </template>
                        <template #option="{ option, selected }">
                            <div class="flex items-center gap-3 w-full">
                                <div class="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0"
                                    :class="{
                                        'bg-gray-100 dark:bg-gray-700 text-gray-500': option.value === 'none',
                                        'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400': option.value === 'high',
                                        'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400': option.value === 'balanced',
                                        'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400': option.value === 'small'
                                    }">
                                    {{ option.value === 'none' ? '0' : option.value === 'high' ? 'H' : option.value ===
                                        'balanced' ? 'M' : 'S' }}
                                </div>
                                <div class="flex-1">
                                    <p class="text-sm font-medium text-gray-900 dark:text-gray-100">{{ option.label }}
                                    </p>
                                    <p class="text-xs text-gray-500 dark:text-gray-400">{{ option.description }}
                                        · {{ $t('upload.maxSize') }} {{ option.maxSizeMB }}MB</p>
                                </div>
                                <font-awesome-icon v-if="selected" :icon="faCheck"
                                    class="text-indigo-600 dark:text-indigo-400" />
                            </div>
                        </template>
                    </CustomSelect>

                </div>

                <!-- Album Selection -->
                <div>
                    <label class="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">{{
                        $t('album.uploadTo') }}</label>
                    <CustomSelect v-model="currentAlbumId" :options="albumOptions">
                        <template #trigger="{ option }">
                            <div class="flex items-center gap-2 text-gray-900 dark:text-gray-100">
                                <font-awesome-icon :icon="faImages" class="text-gray-400 dark:text-gray-500 text-sm" />
                                <span class="font-medium truncate">{{ option?.label }}</span>
                            </div>
                        </template>
                        <template #option="{ option, selected }">
                            <div class="flex items-center gap-3 w-full">
                                <div
                                    class="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-500 flex-shrink-0 overflow-hidden">
                                    <img v-if="option.cover_image" :src="option.cover_image"
                                        class="w-full h-full object-cover" />
                                    <font-awesome-icon v-else :icon="option.icon || faImages"
                                        :class="{ 'text-gray-400': !option.icon }" />
                                </div>
                                <div class="flex-1 min-w-0">
                                    <p class="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{{
                                        option.label }}</p>
                                </div>
                                <font-awesome-icon v-if="selected" :icon="faCheck"
                                    class="text-indigo-600 dark:text-indigo-400" />
                            </div>
                        </template>
                    </CustomSelect>
                </div>

                <!-- 存储平台选择 -->
                <div v-if="storageProviders.length > 1">
                    <label class="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">{{
                        $t('upload.storageProvider') ||
                        '存储平台' }}</label>
                    <CustomSelect v-model="selectedStorageType" :options="storageProviderOptions">
                        <template #trigger="{ option }">
                            <div class="flex items-center gap-2 text-gray-900 dark:text-gray-100">
                                <font-awesome-icon :icon="faDatabase"
                                    class="text-gray-400 dark:text-gray-500 text-sm" />
                                <span class="font-medium">{{ option?.label || selectedStorageType }}</span>
                            </div>
                        </template>
                        <template #option="{ option, selected }">
                            <div class="flex items-center gap-3 w-full">
                                <div class="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold"
                                    :class="{
                                        'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400': option.value === 'R2',
                                        'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400': option.value === 'HF'
                                    }">
                                    {{ option.value }}
                                </div>
                                <div class="flex-1">
                                    <p class="text-sm font-medium text-gray-900 dark:text-gray-100">{{ option.label }}
                                    </p>
                                </div>
                                <font-awesome-icon v-if="selected" :icon="faCheck"
                                    class="text-indigo-600 dark:text-indigo-400" />
                            </div>
                        </template>
                    </CustomSelect>
                </div>

                <div class="lg:col-span-2">
                    <BaseSwitch v-model="watermarkConfig.enabled" :label="$t('upload.watermark')" />
                    <p class="mt-2 text-sm text-gray-500 dark:text-gray-400 mb-3">
                        {{ $t('upload.enableWatermark') }}
                    </p>
                    <transition name="el-fade-in">
                        <div v-if="watermarkConfig.enabled" class="space-y-4 pl-1">
                            <div class="grid grid-cols-2 gap-4">
                                <BaseInput v-model="watermarkConfig.text" :label="$t('upload.watermarkText')"
                                    :placeholder="$t('upload.watermarkTextPlaceholder')" />
                                <div>
                                    <label class="block text-xs text-gray-500 dark:text-gray-400 mb-1">{{
                                        $t('upload.watermarkPosition') }}</label>
                                    <div class="relative">
                                        <CustomSelect v-model="watermarkConfig.position" :options="watermarkPositions"
                                            :placeholder="$t('upload.selectPosition')">
                                            <template #trigger="{ option }">
                                                <span class="flex items-center gap-2">
                                                    <span
                                                        class="w-5 h-5 bg-indigo-100 dark:bg-indigo-900/30 rounded text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-[10px]">
                                                        {{ option?.icon || '↘' }}
                                                    </span>
                                                    <span>{{ $t(`upload.position${option?.label}`) }}</span>
                                                </span>
                                            </template>
                                            <template #option="{ option, selected }">
                                                <div class="flex items-center gap-2 w-full">
                                                    <span
                                                        class="w-5 h-5 bg-gray-100 dark:bg-gray-700 rounded text-gray-600 dark:text-gray-400 flex items-center justify-center text-[10px]"
                                                        :class="{ 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400': selected }">
                                                        {{ option.icon }}
                                                    </span>
                                                    <span class="text-sm text-gray-700 dark:text-gray-300">{{
                                                        $t(`upload.position${option.label}`) }}</span>
                                                    <font-awesome-icon v-if="selected" :icon="faCheck"
                                                        class="ml-auto text-indigo-600 dark:text-indigo-400 text-xs" />
                                                </div>
                                            </template>
                                        </CustomSelect>
                                    </div>
                                </div>
                            </div>
                            <div class="grid grid-cols-2 gap-3">
                                <div>
                                    <label class="block text-xs text-gray-500 dark:text-gray-400 mb-1">{{
                                        $t('upload.watermarkOpacity') }} ({{ watermarkConfig.opacity }}%)</label>
                                    <input type="range" v-model.number="watermarkConfig.opacity" min="10" max="100"
                                        step="5"
                                        class="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-600" />
                                </div>
                                <div>
                                    <label class="block text-xs text-gray-500 dark:text-gray-400 mb-1">{{
                                        $t('upload.watermarkSize')
                                        }} ({{ watermarkConfig.fontSize }}%)</label>
                                    <input type="range" v-model.number="watermarkConfig.fontSize" min="1" max="10"
                                        step="1"
                                        class="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-600" />
                                </div>
                            </div>
                        </div>
                    </transition>
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
                            <h2 class="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">{{ $t('upload.dropzone')
                                }}</h2>
                            <p class="text-gray-500 dark:text-gray-400 max-w-xs mx-auto text-sm leading-relaxed">
                                {{ $t('upload.dropzoneHint') }}
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
                            {{ $t('upload.result') }}
                        </h3>
                        <button @click="imgResultList = []"
                            class="text-xs text-gray-400 hover:text-red-500 transition-colors">
                            {{ $t('common.clearAll') }}
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
                            <h3 class="text-sm font-bold text-indigo-950 dark:text-indigo-200">{{
                                $t('upload.pendingInfo') }}
                            </h3>
                            <span
                                class="text-[10px] bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300 px-2 py-0.5 rounded-full font-bold">
                                {{ $t('upload.count', { count: convertedImages.length }) }}
                            </span>
                        </div>
                        <div class="text-xs text-gray-500 dark:text-gray-400 space-y-2 mb-6">
                            <div class="flex justify-between">
                                <span>{{ $t('upload.originalSize') }}</span>
                                <span class="font-bold text-gray-900 dark:text-gray-100">{{
                                    formatBytes(originalTotalSize)
                                    }}</span>
                            </div>
                            <div v-if="compressionLevel !== 'none'" class="flex justify-between">
                                <span>{{ $t('upload.compressedSize') }}</span>
                                <span class="font-bold text-green-600 dark:text-green-400">{{
                                    formatBytes(imagesTotalSize)
                                    }}</span>
                            </div>
                            <div v-if="compressionLevel !== 'none' && compressionRatio < 1"
                                class="flex justify-between">
                                <span>{{ $t('upload.saved') }}</span>
                                <span class="font-bold text-indigo-600 dark:text-indigo-400">{{ Math.round((1 -
                                    compressionRatio) * 100) }}%</span>
                            </div>
                        </div>

                        <div class="flex flex-col gap-3">
                            <BaseButton type="indigo" block @click="uploadImages" :loading="loading"
                                :disabled="loading">
                                <font-awesome-icon v-if="!loading" :icon="faUpload" />
                                {{ $t('upload.uploadNow') }}
                            </BaseButton>
                            <BaseButton block @click="clearInput">
                                {{ $t('upload.clearSelection') }}
                            </BaseButton>
                        </div>
                    </div>

                    <div v-else
                        class="bg-gray-50 dark:bg-gray-800/50 border border-dashed border-gray-200 dark:border-gray-700 rounded-2xl p-8 text-center text-gray-400">
                        <font-awesome-icon :icon="faImages" class="text-3xl mb-3 opacity-20" />
                        <p class="text-xs">{{ $t('upload.noPending') }}</p>
                    </div>
                </div>
            </div>
        </div>
    </div>

</template>

<script setup lang="ts">
import { faImages, faTrashAlt, faCopy, faCheckSquare } from '@fortawesome/free-regular-svg-icons'
import { faUpload, faCloudUploadAlt, faFolder, faSpinner, faClock, faCompress, faChevronDown, faCheck, faDatabase } from '@fortawesome/free-solid-svg-icons'
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import LoadingOverlay from '../components/LoadingOverlay.vue'
import SearchInput from '../components/common/SearchInput.vue'
import BaseButton from '../components/common/BaseButton.vue'
import BaseInput from '../components/common/BaseInput.vue'
import BaseSwitch from '../components/common/BaseSwitch.vue'
import CustomSelect from '../components/common/CustomSelect.vue'
import formatBytes from '../utils/format-bytes'
import { ElNotification as elNotify } from 'element-plus'
import { requestUploadImages, requestListImages, requestAuthConfig, requestListAlbums, type StorageProvider } from '../utils/request'
import { useRouter } from 'vue-router'
import ImageBox from '../components/ImageBox.vue'
import ResultList from '../components/ResultList.vue'
import type { ConvertedImage, ImgItem, ImgReq, Album } from '../utils/types'
import { ElAutocomplete, ElCheckbox, ElDatePicker } from 'element-plus'
import { compressionLevels, compressImage, type CompressionLevel } from '../utils/compress'
import { applyWatermark, defaultWatermarkConfig, type WatermarkConfig } from '../utils/watermark'
const { t, tm } = useI18n()

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
const watermarkConfig = ref<WatermarkConfig>({ ...defaultWatermarkConfig })

// Storage provider selection
// Storage provider selection
const storageProviders = ref<StorageProvider[]>([])
const selectedStorageType = ref<'R2' | 'HF'>('R2')
const currentStorageProvider = computed(() => storageProviders.value.find(p => p.type === selectedStorageType.value))

// Album selection
const albums = ref<Album[]>([])
const selectedAlbumId = ref<number | undefined>(undefined)

// Computed options for CustomSelect
const albumOptions = computed(() => {
    const opts = albums.value.map(a => ({
        label: a.name,
        value: a.id,
        cover_image: a.cover_image
    }))
    return [
        { label: t('common.default'), value: 'default', icon: faCloudUploadAlt }, // Special value for default
        ...opts
    ]
})

// Handle album selection logic
const currentAlbumId = computed({
    get: () => selectedAlbumId.value === undefined ? 'default' : selectedAlbumId.value,
    set: (val) => {
        selectedAlbumId.value = val === 'default' ? undefined : Number(val)
    }
})

const storageProviderOptions = computed(() => storageProviders.value.map(p => ({
    label: p.name,
    value: p.type
})))

const compressionOptions = computed(() => compressionLevels.map(l => ({
    label: t(l.label),
    value: l.value,
    description: t(l.description),
    maxSizeMB: l.maxSizeMB
})))

const currentAlbum = computed(() => albums.value.find(a => a.id === selectedAlbumId.value))

const selectStorageProvider = (type: string | number) => {
    selectedStorageType.value = type as 'R2' | 'HF'
}

// Watermark position options
const watermarkPositions = [
    { value: 'bottom-right', label: 'BottomRight', icon: '↘' },
    { value: 'bottom-left', label: 'BottomLeft', icon: '↙' },
    { value: 'bottom-center', label: 'BottomCenter', icon: '↓' },
    { value: 'top-right', label: 'TopRight', icon: '↗' },
    { value: 'top-left', label: 'TopLeft', icon: '↖' },
    { value: 'center', label: 'Center', icon: '◎' }
]

const getPositionIcon = (position: string) => {
    const pos = watermarkPositions.find(p => p.value === position)
    return pos?.icon || '↘'
}

const getPositionKey = (position: string) => {
    const pos = watermarkPositions.find(p => p.value === position)
    return pos?.label || 'BottomRight'
}

// Removed manual position selection logic as it is handled by v-model

const selectCompressionLevel = async (value: string) => {
    if (value === compressionLevel.value) {
        return
    }
    compressionLevel.value = value

    // Re-compress existing images with new level
    if (originalFiles.value.length > 0) {
        await recompressImages()
    }
}

// Close dropdown when clicking outside


const currentCompressionLevel = computed(() =>
    compressionLevels.find(l => l.value === compressionLevel.value) || compressionLevels[0]
)

const compressionRatio = computed(() => {
    if (originalTotalSize.value === 0) return 1
    return imagesTotalSize.value / originalTotalSize.value
})

// Re-compress all images with new compression level (and re-apply watermark)
const recompressImages = async () => {
    if (originalFiles.value.length === 0) return

    loading.value = true

    // Clean up old URLs
    convertedImages.value.forEach(item => URL.revokeObjectURL(item.tmpSrc))
    convertedImages.value = []

    // Re-compress each original file
    for (const file of originalFiles.value) {
        try {
            // Step 1: Compress
            const compressResult = await compressImage(file, currentCompressionLevel.value)

            // Step 2: Apply watermark
            const watermarkResult = await applyWatermark(compressResult.file, watermarkConfig.value)

            convertedImages.value = [
                ...convertedImages.value,
                {
                    file: watermarkResult.file,
                    tmpSrc: URL.createObjectURL(watermarkResult.file)
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

    fetchDirectories()
    // Fetch storage config
    requestAuthConfig().then(config => {
        if (config.storageProviders && config.storageProviders.length > 0) {
            storageProviders.value = config.storageProviders
            selectedStorageType.value = config.defaultStorage || 'R2'
        }
    }).catch(e => console.error('Failed to fetch auth config:', e))

    // Fetch albums
    requestListAlbums().then(res => {
        albums.value = res
    }).catch(e => { })
})

onUnmounted(() => {
    document.onpaste = null

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
                message: t('upload.fileTooLarge', { name: file.name }),
                type: 'error'
            })
            continue
        }

        if (!file.type.startsWith('image/')) {
            elNotify({
                message: t('upload.notImage', { name: file.name }),
                type: 'error'
            })
            continue
        }

        // Store original file for re-compression
        originalFiles.value = [...originalFiles.value, file]
        originalTotalSize.value += file.size

        // Compress image if compression is enabled, then apply watermark
        try {
            // Step 1: Compress
            const compressResult = await compressImage(file, currentCompressionLevel.value)

            // Step 2: Apply watermark
            const watermarkResult = await applyWatermark(compressResult.file, watermarkConfig.value)

            convertedImages.value = [
                ...convertedImages.value,
                {
                    file: watermarkResult.file,
                    tmpSrc: URL.createObjectURL(watermarkResult.file)
                }
            ]
        } catch (e) {
            console.error('Compression/watermark error:', e)
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
    // 添加存储类型
    formData.append('storageType', selectedStorageType.value)
    if (selectedAlbumId.value) {
        formData.append('albumId', selectedAlbumId.value.toString())
    }
    for (let item of convertedImages.value) {
        formData.append('files', item.file)
    }

    requestUploadImages(formData)
        .then((res) => {
            elNotify({
                title: t('upload.uploadComplete'),
                message: t('upload.uploadCompleteMsg', { count: convertedImages.value.length, size: formatBytes(imagesTotalSize.value) }),
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
