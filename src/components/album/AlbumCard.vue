<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import {
    ElDropdown, ElDropdownMenu, ElDropdownItem
} from 'element-plus'
import {
    faFolder, faEllipsisVertical, faPen, faTrash, faShareNodes
} from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import type { Album } from '../../utils/types'

const props = defineProps<{
    album: Album
}>()

const emit = defineEmits<{
    (e: 'click'): void
    (e: 'share'): void
    (e: 'edit'): void
    (e: 'delete'): void
}>()

const { t } = useI18n()
</script>

<template>
    <div class="group relative bg-gray-100 dark:bg-gray-800 rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all cursor-pointer border border-gray-200 dark:border-gray-700 aspect-[4/3] md:aspect-[3/4]"
        @click="$emit('click')">

        <!-- Full Background Cover -->
        <div class="absolute inset-0">
            <img v-if="album.cover_image" :src="album.cover_image"
                class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
            <div v-else
                class="w-full h-full flex items-center justify-center text-gray-300 dark:text-gray-600 bg-gray-50 dark:bg-gray-800">
                <font-awesome-icon :icon="faFolder" class="text-6xl" />
            </div>
        </div>

        <!-- Overlay Gradient -->
        <div
            class="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
        </div>

        <!-- Share Badge -->
        <div v-if="album.shareInfo && album.shareInfo.id"
            class="absolute top-3 left-3 px-2 py-1 bg-black/50 backdrop-blur-md rounded-lg text-white text-xs font-bold z-10 flex items-center gap-1 border border-white/10 shadow-sm">
            <font-awesome-icon :icon="faShareNodes" class="text-[10px]" />
            <span>{{ $t('album.shared') }}</span>
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
                        <el-dropdown-item @click="$emit('share')">
                            <font-awesome-icon :icon="faShareNodes" class="mr-2" />{{ album.shareInfo ?
                                $t('album.shareTitle') : $t('album.share') }}
                        </el-dropdown-item>
                        <el-dropdown-item @click="$emit('edit')">
                            <font-awesome-icon :icon="faPen" class="mr-2" />{{ $t('common.edit') }}
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
            <h3 class="font-bold text-gray-900 dark:text-gray-100 truncate mb-0.5">{{ album.name }}</h3>
            <p class="text-xs text-gray-500 dark:text-gray-400 flex items-center justify-between">
                <span>{{ album.imageCount }} {{ $t('album.items') }}</span>
            </p>
        </div>
    </div>
</template>
