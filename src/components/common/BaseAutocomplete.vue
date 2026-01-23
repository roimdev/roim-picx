<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { faChevronDown, faTimes } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import BaseInput from './BaseInput.vue'

interface Props {
    modelValue: string
    suggestions: string[]
    placeholder?: string
    label?: string
    error?: string
    disabled?: boolean
    clearable?: boolean
}

const props = withDefaults(defineProps<Props>(), {
    clearable: false
})
const emit = defineEmits(['update:modelValue', 'select', 'change', 'clear'])

const isOpen = ref(false)
const containerRef = ref<HTMLElement | null>(null)
const highlightedIndex = ref(-1)

const filteredSuggestions = computed(() => {
    if (!props.modelValue) return props.suggestions
    const query = props.modelValue.toLowerCase()
    return props.suggestions.filter(s => s.toLowerCase().includes(query))
})

const showSuggestions = computed(() => {
    return isOpen.value && (filteredSuggestions.value.length > 0 || props.suggestions.length > 0)
})

const handleInput = (val: string | number | null | undefined) => {
    const stringVal = val?.toString() || ''
    emit('update:modelValue', stringVal)
    emit('change', stringVal)
    isOpen.value = true
    highlightedIndex.value = -1
}

const handleClear = () => {
    emit('update:modelValue', '')
    emit('change', '')
    emit('clear')
    isOpen.value = false
    highlightedIndex.value = -1
}

const selectSuggestion = (suggestion: string) => {
    emit('update:modelValue', suggestion)
    emit('select', suggestion)
    emit('change', suggestion)
    isOpen.value = false
    highlightedIndex.value = -1
}

const toggleDropdown = () => {
    if (props.disabled) return
    isOpen.value = !isOpen.value
}

const handleClickOutside = (event: MouseEvent) => {
    if (containerRef.value && !containerRef.value.contains(event.target as Node)) {
        isOpen.value = false
    }
}

const handleKeyDown = (e: KeyboardEvent) => {
    if (!isOpen.value) {
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            isOpen.value = true
        }
        return
    }

    switch (e.key) {
        case 'ArrowDown':
            e.preventDefault()
            if (filteredSuggestions.value.length > 0) {
                highlightedIndex.value = (highlightedIndex.value + 1) % filteredSuggestions.value.length
            }
            break
        case 'ArrowUp':
            e.preventDefault()
            if (filteredSuggestions.value.length > 0) {
                highlightedIndex.value = (highlightedIndex.value - 1 + filteredSuggestions.value.length) % filteredSuggestions.value.length
            }
            break
        case 'Enter':
            if (highlightedIndex.value >= 0 && filteredSuggestions.value[highlightedIndex.value]) {
                e.preventDefault()
                selectSuggestion(filteredSuggestions.value[highlightedIndex.value])
            } else if (isOpen.value) {
                isOpen.value = false
            }
            break
        case 'Escape':
            isOpen.value = false
            break
        case 'Tab':
            isOpen.value = false
            break
    }
}

onMounted(() => {
    document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
    document.removeEventListener('click', handleClickOutside)
})
</script>

<template>
    <div class="relative w-full" ref="containerRef">
        <BaseInput :model-value="modelValue" @update:model-value="handleInput" :placeholder="placeholder" :label="label"
            :error="error" :disabled="disabled" @focus="isOpen = true" @keydown="handleKeyDown">
            <template #prefix v-if="$slots.prefix">
                <slot name="prefix" />
            </template>
            <template #suffix>
                <div class="flex items-center gap-1">
                    <button v-if="clearable && modelValue" type="button"
                        class="p-1 text-gray-400 hover:text-red-500 transition-colors focus:outline-none"
                        @click.stop="handleClear">
                        <font-awesome-icon :icon="faTimes" class="text-xs" />
                    </button>
                    <slot name="suffix" />
                    <button type="button" class="p-1 hover:text-indigo-500 transition-colors focus:outline-none"
                        @click.stop="toggleDropdown" :disabled="disabled">
                        <font-awesome-icon :icon="faChevronDown"
                            class="text-[10px] text-gray-400 transition-transform duration-200"
                            :class="{ 'rotate-180': isOpen }" />
                    </button>
                </div>
            </template>
        </BaseInput>

        <transition name="el-zoom-in-top">
            <div v-if="showSuggestions"
                class="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl shadow-xl p-2 max-h-60 overflow-y-auto">
                <div v-for="(suggestion, index) in filteredSuggestions" :key="suggestion"
                    class="px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer text-sm transition-colors rounded-xl"
                    :class="{
                        'bg-indigo-50/50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 font-medium': modelValue === suggestion,
                        'bg-gray-50 dark:bg-gray-700/50': highlightedIndex === index && modelValue !== suggestion
                    }" @click="selectSuggestion(suggestion)">
                    {{ suggestion }}
                </div>
                <div v-if="filteredSuggestions.length === 0 && suggestions.length > 0"
                    class="px-4 py-3 text-sm text-gray-400 dark:text-gray-500 italic text-center">
                    No matching directories
                </div>
            </div>
        </transition>
    </div>
</template>

<style scoped>
.el-zoom-in-top-enter-active,
.el-zoom-in-top-leave-active {
    transition: opacity 0.2s, transform 0.2s;
    transform-origin: center top;
}

.el-zoom-in-top-enter-from,
.el-zoom-in-top-leave-to {
    opacity: 0;
    transform: scaleY(0);
}
</style>
