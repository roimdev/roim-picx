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
    requestGetUploadConfig, requestUpdateUploadConfig,
    requestGetTokenExpire, requestUpdateTokenExpire
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

// Token Expiration
const tokenExpireDays = ref(7)
const tokenLoading = ref(false)

const loadTokenExpire = async () => {
    tokenLoading.value = true
    try {
        const res = await requestGetTokenExpire()
        tokenExpireDays.value = res.days
    } catch (e) {
        console.error('Failed to load token expire:', e)
    } finally {
        tokenLoading.value = false
    }
}

const saveTokenExpire = async () => {
    tokenLoading.value = true
    try {
        await requestUpdateTokenExpire(Number(tokenExpireDays.value))
        ElMessage.success(t('common.saveSuccess'))
    } catch (e) {
        console.error('Failed to save token expire:', e)
        ElMessage.error(t('common.saveFailed') || 'Save failed')
    } finally {
        tokenLoading.value = false
    }
}

defineExpose({
    loadSettings,
    init: () => {
        if (uploadConfig.value.length === 0) {
            loadSettings()
            loadTokenExpire()
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

    <el-card shadow="never" class="mt-4">
        <template #header>
            <div class="flex items-center justify-between">
                <span>{{ $t('admin.securitySettings') }}</span>
                <BaseButton type="indigo" @click="saveTokenExpire" size="sm" :loading="tokenLoading">
                    <font-awesome-icon :icon="faSave" class="mr-1" />
                    {{ $t('common.save') }}
                </BaseButton>
            </div>
        </template>
        <div v-loading="tokenLoading" class="flex items-center gap-4">
            <span class="text-sm text-gray-700 dark:text-gray-300">{{ $t('admin.tokenExpireDays') }}</span>
            <BaseInput type="number" v-model="tokenExpireDays" placeholder="7" class="!w-32" />
            <span class="text-xs text-gray-500">{{ $t('admin.tokenExpireHint') }}</span>
        </div>
    </el-card>
</template>
