<template>
    <div class="tags-input">
        <div class="flex flex-wrap gap-1.5 mb-2" v-if="modelValue.length > 0">
            <span v-for="(tag, index) in modelValue" :key="index"
                class="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-full">
                {{ tag }}
                <button type="button" @click.stop="removeTag(index)"
                    class="text-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-200 transition-colors">
                    <font-awesome-icon :icon="faTimes" class="text-[10px]" />
                </button>
            </span>
        </div>
        <div class="relative">
            <input type="text" v-model="inputValue" @keydown.enter.prevent="addTag" @keydown.comma.prevent="addTag"
                @keydown.backspace="handleBackspace" :placeholder="placeholder"
                class="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all" />
        </div>
        <p class="mt-1 text-[11px] text-gray-400 dark:text-gray-500">{{ hint }}</p>
    </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { faTimes } from '@fortawesome/free-solid-svg-icons'

const props = withDefaults(defineProps<{
    modelValue: string[]
    placeholder?: string
    hint?: string
    maxTags?: number
}>(), {
    placeholder: '',
    hint: '',
    maxTags: 10
})

const emit = defineEmits<{
    (e: 'update:modelValue', value: string[]): void
}>()

const inputValue = ref('')

const addTag = () => {
    const value = inputValue.value.trim()
    if (!value) return
    if (props.modelValue.length >= props.maxTags) return
    if (props.modelValue.includes(value)) {
        inputValue.value = ''
        return
    }
    emit('update:modelValue', [...props.modelValue, value])
    inputValue.value = ''
}

const removeTag = (index: number) => {
    const newTags = [...props.modelValue]
    newTags.splice(index, 1)
    emit('update:modelValue', newTags)
}

const handleBackspace = () => {
    if (inputValue.value === '' && props.modelValue.length > 0) {
        removeTag(props.modelValue.length - 1)
    }
}
</script>
