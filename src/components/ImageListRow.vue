<template>
  <div
    class="group flex items-center gap-4 p-3 bg-white rounded-lg border border-gray-100 hover:shadow-sm transition-all duration-200">
    <!-- Thumbnail -->
    <div class="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-gray-50 border border-gray-100">
      <el-image class="w-full h-full object-cover" :src="src" fit="cover" hide-on-click-modal lazy
        @error="imageError = true" :preview-src-list="[src]">
        <template #placeholder>
          <div class="w-full h-full flex items-center justify-center text-gray-300">
            <font-awesome-icon :icon="faImage" class="text-xl" />
          </div>
        </template>
      </el-image>
    </div>

    <!-- Info -->
    <div class="flex-1 min-w-0">
      <h4 class="text-sm font-medium text-gray-900 truncate mb-1" :title="name">
        {{ name }}
      </h4>
      <div class="flex items-center gap-3 text-xs text-gray-400">
        <span class="bg-gray-50 px-1.5 py-0.5 rounded text-gray-500">{{ formatBytes(size) }}</span>
        <span v-if="uploadedAt">{{ new Date(uploadedAt).toLocaleDateString() }}</span>
      </div>
    </div>

    <!-- Actions -->
    <div class="flex items-center gap-2">
      <el-tooltip content="重命名" placement="top" :show-after="500">
        <button
          class="w-8 h-8 rounded-full text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors flex items-center justify-center"
          @click.stop="emit('rename')">
          <font-awesome-icon :icon="faEdit" class="text-sm" />
        </button>
      </el-tooltip>

      <el-tooltip content="预览" placement="top" :show-after="500">
        <button
          class="w-8 h-8 rounded-full text-gray-400 hover:text-green-600 hover:bg-green-50 transition-colors flex items-center justify-center"
          @click.stop="emit('preview')">
          <font-awesome-icon :icon="faEye" class="text-sm" />
        </button>
      </el-tooltip>

      <el-tooltip content="复制链接" placement="top" :show-after="500">
        <button
          class="w-8 h-8 rounded-full text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors flex items-center justify-center"
          @click.stop="emit('copy')">
          <font-awesome-icon :icon="faLink" class="text-sm" />
        </button>
      </el-tooltip>

      <el-popconfirm title="确认删除?" confirm-button-type="danger" confirm-button-text="删" cancel-button-text="取"
        width="160" @confirm="handleDelete">
        <template #reference>
          <button
            class="w-8 h-8 rounded-full text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors flex items-center justify-center"
            @click.stop>
            <font-awesome-icon :icon="faTrashAlt" class="text-sm" />
          </button>
        </template>
      </el-popconfirm>
    </div>
  </div>
</template>

<script setup lang="ts">
import { faTrashAlt, faLink, faImage, faEdit, faEye } from '@fortawesome/free-solid-svg-icons'
import copy from 'copy-to-clipboard'
import formatBytes from '../utils/format-bytes'
import { ElTooltip, ElPopconfirm, ElImage, ElMessage } from 'element-plus'
import { ref } from 'vue'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'

const props = defineProps<{
  src: string
  name: string
  size: number
  uploadedAt?: number
}>()

const emit = defineEmits(['delete', 'copy', 'rename', 'preview'])
const imageError = ref(false)

const handleDelete = () => {
  emit('delete')
}
</script>