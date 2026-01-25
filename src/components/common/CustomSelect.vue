<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { faChevronDown, faCheck } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'

interface Option {
    label: string
    value: string | number
    icon?: any // FontAwesome icon or component
    [key: string]: any
}

const props = defineProps<{
    modelValue: string | number | undefined
    options: Option[]
    placeholder?: string
    disabled?: boolean
}>()

const emit = defineEmits(['update:modelValue', 'change'])

const isOpen = ref(false)
const dropdownRef = ref<HTMLElement | null>(null)

const selectedOption = ref<Option | undefined>(undefined)

watch(() => props.modelValue, (val) => {
    selectedOption.value = props.options.find(opt => opt.value === val)
}, { immediate: true })

const toggleDropdown = () => {
    if (props.disabled) return
    isOpen.value = !isOpen.value
}

const selectOption = (option: Option) => {
    emit('update:modelValue', option.value)
    emit('change', option.value)
    isOpen.value = false
}

// Click outside to close
const handleClickOutside = (event: MouseEvent) => {
    if (dropdownRef.value && !dropdownRef.value.contains(event.target as Node)) {
        isOpen.value = false
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
    <div class="relative" ref="dropdownRef">
        <button
            class="w-full flex items-center justify-between px-4 py-2 bg-gray-50/80 dark:bg-gray-800/40 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-medium hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900/30 outline-none"
            :class="{ 'opacity-50 cursor-not-allowed': disabled }" @click="toggleDropdown" type="button">
            <slot name="trigger" :option="selectedOption" :placeholder="placeholder">
                <div class="flex items-center gap-2 text-gray-700 dark:text-gray-200">
                    <component :is="selectedOption?.icon" v-if="selectedOption?.icon" class="text-gray-400" />
                    <span v-if="selectedOption">{{ selectedOption.label }}</span>
                    <span v-else class="text-gray-400">{{ placeholder || 'Select...' }}</span>
                </div>
            </slot>
            <font-awesome-icon :icon="faChevronDown" class="text-xs text-gray-400 transition-transform duration-200"
                :class="{ 'rotate-180': isOpen }" />
        </button>

        <transition name="el-zoom-in-top">
            <div v-if="isOpen"
                class="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl shadow-lg py-1 max-h-60 overflow-y-auto">
                <div v-for="opt in options" :key="opt.value"
                    class="px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer flex items-center justify-between group"
                    :class="{ 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400': modelValue === opt.value }"
                    @click="selectOption(opt)">
                    <slot name="option" :option="opt" :selected="modelValue === opt.value">
                        <div class="flex items-center gap-2">
                            <component :is="opt.icon" v-if="opt.icon"
                                class="text-gray-400 group-hover:text-indigo-500 transition-colors"
                                :class="{ 'text-indigo-500': modelValue === opt.value }" />
                            <span class="text-sm">{{ opt.label }}</span>
                        </div>
                        <font-awesome-icon :icon="faCheck" v-if="modelValue === opt.value" class="text-xs" />
                    </slot>
                </div>
            </div>
        </transition>
    </div>
</template>
