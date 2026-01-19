<template>
  <el-dialog
    v-model="visible"
    title="复制链接"
    width="90%"
    destroy-on-close
    :close-on-click-modal="false"
    class="rounded-xl overflow-hidden max-w-[500px]"
  >
    <div class="space-y-4">
      <div v-for="(format, key) in formats" :key="key" class="space-y-1">
        <label class="text-xs font-semibold text-gray-500 uppercase tracking-wider">{{ key }}</label>
        <div class="relative group">
          <input 
            type="text" 
            :value="format.value" 
            readonly 
            class="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all pr-10 cursor-pointer"
            @click="copyText(format.value)"
          />
          <div 
            class="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-indigo-600 cursor-pointer p-1 rounded-md hover:bg-white hover:shadow-sm transition-all"
            @click="copyText(format.value)"
          >
            <font-awesome-icon :icon="faCopy" />
          </div>
        </div>
      </div>
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { faCopy } from '@fortawesome/free-regular-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import copy from 'copy-to-clipboard'
import { ElMessage, ElDialog } from 'element-plus'

const props = defineProps<{
  modelValue: boolean
  url: string
  name: string
}>()

const emit = defineEmits(['update:modelValue'])

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const formats = computed(() => ({
  'URL': { value: props.url },
  'Markdown': { value: `![${props.name}](${props.url})` },
  'HTML': { value: `<img src="${props.url}" alt="${props.name}" />` },
  'BBCode': { value: `[img]${props.url}[/img]` }
}))

const copyText = (text: string) => {
  if (copy(text)) {
    ElMessage.success('复制成功')
  } else {
    ElMessage.error('复制失败')
  }
}
</script>

<style scoped>
:deep(.el-dialog) {
  border-radius: 12px;
}
:deep(.el-dialog__header) {
  margin-right: 0;
  padding: 20px 24px;
  border-bottom: 1px solid #f3f4f6;
}
:deep(.el-dialog__body) {
  padding: 24px;
}
</style>