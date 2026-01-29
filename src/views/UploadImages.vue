<template>
    <div class="mx-auto max-w-7xl my-8 px-4 sm:px-6 relative min-h-[60vh]">
        <loading-overlay :loading="loading" />

        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div>
                <h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100">{{ $t('upload.title') }}</h1>
                <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    {{ $t('upload.subtitle', { limit: formatBytes(imageSizeLimit) }) }}
                </p>
            </div>
            <button @click="isConfigCollapsed = !isConfigCollapsed"
                class="flex items-center shrink-0 gap-2 px-4 py-2 rounded-xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-all text-sm font-medium text-gray-600 dark:text-gray-300">
                <font-awesome-icon :icon="faCompress" :class="{ 'rotate-180': isConfigCollapsed }"
                    class="transition-transform duration-300" />
                {{ isConfigCollapsed ? $t('upload.showSettings') : $t('upload.hideSettings') }}
            </button>
        </div>

        <!-- Path and Options -->
        <transition name="el-zoom-in-top">
            <UploadConfig v-if="!isConfigCollapsed" v-model:customPath="customPath" v-model:keepName="keepName"
                v-model:enableExpiry="enableExpiry" v-model:expireTime="expireTime"
                v-model:compressionLevel="compressionLevel" v-model:currentAlbumId="currentAlbumId"
                v-model:uploadTags="uploadTags" v-model:selectedStorageType="selectedStorageType"
                :directory-suggestions="directorySuggestions" :disabled-date="disabledDate"
                :compression-options="compressionOptions" :album-options="albumOptions"
                :storage-providers="storageProviders" :storage-provider-options="storageProviderOptions"
                :watermark-config="watermarkConfig" :watermark-positions="watermarkPositions" />
        </transition>


        <div class="grid grid-cols-1 lg:grid-cols-4 gap-8">
            <div class="lg:col-span-3 space-y-6">
                <!-- Dropzone Area -->
                <UploadZone :converted-images="convertedImages" @files-selected="appendConvertedImages"
                    @remove-image="removeImage" />

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
                <UploadStats :converted-images="convertedImages" :original-total-size="originalTotalSize"
                    :images-total-size="imagesTotalSize" :compression-level="compressionLevel"
                    :compression-ratio="compressionRatio" :loading="loading" @upload="uploadImages"
                    @clear="clearInput" />
            </div>
        </div>
    </div>

</template>

<script setup lang="ts">
import { faImages, faCheckSquare } from '@fortawesome/free-regular-svg-icons'
import { faUpload, faCloudUploadAlt, faCompress, faFolder, faCheck, faDatabase } from '@fortawesome/free-solid-svg-icons'
import { computed, onMounted, onUnmounted, ref, shallowRef, markRaw, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import LoadingOverlay from '../components/LoadingOverlay.vue'
import UploadConfig from '../components/upload/UploadConfig.vue'
import UploadZone from '../components/upload/UploadZone.vue'
import UploadStats from '../components/upload/UploadStats.vue'
import formatBytes from '../utils/format-bytes'
import { ElNotification as elNotify } from 'element-plus'
import { requestUploadImages, requestListImages, requestAuthConfig, requestListAlbums, type StorageProvider } from '../utils/request'
import { useRouter } from 'vue-router'
import ResultList from '../components/ResultList.vue'
import type { ConvertedImage, ImgItem, ImgReq, Album } from '../utils/types'
import { compressionLevels, compressImage } from '../utils/compress'
import { applyWatermark, defaultWatermarkConfig, type WatermarkConfig } from '../utils/watermark'
import * as tf from '@tensorflow/tfjs'
import '@tensorflow/tfjs-backend-webgl'
import '@tensorflow/tfjs-backend-cpu'
import * as nsfwjs from 'nsfwjs'
const { t, tm } = useI18n()

const nsfwModel = shallowRef<nsfwjs.NSFWJS | null>(null)

const isConfigCollapsed = ref(true)
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
const directorySuggestions = ref<string[]>([])
const compressionLevel = ref('none')
const originalTotalSize = ref(0)
const watermarkConfig = ref<WatermarkConfig>({ ...defaultWatermarkConfig })
const uploadTags = ref<string[]>([])

const storageProviders = ref<StorageProvider[]>([])
const selectedStorageType = ref<'R2' | 'HF'>('R2')

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
        { label: t('common.none'), value: 'default', icon: faCloudUploadAlt }, // Special value for default
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


// Watermark position options
const watermarkPositions = [
    { value: 'bottom-right', label: 'BottomRight', icon: '↘' },
    { value: 'bottom-left', label: 'BottomLeft', icon: '↙' },
    { value: 'bottom-center', label: 'BottomCenter', icon: '↓' },
    { value: 'top-right', label: 'TopRight', icon: '↗' },
    { value: 'top-left', label: 'TopLeft', icon: '↖' },
    { value: 'center', label: 'Center', icon: '◎' }
]


// Removed manual position selection logic as it is handled by v-model

watch(compressionLevel, async (newVal, oldVal) => {
    if (newVal !== oldVal && originalFiles.value.length > 0) {
        await recompressImages()
    }
})

watch(watermarkConfig, async () => {
    if (originalFiles.value.length > 0) {
        await recompressImages()
    }
}, { deep: true })

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

const fetchDirectories = () => {
    requestListImages(<ImgReq>{
        limit: 100,
        delimiter: '/'
    }).then((data) => {
        if (data.prefixes && data.prefixes.length) {
            directorySuggestions.value = data.prefixes.map(prefix => String(prefix).replace(/\/$/, ''))
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

onMounted(async () => {
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

    // Load NSFW model with explicit backend initialization
    try {
        await tf.ready()
        // Try setting WebGL backend, fallback to CPU handled by TFJS
        await tf.setBackend('webgl').catch(() => tf.setBackend('cpu'))
        console.log('Current TF Backend:', tf.getBackend())
        
        const model = await nsfwjs.load()
        nsfwModel.value = markRaw(model)
        console.log('NSFW Model loaded')
    } catch (err) {
        console.error('Failed to load NSFW model:', err)
    }
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

            // Step 3: Check NSFW
            let nsfw = false
            let nsfwScore = 0
            if (nsfwModel.value) {
                const img = new Image()
                img.src = URL.createObjectURL(watermarkResult.file)
                await new Promise((resolve) => { img.onload = resolve })
                const predictions = await nsfwModel.value.classify(img)
                URL.revokeObjectURL(img.src)
                
                // Check if Porn or Hentai probability is high
                const highestProb = Math.max(...predictions.filter(p => p.className === 'Porn' || p.className === 'Hentai').map(p => p.probability))
                // console.log('NSFW Prediction:', predictions)
                if (highestProb > 0.6) {
                    nsfw = true
                    nsfwScore = highestProb
                    elNotify({
                        message: t('upload.nsfwDetected', { name: file.name }),
                        type: 'warning',
                        duration: 5000
                    })
                }
            }

            convertedImages.value = [
                ...convertedImages.value,
                {
                    file: watermarkResult.file,
                    tmpSrc: URL.createObjectURL(watermarkResult.file),
                    nsfw,
                    nsfwScore
                }
            ]
        } catch (e) {
            console.error('Compression/watermark/NSFW error:', e)
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
    if (uploadTags.value.length > 0) {
        formData.append('tags', uploadTags.value.join(','))
    }
    for (let item of convertedImages.value) {
        formData.append('files', item.file)
        formData.append('nsfw', item.nsfw ? 'true' : 'false')
        if (item.nsfwScore) {
            formData.append('nsfwScore', item.nsfwScore.toString())
        }
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
