<script setup lang="ts">
const props = withDefaults(defineProps<{
    modelValue: string | number | null | undefined
    type?: string
    placeholder?: string
    readonly?: boolean
    disabled?: boolean
    label?: string
    error?: string
    rows?: number
}>(), {
    type: 'text',
    placeholder: '',
    readonly: false,
    disabled: false,
    rows: 3
})

const emit = defineEmits(['update:modelValue', 'blur', 'focus', 'clear'])

const handleInput = (e: Event) => {
    const target = e.target as HTMLInputElement
    emit('update:modelValue', target.value)
}
</script>

<template>
    <div class="space-y-1.5 w-full">
        <label v-if="label" class="block text-sm font-medium text-gray-700 dark:text-gray-300 ml-1">
            {{ label }}
        </label>
        <div class="relative group">
            <!-- Prefix slot -->
            <div v-if="$slots.prefix" class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <slot name="prefix" />
            </div>

            <textarea v-if="type === 'textarea'" :value="modelValue" :placeholder="placeholder" :readonly="readonly"
                :disabled="disabled" :rows="rows || 3" @input="handleInput" @blur="emit('blur')" @focus="emit('focus')"
                class="w-full py-3 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all placeholder:text-gray-400 dark:placeholder:text-gray-600 outline-none disabled:opacity-60 disabled:cursor-not-allowed resize-none"
                :class="[
                    error ? 'border-red-500 focus:border-red-500 focus:ring-red-500/10' : '',
                    (!readonly && !disabled) ? 'bg-gray-50/80 dark:bg-gray-800/40 border-gray-100 dark:border-gray-800' : 'bg-gray-50/30 dark:bg-gray-900/30 cursor-default',
                    'px-4'
                ]"></textarea>

            <input v-else :value="modelValue" :type="type" :placeholder="placeholder" :readonly="readonly"
                :disabled="disabled" @input="handleInput" @blur="emit('blur')" @focus="emit('focus')"
                class="w-full py-3 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all placeholder:text-gray-400 dark:placeholder:text-gray-600 outline-none disabled:opacity-60 disabled:cursor-not-allowed"
                :class="[
                    $slots.prefix ? 'pl-10' : 'pl-4',
                    $slots.suffix ? 'pr-10' : 'pr-4',
                    error ? 'border-red-500 focus:border-red-500 focus:ring-red-500/10' : '',
                    (!readonly && !disabled) ? 'bg-gray-50/80 dark:bg-gray-800/40 border-gray-100 dark:border-gray-800' : 'bg-gray-50/30 dark:bg-gray-900/30 cursor-default'
                ]">

            <!-- Suffix slot -->
            <div v-if="$slots.suffix" class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                <slot name="suffix" />
            </div>
        </div>
        <p v-if="error" class="text-xs text-red-500 ml-1 mt-1">{{ error }}</p>
    </div>
</template>
