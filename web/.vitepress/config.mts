import { defineConfig } from 'vitepress'

const backgroundLinks = [
  { text: 'Stars', link: '/stars/' },
  { text: 'Rain', link: '/rain/' },
  { text: 'Aurora', link: '/aurora/' },
  { text: 'Fireflies', link: '/fireflies/' },
  { text: 'Flow Field', link: '/flow-field/' },
  { text: 'Constellation', link: '/constellation/' },
  { text: 'Particle Waves', link: '/particle-waves/' },
  { text: 'Life Game', link: '/lifegame/' }
]

export default defineConfig({
  title: 'Futa-e Backgrounds',
  description: 'Fullscreen animated web backgrounds for Futa-e Player.',
  base: '/futa-e/',
  head: [
    ['meta', { name: 'theme-color', content: '#080b12' }],
    ['meta', { property: 'og:type', content: 'website' }]
  ],
  themeConfig: {
    nav: [{ text: 'Catalog', link: '/' }, ...backgroundLinks],
    sidebar: [
      {
        text: 'Backgrounds',
        items: [{ text: 'Catalog', link: '/' }, ...backgroundLinks]
      }
    ],
    socialLinks: [{ icon: 'github', link: 'https://github.com/nekobato/futa-e' }]
  }
})
