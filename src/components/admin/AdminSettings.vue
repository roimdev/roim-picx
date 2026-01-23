<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { ElMessage, ElCard, ElTable, ElTableColumn } from 'element-plus'
import {
    faPlus, faSave, faTrash, faQuestionCircle
} from '@fortawesome/free-solid-svg-icons'
import BaseButton from '../common/BaseButton.vue'
import BaseInput from '../common/BaseInput.vue'
import {
    requestGetUploadConfig, requestUpdateUploadConfig
} from '../../utils/request'
import type { UploadConfigItem } from '../../utils/types'

const { t } = useI18n()

// 系统设置
const uploadConfig = ref<UploadConfigItem[]>([])
const configLoading = ref(false)

const loadSettings = async () => {
    configLoading.value = true
    try {
        uploadConfig.value = await requestGetUploadConfig()
    } catch (e) {
        console.error('Failed to load settings:', e)
    } finally {
        configLoading.value = false
    }
}

const saveSettings = async () => {
    configLoading.value = true
    try {
        await requestUpdateUploadConfig(uploadConfig.value)
        ElMessage.success(t('common.saveSuccess'))
    } catch (e) {
        console.error('Failed to save settings:', e)
    } finally {
        configLoading.value = false
    }
}

const addConfigItem = () => {
    uploadConfig.value.push({ type: '', ext: '' })
}

const removeConfigItem = (index: number) => {
    uploadConfig.value.splice(index, 1)
}

defineExpose({
    loadSettings,
    init: () => {
        if (uploadConfig.value.length === 0) {
            loadSettings()
        }
    }
})
</script>

<template>
    <el-card shadow="never">
        <template #header>
            <div class="flex items-center justify-between">
                <span>{{ $t('admin.uploadConfig') }}</span>
                <div class="flex gap-2">
                    <BaseButton @click="addConfigItem" size="sm">
                        <font-awesome-icon :icon="faPlus" class="mr-1" />
                        {{ $t('common.add') }}
                    </BaseButton>
                    <BaseButton type="indigo" @click="saveSettings" size="sm" :loading="configLoading">
                        <font-awesome-icon :icon="faSave" class="mr-1" />
                        {{ $t('common.save') }}
                    </BaseButton>
                </div>
            </div>
        </template>

        <div v-loading="configLoading">
            <el-table :data="uploadConfig" stripe style="width: 100%">
                <el-table-column :label="$t('admin.mimeType')" min-width="200">
                    <template #default="{ row }">
                        <BaseInput v-model="row.type" placeholder="e.g. image/png" />
                    </template>
                </el-table-column>
                <el-table-column :label="$t('admin.extension')" min-width="150">
                    <template #default="{ row }">
                        <BaseInput v-model="row.ext" placeholder="e.g. png" />
                    </template>
                </el-table-column>
                <el-table-column :label="$t('admin.actions')" width="100" align="center">
                    <template #default="{ $index }">
                        <BaseButton type="danger" circle size="sm" @click="removeConfigItem($index)">
                            <font-awesome-icon :icon="faTrash" />
                        </BaseButton>
                    </template>
                </el-table-column>
            </el-table>
            <div class="mt-4 text-sm text-gray-500">
                <font-awesome-icon :icon="faQuestionCircle" class="mr-1" />
                {{ $t('admin.uploadConfigHint') }}
            </div>
        </div>
    </el-card>
</template>
