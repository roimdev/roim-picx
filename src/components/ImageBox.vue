<template>
	<div
		class="group relative bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-all duration-300"
		v-if="!imageError"
	>
		<loading-overlay :loading="loading" />

		<!-- Image Area -->
		<div class="relative w-full aspect-[3/2] sm:aspect-square overflow-hidden bg-gray-50">
			<el-image
				class="block w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
				:src="src"
				fit="cover"
				hide-on-click-modal
				lazy
				@error="imageError = true"
				@load="loading = false"
				:preview-src-list="[src]"
			>
                <template #placeholder>
                    <div class="w-full h-full flex items-center justify-center text-gray-300">
                        <font-awesome-icon :icon="faImage" class="text-2xl" />
                    </div>
                </template>
            </el-image>

			<!-- Desktop Hover Overlay for Actions -->
			<div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 hidden sm:flex items-center justify-center gap-3 backdrop-blur-[2px]">
                <template v-if="mode === 'uploaded'">
                    <el-tooltip content="重命名" placement="top" :show-after="500">
                        <button 
                            class="w-10 h-10 rounded-full bg-white text-gray-700 hover:text-blue-600 hover:scale-110 transition-all flex items-center justify-center shadow-lg"
                            @click.stop="emit('rename')"
                        >
                            <font-awesome-icon :icon="faEdit" />
                        </button>
                    </el-tooltip>

                    <el-tooltip content="复制链接" placement="top" :show-after="500">
                        <button 
                            class="w-10 h-10 rounded-full bg-white text-gray-700 hover:text-indigo-600 hover:scale-110 transition-all flex items-center justify-center shadow-lg"
                            @click.stop="emit('copy')"
                        >
                            <font-awesome-icon :icon="faLink" />
                        </button>
                    </el-tooltip>
                    
                    <el-popconfirm
                        title="确认删除这张图片吗？"
                        confirm-button-type="danger"
                        confirm-button-text="删除"
                        cancel-button-text="取消"
                        width="200"
                        @confirm="handleDelete"
                    >
                        <template #reference>
                            <button 
                                class="w-10 h-10 rounded-full bg-white text-gray-700 hover:text-red-500 hover:scale-110 transition-all flex items-center justify-center shadow-lg"
                                @click.stop
                            >
                                <font-awesome-icon :icon="faTrashAlt" />
                            </button>
                        </template>
                    </el-popconfirm>
                </template>
                
                <div 
                    v-if="mode === 'converted'"
                    class="absolute top-2 right-2 w-8 h-8 rounded-full bg-red-500 text-white flex items-center justify-center cursor-pointer shadow-md hover:bg-red-600 transition-colors"
                    @click.stop="emit('delete')"
                >
                    <font-awesome-icon :icon="faTimes" />
                </div>
			</div>

            <!-- Mobile Actions (Always Visible) -->
            <div class="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/60 to-transparent flex sm:hidden items-center justify-end gap-3 z-10" v-if="mode === 'uploaded'">
                <button 
                    class="w-8 h-8 rounded-full bg-white/90 text-gray-700 active:bg-blue-50 active:text-blue-600 transition-all flex items-center justify-center shadow-lg backdrop-blur-sm"
                    @click.stop="emit('rename')"
                >
                    <font-awesome-icon :icon="faEdit" class="text-xs" />
                </button>

                <button 
                    class="w-8 h-8 rounded-full bg-white/90 text-gray-700 active:bg-indigo-50 active:text-indigo-600 transition-all flex items-center justify-center shadow-lg backdrop-blur-sm"
                    @click.stop="emit('copy')"
                >
                    <font-awesome-icon :icon="faLink" class="text-xs" />
                </button>
                
                <el-popconfirm
                    title="确认删除?"
                    confirm-button-type="danger"
                    confirm-button-text="删"
                    cancel-button-text="取"
                    width="160"
                    @confirm="handleDelete"
                >
                    <template #reference>
                        <button 
                            class="w-8 h-8 rounded-full bg-white/90 text-red-500 active:bg-red-50 transition-all flex items-center justify-center shadow-lg backdrop-blur-sm"
                            @click.stop
                        >
                            <font-awesome-icon :icon="faTrashAlt" class="text-xs" />
                        </button>
                    </template>
                </el-popconfirm>
            </div>

            <div 
                v-if="mode === 'converted'"
                class="absolute top-2 right-2 w-8 h-8 rounded-full bg-red-500 text-white flex sm:hidden items-center justify-center cursor-pointer shadow-md z-10"
                @click.stop="emit('delete')"
            >
                <font-awesome-icon :icon="faTimes" class="text-sm" />
            </div>
		</div>

		<!-- Info Footer -->
		<div class="p-3 bg-white">
			<div class="flex items-start justify-between gap-2">
				<div class="flex-1 min-w-0">
					<p class="text-sm font-medium text-gray-900 truncate" :title="name">
						{{ name }}
					</p>
					<div class="flex items-center gap-2 mt-1 text-xs text-gray-400">
						<span class="bg-gray-100 px-1.5 py-0.5 rounded text-gray-500">{{ formatBytes(size) }}</span>
						<span v-if="uploadedAt">{{ new Date(uploadedAt).toLocaleDateString() }}</span>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { faTrashAlt, faLink, faTimes, faImage, faEdit } from '@fortawesome/free-solid-svg-icons'
import copy from 'copy-to-clipboard'
import formatBytes from '../utils/format-bytes'
import {ElTooltip, ElPopconfirm, ElImage, ElMessage} from 'element-plus'
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
}>()
const emit = defineEmits(['delete', 'copy', 'rename'])

const imageError = ref(false)
const loading = ref(true)

const handleDelete = () => {
    loading.value = true
    emit('delete')
}
</script>
