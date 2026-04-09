import { createApp } from 'vue'
import PrimeVue from 'primevue/config'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import ToggleSwitch from 'primevue/toggleswitch'
import Checkbox from 'primevue/checkbox'
import Divider from 'primevue/divider'
import Dialog from 'primevue/dialog'
import SelectButton from 'primevue/selectbutton'
import Tag from 'primevue/tag'
import Toast from 'primevue/toast'
import ToastService from 'primevue/toastservice'
import Splitter from 'primevue/splitter'
import SplitterPanel from 'primevue/splitterpanel'
import Tabs from 'primevue/tabs'
import TabList from 'primevue/tablist'
import Tab from 'primevue/tab'
import TabPanels from 'primevue/tabpanels'
import TabPanel from 'primevue/tabpanel'

import 'primeicons/primeicons.css'
import App from './App.vue'
import { QuietAtelier } from './theme/quietAtelier'

const app = createApp(App)

app.use(PrimeVue, {
  theme: {
    preset: QuietAtelier,
    options: {
      darkModeSelector: '.p-dark',
      cssLayer: false
    }
  }
})
app.use(ToastService)

app.component('Button', Button)
app.component('InputText', InputText)
app.component('InputNumber', InputNumber)
app.component('ToggleSwitch', ToggleSwitch)
app.component('Checkbox', Checkbox)
app.component('Divider', Divider)
app.component('Dialog', Dialog)
app.component('SelectButton', SelectButton)
app.component('Tag', Tag)
app.component('Toast', Toast)
app.component('Splitter', Splitter)
app.component('SplitterPanel', SplitterPanel)
app.component('Tabs', Tabs)
app.component('TabList', TabList)
app.component('Tab', Tab)
app.component('TabPanels', TabPanels)
app.component('TabPanel', TabPanel)

app.mount('#app')
