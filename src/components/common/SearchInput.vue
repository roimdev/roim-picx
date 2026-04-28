<script setup lang="ts">
import { faSearch, faTimes } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { useI18n } from 'vue-i18n'

const props = defineProps<{
    modelValue: string
    placeholder?: string
}>()

const emit = defineEmits(['update:modelValue', 'search', 'clear'])
const { t } = useI18n()

const handleInput = (e: Event) => {
    const target = e.target as HTMLInputElement
    emit('update:modelValue', target.value)
}

const handleClear = () => {
    emit('update:modelValue', '')
    emit('clear')
}

const handleKeyup = (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
        emit('search')
    }
}
</script>

<template>
    <div class="relative w-full sm:w-auto">
        <font-awesome-icon :icon="faSearch"
            class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none" />
        <input :value="modelValue" type="text" :placeholder="placeholder || t('common.search')"
            class="pl-9 pr-8 py-2 w-full sm:w-56 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-200 placeholder-gray-400 focus:border-indigo-400 dark:focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900/30 focus:outline-none transition-all"
            @input="handleInput" @keyup="handleKeyup" />
        <button v-if="modelValue" @click="handleClear"
            class="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
            :title="t('common.clear')">
            <font-awesome-icon :icon="faTimes" class="text-sm" />
        </button>
    </div>
</template>
