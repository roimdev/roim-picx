<script setup lang="ts">
const props = withDefaults(defineProps<{
    modelValue: boolean
    label?: string
    disabled?: boolean
}>(), {
    label: '',
    disabled: false
})

const emit = defineEmits(['update:modelValue'])

const toggle = () => {
    if (props.disabled) return
    emit('update:modelValue', !props.modelValue)
}
</script>

<template>
    <label class="flex items-center gap-3 cursor-pointer group select-none"
        :class="{ 'opacity-60 cursor-not-allowed': disabled }">
        <div class="relative">
            <input type="checkbox" :checked="modelValue" :disabled="disabled" class="sr-only peer" @change="toggle" />
            <div
                class="w-11 h-6 bg-gray-200 dark:bg-gray-700 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600 transition-all">
            </div>
        </div>
        <span v-if="label"
            class="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-gray-100 transition-colors">
            {{ label }}
        </span>
    </label>
</template>
