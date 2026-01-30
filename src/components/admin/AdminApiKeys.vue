<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElMessage, ElMessageBox } from 'element-plus'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { faPlus, faTrash, faKey, faCopy, faClock, faCircleCheck, faCircleXmark } from '@fortawesome/free-solid-svg-icons'
import { requestApiKeys, requestCreateApiKey, requestRevokeApiKey } from '../../utils/request'
import type { ApiKey } from '../../utils/types'
import BaseButton from '../common/BaseButton.vue'
import BaseDialog from '../common/BaseDialog.vue'
import BaseInput from '../common/BaseInput.vue'

const { t } = useI18n()

const loading = ref(false)
const apiKeys = ref<ApiKey[]>([])
const showCreateDialog = ref(false)
const showSuccessDialog = ref(false)
const newKeyName = ref('')
const createdKey = ref<ApiKey | null>(null)
const showRevokeDialog = ref(false)
const keyToRevoke = ref<ApiKey | null>(null)

const loadApiKeys = async () => {
  loading.value = true
  try {
    apiKeys.value = await requestApiKeys()
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

const handleCreate = async () => {
  if (!newKeyName.value) {
    ElMessage.warning(t('admin.apiKeyNamePlaceholder'))
    return
  }

  try {
    const result = await requestCreateApiKey({ name: newKeyName.value })
    createdKey.value = result
    showCreateDialog.value = false
    showSuccessDialog.value = true
    newKeyName.value = ''
    loadApiKeys()
  } catch (e) {
    console.error(e)
  }
}

const handleRevoke = (key: ApiKey) => {
  keyToRevoke.value = key
  showRevokeDialog.value = true
}

const confirmRevoke = async () => {
  if (!keyToRevoke.value) return
  
  loading.value = true
  try {
    await requestRevokeApiKey(keyToRevoke.value.id)
    ElMessage.success(t('common.success'))
    showRevokeDialog.value = false
    loadApiKeys()
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

const copyToClipboard = (text: string) => {
  navigator.clipboard.writeText(text).then(() => {
    ElMessage.success(t('common.copied'))
  })
}

const formatDate = (date: string | null) => {
  if (!date) return '-'
  return new Date(date).toLocaleString()
}

onMounted(() => {
  loadApiKeys()
})
</script>

<template>
  <div class="space-y-6">
    <div class="flex justify-between items-center">
      <div class="title-section">
        <h3 class="text-lg font-bold">{{ t('admin.apiKeyManager') }}</h3>
        <p class="text-sm text-gray-500">管理您的个人访问令牌，用于第三方集成。</p>
      </div>
      <BaseButton type="primary" @click="showCreateDialog = true">
        <FontAwesomeIcon :icon="faPlus" class="mr-2" />
        {{ t('admin.apiKeyCreate') }}
      </BaseButton>
    </div>

    <div v-loading="loading" class="keys-list">
      <div v-if="apiKeys.length === 0 && !loading" class="flex flex-col items-center justify-center py-12 text-gray-400 space-y-4">
        <FontAwesomeIcon :icon="faKey" class="text-5xl opacity-20" />
        <p>{{ t('common.noData') }}</p>
      </div>

      <div v-else class="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
        <table class="w-full">
          <thead>
            <tr>
              <th class="text-left px-6 py-4 bg-gray-50 dark:bg-gray-800 text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200 dark:border-gray-800">{{ t('admin.apiKeyName') }}</th>
              <th class="text-left px-6 py-4 bg-gray-50 dark:bg-gray-800 text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200 dark:border-gray-800">{{ t('admin.apiKeyPrefix') }}</th>
              <th class="text-left px-6 py-4 bg-gray-50 dark:bg-gray-800 text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200 dark:border-gray-800">{{ t('admin.apiKeyCreated') }}</th>
              <th class="text-left px-6 py-4 bg-gray-50 dark:bg-gray-800 text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200 dark:border-gray-800">{{ t('admin.apiKeyLastUsed') }}</th>
              <th class="text-left px-6 py-4 bg-gray-50 dark:bg-gray-800 text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200 dark:border-gray-800">{{ t('admin.apiKeyStatus') }}</th>
              <th class="text-left px-6 py-4 bg-gray-50 dark:bg-gray-800 text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200 dark:border-gray-800">{{ t('admin.actions') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="key in apiKeys" :key="key.id">
              <td class="px-6 py-4 whitespace-nowrap border-b border-gray-100 dark:border-gray-800 font-medium text-gray-900 dark:text-gray-100">{{ key.name }}</td>
              <td class="px-6 py-4 whitespace-nowrap border-b border-gray-100 dark:border-gray-800"><code class="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded">{{ key.key_prefix }}...</code></td>
              <td class="px-6 py-4 whitespace-nowrap border-b border-gray-100 dark:border-gray-800 text-sm text-gray-500">{{ formatDate(key.created_at) }}</td>
              <td class="px-6 py-4 whitespace-nowrap border-b border-gray-100 dark:border-gray-800 text-sm text-gray-500">{{ formatDate(key.last_used_at) }}</td>
              <td class="px-6 py-4 whitespace-nowrap border-b border-gray-100 dark:border-gray-800">
                <span :class="[
                  'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
                  key.is_active ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-500' : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-500'
                ]">
                  <FontAwesomeIcon :icon="key.is_active ? faCircleCheck : faCircleXmark" class="mr-1" />
                  {{ key.is_active ? t('admin.apiKeyActive') : t('admin.apiKeyInactive') }}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap border-b border-gray-100 dark:border-gray-800">
                <BaseButton type="danger" size="sm" @click="handleRevoke(key)">
                  <FontAwesomeIcon :icon="faTrash" />
                </BaseButton>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Create Dialog -->
    <BaseDialog
      v-model="showCreateDialog"
      :title="t('admin.apiKeyCreate')"
      @confirm="handleCreate"
      @cancel="showCreateDialog = false"
    >
      <div class="py-4">
        <label class="block text-sm font-medium mb-2">{{ t('admin.apiKeyName') }}</label>
        <BaseInput
          v-model="newKeyName"
          :placeholder="t('admin.apiKeyNamePlaceholder')"
          @keyup.enter="handleCreate"
        />
      </div>
    </BaseDialog>

    <!-- Success Dialog (Display full key) -->
    <BaseDialog
      v-model="showSuccessDialog"
      :title="t('admin.apiKeyCreatedTitle')"
      :show-cancel="false"
      @confirm="showSuccessDialog = false"
    >
      <div class="py-4">
        <div class="p-4 bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 rounded mb-4">
          <p class="text-yellow-700 font-bold mb-1">{{ t('admin.apiKeyCreatedTitle') }}</p>
          <p class="text-sm text-yellow-600">{{ t('admin.apiKeyCreatedMsg') }}</p>
        </div>
        
        <div class="border border-dashed border-primary/30 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-between">
          <code class="text-lg text-primary">{{ createdKey?.key }}</code>
          <BaseButton type="secondary" size="sm" @click="copyToClipboard(createdKey?.key || '')">
            <FontAwesomeIcon :icon="faCopy" />
          </BaseButton>
        </div>
      </div>
    </BaseDialog>

    <!-- Revoke Confirmation Dialog -->
    <BaseDialog
      v-model="showRevokeDialog"
      :title="t('admin.apiKeyRevoke')"
      confirm-type="danger"
      :loading="loading"
      @confirm="confirmRevoke"
      @cancel="showRevokeDialog = false"
    >
      <div class="py-4 text-center">
        <div class="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <FontAwesomeIcon :icon="faTrash" class="text-2xl" />
        </div>
        <h4 class="text-lg font-bold mb-2">{{ t('admin.apiKeyRevokeConfirm') }}</h4>
        <p class="text-sm text-gray-500 dark:text-gray-400">
          {{ t('admin.apiKeyRevokeConfirm') }}
        </p>
      </div>
    </BaseDialog>
  </div>
</template>
