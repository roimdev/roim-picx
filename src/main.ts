import { createApp } from 'vue'
import App from './App.vue'
import './permission'
import router from './plugins/router'
import i18n from './locales'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import './app.css'
import 'element-plus/dist/index.css'

createApp(App).use(router).use(i18n).component('font-awesome-icon', FontAwesomeIcon).mount('#app')
