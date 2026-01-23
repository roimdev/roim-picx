<template>
  <div
    class="group flex items-center gap-4 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700 hover:shadow-sm transition-all duration-200">
    <!-- Thumbnail -->
    <div
      class="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700">
      <el-image class="w-full h-full object-cover" :src="src" fit="cover" hide-on-click-modal lazy
        @error="imageError = true" :preview-src-list="[src]">
        <template #placeholder>
          <div class="w-full h-full flex items-center justify-center text-gray-300 dark:text-gray-600">
            <font-awesome-icon :icon="faImage" class="text-xl" />
          </div>
        </template>
      </el-image>
    </div>

    <!-- Info -->
    <div class="flex-1 min-w-0">
      <h4 class="text-sm font-medium text-gray-900 dark:text-gray-100 truncate mb-1" :title="name">
        {{ name }}
      </h4>
      <p v-if="originalName" class="text-xs text-gray-500 dark:text-gray-400 truncate mb-1" :title="originalName">
        {{ $t('manage.originalName') }}: {{ originalName }}
      </p>
      <div class="flex items-center gap-3 text-xs text-gray-400 dark:text-gray-500">
        <span class="bg-gray-50 dark:bg-gray-700 px-1.5 py-0.5 rounded text-gray-500 dark:text-gray-300">{{
          formatBytes(size) }}</span>
        <span v-if="uploadedAt">{{ new Date(uploadedAt).toLocaleDateString() }}</span>
        <span v-if="uploaderName" class="flex items-center gap-1"
          :title="$t('manage.uploaderLabel') + ': ' + uploaderName">
          <font-awesome-icon :icon="faUser" class="text-[10px]" />
          <span class="max-w-[100px] truncate">{{ uploaderName }}</span>
        </span>
      </div>
    </div>

    <!-- Actions -->
    <div class="flex items-center gap-2">
      <el-tooltip :content="$t('manage.rename')" placement="top" :show-after="500">
        <button
          class="w-8 h-8 rounded-full text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors flex items-center justify-center"
          @click.stop="emit('rename')">
          <font-awesome-icon :icon="faEdit" class="text-sm" />
        </button>
      </el-tooltip>

      <el-tooltip :content="$t('manage.preview')" placement="top" :show-after="500">
        <button
          class="w-8 h-8 rounded-full text-gray-400 dark:text-gray-500 hover:text-green-600 dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30 transition-colors flex items-center justify-center"
          @click.stop="emit('preview')">
          <font-awesome-icon :icon="faEye" class="text-sm" />
        </button>
      </el-tooltip>

      <el-tooltip :content="$t('manage.copyLink')" placement="top" :show-after="500">
        <button
          class="w-8 h-8 rounded-full text-gray-400 dark:text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors flex items-center justify-center"
          @click.stop="emit('copy')">
          <font-awesome-icon :icon="faLink" class="text-sm" />
        </button>
      </el-tooltip>

      <el-tooltip :content="$t('album.uploadTo')" placement="top" :show-after="500">
        <button
          class="w-8 h-8 rounded-full text-gray-400 dark:text-gray-500 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/30 transition-colors flex items-center justify-center"
          @click.stop="emit('addToAlbum')">
          <font-awesome-icon :icon="faFolderPlus" class="text-sm" />
        </button>
      </el-tooltip>

      <el-tooltip :content="$t('manage.share')" placement="top" :show-after="500">
        <button
          class="w-8 h-8 rounded-full text-gray-400 dark:text-gray-500 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/30 transition-colors flex items-center justify-center"
          @click.stop="emit('share')">
          <font-awesome-icon :icon="faShareAlt" class="text-sm" />
        </button>
      </el-tooltip>

      <el-popconfirm :title="$t('manage.confirmDeleteTitle')" :confirm-button-type="'danger'"
        :confirm-button-text="$t('manage.deleteShort')" :cancel-button-text="$t('manage.cancelShort')" width="160"
        @confirm="handleDelete">
        <template #reference>
          <button
            class="w-8 h-8 rounded-full text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors flex items-center justify-center"
            @click.stop>
            <font-awesome-icon :icon="faTrashAlt" class="text-sm" />
          </button>
        </template>
      </el-popconfirm>
    </div>
  </div>
</template>

<script setup lang="ts">
import { faTrashAlt, faLink, faImage, faEdit, faEye, faUser, faShareAlt, faFolderPlus } from '@fortawesome/free-solid-svg-icons'
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
  originalName?: string
  uploaderName?: string
}>()

const emit = defineEmits(['delete', 'copy', 'rename', 'preview', 'share', 'addToAlbum'])
const imageError = ref(false)

const handleDelete = () => {
  emit('delete')
}
</script>