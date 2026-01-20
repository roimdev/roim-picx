<template>
    <div class="group relative bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden hover:shadow-md transition-all duration-300"
        v-if="!imageError">
        <loading-overlay :loading="loading" />

        <!-- Image Area -->
        <div class="relative w-full aspect-[4/3] overflow-hidden bg-gray-50 dark:bg-gray-900">
            <el-image class="block w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                :src="src" fit="cover" hide-on-click-modal lazy @error="imageError = true" @load="loading = false"
                :preview-src-list="[src]">
                <template #placeholder>
                    <div class="w-full h-full flex items-center justify-center text-gray-300 dark:text-gray-600">
                        <font-awesome-icon :icon="faImage" class="text-2xl" />
                    </div>
                </template>
            </el-image>

            <!-- Desktop Hover Overlay for Actions -->
            <div
                class="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 hidden sm:flex flex-col items-center justify-center gap-2 backdrop-blur-[2px]">
                <template v-if="mode === 'uploaded'">
                    <!-- Row 1: Preview, Copy, Share -->
                    <div class="flex items-center gap-2">
                        <el-tooltip content="预览" placement="top" :show-after="500">
                            <button
                                class="w-9 h-9 rounded-full bg-white/95 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:text-green-600 dark:hover:text-green-400 hover:scale-110 transition-all flex items-center justify-center shadow-lg"
                                @click.stop="emit('preview')">
                                <font-awesome-icon :icon="faEye" class="text-sm" />
                            </button>
                        </el-tooltip>

                        <el-tooltip content="复制链接" placement="top" :show-after="500">
                            <button
                                class="w-9 h-9 rounded-full bg-white/95 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:text-indigo-600 dark:hover:text-indigo-400 hover:scale-110 transition-all flex items-center justify-center shadow-lg"
                                @click.stop="emit('copy')">
                                <font-awesome-icon :icon="faLink" class="text-sm" />
                            </button>
                        </el-tooltip>

                        <el-tooltip content="分享" placement="top" :show-after="500">
                            <button
                                class="w-9 h-9 rounded-full bg-white/95 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:text-purple-600 dark:hover:text-purple-400 hover:scale-110 transition-all flex items-center justify-center shadow-lg"
                                @click.stop="emit('share')">
                                <font-awesome-icon :icon="faShareAlt" class="text-sm" />
                            </button>
                        </el-tooltip>
                    </div>

                    <!-- Row 2: Rename, Delete -->
                    <div class="flex items-center gap-2">
                        <el-tooltip content="重命名" placement="bottom" :show-after="500">
                            <button
                                class="w-9 h-9 rounded-full bg-white/95 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:text-blue-600 dark:hover:text-blue-400 hover:scale-110 transition-all flex items-center justify-center shadow-lg"
                                @click.stop="emit('rename')">
                                <font-awesome-icon :icon="faEdit" class="text-sm" />
                            </button>
                        </el-tooltip>

                        <el-popconfirm title="确认删除这张图片吗？" confirm-button-type="danger" confirm-button-text="删除"
                            cancel-button-text="取消" width="200" @confirm="handleDelete">
                            <template #reference>
                                <button
                                    class="w-9 h-9 rounded-full bg-white/95 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:text-red-500 dark:hover:text-red-400 hover:scale-110 transition-all flex items-center justify-center shadow-lg"
                                    @click.stop>
                                    <font-awesome-icon :icon="faTrashAlt" class="text-sm" />
                                </button>
                            </template>
                        </el-popconfirm>
                    </div>
                </template>

                <div v-if="mode === 'converted'"
                    class="absolute top-2 right-2 w-8 h-8 rounded-full bg-red-500 text-white flex items-center justify-center cursor-pointer shadow-md hover:bg-red-600 transition-colors"
                    @click.stop="emit('delete')">
                    <font-awesome-icon :icon="faTimes" />
                </div>
            </div>

            <!-- Mobile Actions (Always Visible) -->
            <div class="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/60 to-transparent flex sm:hidden items-center justify-end gap-2 z-10"
                v-if="mode === 'uploaded'">
                <button
                    class="w-7 h-7 rounded-full bg-white/90 dark:bg-gray-700/90 text-gray-700 dark:text-gray-200 active:bg-green-50 dark:active:bg-green-900/30 active:text-green-600 dark:active:text-green-400 transition-all flex items-center justify-center shadow-lg backdrop-blur-sm"
                    @click.stop="emit('preview')">
                    <font-awesome-icon :icon="faEye" class="text-[10px]" />
                </button>

                <button
                    class="w-7 h-7 rounded-full bg-white/90 dark:bg-gray-700/90 text-gray-700 dark:text-gray-200 active:bg-indigo-50 dark:active:bg-indigo-900/30 active:text-indigo-600 dark:active:text-indigo-400 transition-all flex items-center justify-center shadow-lg backdrop-blur-sm"
                    @click.stop="emit('copy')">
                    <font-awesome-icon :icon="faLink" class="text-[10px]" />
                </button>

                <button
                    class="w-7 h-7 rounded-full bg-white/90 dark:bg-gray-700/90 text-gray-700 dark:text-gray-200 active:bg-purple-50 dark:active:bg-purple-900/30 active:text-purple-600 dark:active:text-purple-400 transition-all flex items-center justify-center shadow-lg backdrop-blur-sm"
                    @click.stop="emit('share')">
                    <font-awesome-icon :icon="faShareAlt" class="text-[10px]" />
                </button>

                <button
                    class="w-7 h-7 rounded-full bg-white/90 dark:bg-gray-700/90 text-gray-700 dark:text-gray-200 active:bg-blue-50 dark:active:bg-blue-900/30 active:text-blue-600 dark:active:text-blue-400 transition-all flex items-center justify-center shadow-lg backdrop-blur-sm"
                    @click.stop="emit('rename')">
                    <font-awesome-icon :icon="faEdit" class="text-[10px]" />
                </button>

                <el-popconfirm title="删除?" confirm-button-type="danger" confirm-button-text="删" cancel-button-text="取"
                    width="140" @confirm="handleDelete">
                    <template #reference>
                        <button
                            class="w-7 h-7 rounded-full bg-white/90 dark:bg-gray-700/90 text-red-500 dark:text-red-400 active:bg-red-50 dark:active:bg-red-900/30 transition-all flex items-center justify-center shadow-lg backdrop-blur-sm"
                            @click.stop>
                            <font-awesome-icon :icon="faTrashAlt" class="text-[10px]" />
                        </button>
                    </template>
                </el-popconfirm>
            </div>

            <div v-if="mode === 'converted'"
                class="absolute top-2 right-2 w-8 h-8 rounded-full bg-red-500 text-white flex sm:hidden items-center justify-center cursor-pointer shadow-md z-10"
                @click.stop="emit('delete')">
                <font-awesome-icon :icon="faTimes" class="text-sm" />
            </div>
        </div>

        <!-- Info Footer -->
        <div class="p-3 bg-white dark:bg-gray-800">
            <div class="flex items-start justify-between gap-2">
                <div class="flex-1 min-w-0">
                    <p class="text-sm font-medium text-gray-900 dark:text-gray-100 truncate" :title="name">
                        {{ name }}
                    </p>
                    <p v-if="originalName" class="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5"
                        :title="originalName">
                        原名: {{ originalName }}
                    </p>
                    <div class="flex items-center gap-2 mt-1 text-xs text-gray-400 dark:text-gray-500">
                        <span
                            class="bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded text-gray-500 dark:text-gray-300">{{
                                formatBytes(size) }}</span>
                        <span v-if="uploadedAt">{{ new Date(uploadedAt).toLocaleDateString() }}</span>
                        <span v-if="uploaderName" class="flex items-center gap-1" :title="'上传者: ' + uploaderName">
                            <font-awesome-icon :icon="faUser" class="text-[10px]" />
                            <span class="max-w-[80px] truncate">{{ uploaderName }}</span>
                        </span>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { faTrashAlt, faLink, faTimes, faImage, faEdit, faEye, faUser, faShareAlt } from '@fortawesome/free-solid-svg-icons'
import copy from 'copy-to-clipboard'
import formatBytes from '../utils/format-bytes'
import { ElTooltip, ElPopconfirm, ElImage, ElMessage } from 'element-plus'
import { ref } from 'vue'
import LoadingOverlay from '../components/LoadingOverlay.vue'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'

const props = defineProps<{
    src: string
    name: string
    size: number
    mode: 'converted' | 'uploaded'
    uploadedAt?: number
    expiresAt?: number
    originalName?: string
    uploaderName?: string
}>()
const emit = defineEmits(['delete', 'copy', 'rename', 'preview', 'share'])

const imageError = ref(false)
const loading = ref(true)

const handleDelete = () => {
    loading.value = true
    emit('delete')
}
</script>
