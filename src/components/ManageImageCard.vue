<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import {
    ElDropdown, ElDropdownMenu, ElDropdownItem, ElImage
} from 'element-plus'
import {
    faEllipsisVertical, faPen, faTrash, faShareAlt, faLink, faFolderPlus, faEye, faTag, faEyeSlash
} from '@fortawesome/free-solid-svg-icons'
import { computed, ref } from 'vue'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import formatBytes from '../utils/format-bytes'
import type { ImgItem } from '../utils/types'

const props = defineProps<{
    item: ImgItem
}>()

const isNsfw = computed(() => props.item.nsfw)
const showNsfw = ref(false)

const toggleNsfw = (e: Event) => {
    e.stopPropagation()
    showNsfw.value = !showNsfw.value
}

const emit = defineEmits<{
    (e: 'click'): void
    (e: 'preview'): void
    (e: 'share'): void
    (e: 'rename'): void
    (e: 'delete'): void
    (e: 'detail'): void
    (e: 'addToAlbum'): void
    (e: 'editTags'): void
}>()

const { t } = useI18n()

// Helper to get filename
const displayGetName = (key: string) => {
    const parts = key.split('/')
    return parts[parts.length - 1]
}
</script>

<template>
    <div class="group relative bg-gray-100 dark:bg-gray-800 rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all cursor-pointer border border-gray-200 dark:border-gray-700 aspect-[4/3] md:aspect-[3/4]"
        @click="$emit('preview')">

        <!-- Full Background Image -->
        <div class="absolute inset-0">
            <el-image :src="item.url" fit="cover"
                class="w-full h-full transition-transform duration-700 group-hover:scale-105" 
                :class="{ 'blur-xl': isNsfw && !showNsfw }"
                loading="lazy">
                <template #placeholder>
                    <div class="w-full h-full bg-gray-200 dark:bg-gray-800 animate-pulse"></div>
                </template>
                <template #error>
                    <div
                        class="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-800 text-gray-400">
                        <font-awesome-icon :icon="faEye" class="text-2xl" />
                    </div>
                </template>
            </el-image>
             <!-- NSFW Overlay -->
             <div v-if="isNsfw && !showNsfw" class="absolute inset-0 flex flex-col items-center justify-center bg-black/20 backdrop-blur-sm z-10">
                <div class="p-3 rounded-full bg-red-500/80 text-white mb-2">
                    <font-awesome-icon :icon="faEyeSlash" class="text-xl" />
                </div>
                <span class="text-white font-bold text-sm tracking-wide">NSFW</span>
                <button @click="toggleNsfw" class="mt-3 px-3 py-1 bg-white/20 hover:bg-white/30 text-white text-xs rounded-full backdrop-blur-md transition-colors border border-white/30">
                    Show Content
                </button>
            </div>
        </div>

        <!-- Overlay Gradient -->
        <div
            class="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
        </div>

        <!-- Action Menu -->
        <div class="absolute top-3 right-3 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity z-20"
            @click.stop>
            <el-dropdown trigger="click">
                <div
                    class="w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm text-white flex items-center justify-center hover:bg-black/60 cursor-pointer border border-white/10 transition-colors">
                    <font-awesome-icon :icon="faEllipsisVertical" />
                </div>
                <template #dropdown>
                    <el-dropdown-menu>
                        <el-dropdown-item @click="$emit('detail')">
                            <font-awesome-icon :icon="faLink" class="mr-2" />{{ $t('manage.details') }}
                        </el-dropdown-item>
                        <el-dropdown-item @click="$emit('share')">
                            <font-awesome-icon :icon="faShareAlt" class="mr-2" />{{ $t('share.title') }}
                        </el-dropdown-item>
                        <el-dropdown-item @click="$emit('addToAlbum')">
                            <font-awesome-icon :icon="faFolderPlus" class="mr-2" />{{ $t('album.uploadTo') }}
                        </el-dropdown-item>
                        <el-dropdown-item @click="$emit('rename')">
                            <font-awesome-icon :icon="faPen" class="mr-2" />{{ $t('manage.rename') }}
                        </el-dropdown-item>
                        <el-dropdown-item @click="$emit('editTags')">
                            <font-awesome-icon :icon="faTag" class="mr-2" />{{ $t('tags.editTags') }}
                        </el-dropdown-item>
                        <el-dropdown-item class="text-red-500" @click="$emit('delete')">
                            <font-awesome-icon :icon="faTrash" class="mr-2" />{{ $t('common.delete') }}
                        </el-dropdown-item>
                    </el-dropdown-menu>
                </template>
            </el-dropdown>
        </div>

        <!-- Glassmorphism Footer -->
        <div
            class="absolute bottom-0 left-0 right-0 p-4 bg-white/60 dark:bg-gray-900/60 backdrop-blur-md border-t border-white/20 dark:border-white/5 transition-all">
            <h3 class="font-bold text-gray-900 dark:text-gray-100 truncate mb-0.5" :title="displayGetName(item.key)">{{
                displayGetName(item.key) }}</h3>
            <div v-if="item.tags && item.tags.length > 0" class="flex flex-wrap gap-1 mt-1">
                <span v-for="tag in item.tags.slice(0, 3)" :key="tag"
                    class="inline-block px-1.5 py-0.5 text-[10px] bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 rounded-full">
                    {{ tag }}
                </span>
                <span v-if="item.tags.length > 3" class="text-[10px] text-gray-400">+{{ item.tags.length - 3 }}</span>
            </div>
        </div>
    </div>
</template>
