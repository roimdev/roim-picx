<template>
    <div class="relative group">
        <div class="border-2 border-dashed rounded-3xl p-12 text-center transition-all duration-300 cursor-pointer min-h-[340px] flex flex-col items-center justify-center bg-white dark:bg-gray-800"
            :class="isDragging ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/10' : 'border-gray-200 dark:border-gray-700 hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-gray-50 dark:hover:bg-gray-700/50'"
            @drop.prevent="onFileDrop" @dragover.prevent="isDragging = true" @dragleave.prevent="isDragging = false"
            @click="convertedImages.length === 0 ? input?.click() : null">
            <input type="file" ref="input" multiple accept="image/*" class="hidden" @change="onInputChange" />

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
                    <div v-for="item in convertedImages" :key="item.tmpSrc" class="relative group/item" @click.stop>
                        <image-box :src="item.tmpSrc" :size="item.file.size" :name="item.file.name"
                            @delete="$emit('remove-image', item.tmpSrc)" mode="converted"
                            class="w-full h-full shadow-sm rounded-xl overflow-hidden group-hover/item:shadow-md transition-shadow" />
                    </div>
                </transition-group>
            </template>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { faCloudUploadAlt } from '@fortawesome/free-solid-svg-icons'
import ImageBox from '../ImageBox.vue'
import type { ConvertedImage } from '../../utils/types'

defineProps<{
    convertedImages: ConvertedImage[]
}>()

const emit = defineEmits<{
    (e: 'files-selected', files: FileList | null | undefined): void
    (e: 'remove-image', tmpSrc: string): void
}>()

const isDragging = ref(false)
const input = ref<HTMLInputElement>()

const onInputChange = () => {
    emit('files-selected', input.value?.files)
}

const onFileDrop = (e: DragEvent) => {
    isDragging.value = false
    emit('files-selected', e.dataTransfer?.files)
}
</script>
