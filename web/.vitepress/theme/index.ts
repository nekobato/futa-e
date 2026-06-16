import DefaultTheme from 'vitepress/theme'
import type { Theme } from 'vitepress'
import AuroraBackground from '../components/AuroraBackground.vue'
import BackgroundFrame from '../components/BackgroundFrame.vue'
import ConstellationBackground from '../components/ConstellationBackground.vue'
import FirefliesBackground from '../components/FirefliesBackground.vue'
import FlowFieldBackground from '../components/FlowFieldBackground.vue'
import LifeGameBackground from '../components/LifeGameBackground.vue'
import ParticleWavesBackground from '../components/ParticleWavesBackground.vue'
import RainBackground from '../components/RainBackground.vue'
import StarsBackground from '../components/StarsBackground.vue'
import Layout from './Layout.vue'
import './styles.css'

export default {
  extends: DefaultTheme,
  Layout,
  enhanceApp({ app }) {
    app.component('AuroraBackground', AuroraBackground)
    app.component('BackgroundFrame', BackgroundFrame)
    app.component('ConstellationBackground', ConstellationBackground)
    app.component('FirefliesBackground', FirefliesBackground)
    app.component('FlowFieldBackground', FlowFieldBackground)
    app.component('LifeGameBackground', LifeGameBackground)
    app.component('ParticleWavesBackground', ParticleWavesBackground)
    app.component('RainBackground', RainBackground)
    app.component('StarsBackground', StarsBackground)
  }
} satisfies Theme
