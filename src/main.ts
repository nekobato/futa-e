import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import 'element-plus/theme-chalk/dark/css-vars.css'
import App from './App.vue'
import { installQuietAtelierTheme } from './theme/quietAtelier'
import './theme/quietAtelier.scss'

const app = createApp(App)

installQuietAtelierTheme()
app.use(ElementPlus)

app.mount('#app')
