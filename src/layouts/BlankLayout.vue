<script setup lang="ts">
// Blank layout - renders the router view with minimal chrome and footer
const repoLink = 'https://github.com/roimdev'
const repoName = 'roim-picx'
</script>

<template>
    <div class="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-950">
        <!-- Main Content -->
        <div class="flex-1 w-full">
            <router-view />
        </div>

        <!-- Footer -->
        <div
            class="w-full py-4 border-t border-gray-200/50 dark:border-gray-800/50 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm mt-auto">
            <div
                class="max-w-7xl mx-auto flex items-center justify-center text-gray-500 dark:text-gray-400 text-sm px-4">
                <span class="mr-1">Powered by</span>
                <a :href="repoLink" target="_blank"
                    class="font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors hover:underline">
                    {{ repoName }}
                </a>
            </div>
        </div>
    </div>
</template>
