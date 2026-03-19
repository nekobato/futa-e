import { definePreset } from '@primeuix/themes'
import Aura from '@primeuix/themes/aura'

const surfaceScale = {
  0: '#FBF8F2',
  50: '#F7F3EC',
  100: '#F1EBE0',
  200: '#E1D8C9',
  300: '#D2C7B6',
  400: '#B4A797',
  500: '#8E8072',
  600: '#6B6258',
  700: '#4F4740',
  800: '#39322C',
  900: '#2A241E',
  950: '#1D1813'
} as const

const primaryScale = {
  50: '#EAE9E1',
  100: '#D6D6CD',
  200: '#BBBDB3',
  300: '#A0A598',
  400: '#7B8373',
  500: '#535E4B',
  600: '#4D5645',
  700: '#484E3E',
  800: '#424638',
  900: '#3C3E32',
  950: '#36352C'
} as const

// Supplemental status palettes were tuned against the warm surfaces with APCA:
// body-like text stays above roughly Lc 60, and inverse button labels stay near 75.
const successScale = {
  50: '#ECEBE3',
  100: '#DBDBD1',
  200: '#C3C5B9',
  300: '#ACB0A1',
  400: '#8B9380',
  500: '#68735C',
  600: '#5F6853',
  700: '#575D4B',
  800: '#4E5242',
  900: '#454739',
  950: '#3D3C31'
} as const

const infoScale = {
  50: '#EDEBE7',
  100: '#DBDCD9',
  200: '#C4C7C7',
  300: '#ADB3B6',
  400: '#8D979D',
  500: '#6A7882',
  600: '#616C74',
  700: '#586066',
  800: '#4F5558',
  900: '#46494A',
  950: '#3D3D3C'
} as const

const warnScale = {
  50: '#F1ECE3',
  100: '#E6DED2',
  200: '#D6CABA',
  300: '#C7B7A3',
  400: '#B19D82',
  500: '#9A805F',
  600: '#8A7356',
  700: '#7B664D',
  800: '#6B5944',
  900: '#5B4C3B',
  950: '#4C4032'
} as const

const dangerScale = {
  50: '#F0EAE3',
  100: '#E3D8D1',
  200: '#D1C1BA',
  300: '#C0AAA2',
  400: '#A78A82',
  500: '#8D675E',
  600: '#7F5E55',
  700: '#71544C',
  800: '#634B43',
  900: '#56413A',
  950: '#483831'
} as const

const helpScale = {
  50: '#EEEAE6',
  100: '#DFDAD7',
  200: '#CBC4C4',
  300: '#B6ADB1',
  400: '#9A8F96',
  500: '#7C6E79',
  600: '#71646C',
  700: '#655960',
  800: '#5A4F53',
  900: '#4E4546',
  950: '#433A39'
} as const

export const QuietAtelier = definePreset(Aura, {
  primitive: {
    borderRadius: {
      none: '0',
      xs: '4px',
      sm: '10px',
      md: '14px',
      lg: '18px',
      xl: '24px'
    },
    green: successScale,
    orange: warnScale,
    purple: helpScale,
    red: dangerScale,
    sky: infoScale
  },
  semantic: {
    focusRing: {
      width: '2px',
      style: 'solid',
      color: '{primary.300}',
      offset: '2px',
      shadow: '0 0 0 0.22rem color-mix(in srgb, {primary.200}, transparent 72%)'
    },
    primary: primaryScale,
    formField: {
      paddingX: '0.875rem',
      paddingY: '0.625rem',
      sm: {
        fontSize: '0.875rem',
        paddingX: '0.75rem',
        paddingY: '0.5rem'
      },
      lg: {
        fontSize: '1.05rem',
        paddingX: '1rem',
        paddingY: '0.75rem'
      },
      borderRadius: '{border.radius.md}',
      focusRing: {
        width: '0',
        style: 'none',
        color: 'transparent',
        offset: '0',
        shadow: 'none'
      }
    },
    content: {
      borderRadius: '{border.radius.lg}'
    },
    colorScheme: {
      light: {
        surface: surfaceScale,
        primary: {
          color: '{primary.500}',
          contrastColor: '{surface.0}',
          hoverColor: '{primary.600}',
          activeColor: '{primary.700}'
        },
        highlight: {
          background: '{primary.100}',
          focusBackground: '{primary.200}',
          color: '{primary.800}',
          focusColor: '{primary.900}'
        },
        mask: {
          background: 'rgba(29, 24, 19, 0.36)',
          color: '{surface.100}'
        },
        formField: {
          background: '{surface.0}',
          disabledBackground: '{surface.100}',
          filledBackground: '{surface.50}',
          filledHoverBackground: '{surface.50}',
          filledFocusBackground: '{surface.0}',
          borderColor: '{surface.300}',
          hoverBorderColor: '{surface.400}',
          focusBorderColor: '{primary.400}',
          invalidBorderColor: '{red.400}',
          color: '{surface.800}',
          disabledColor: '{surface.500}',
          placeholderColor: '{surface.500}',
          invalidPlaceholderColor: '{red.600}',
          floatLabelColor: '{surface.600}',
          floatLabelFocusColor: '{primary.600}',
          floatLabelActiveColor: '{surface.600}',
          iconColor: '{surface.500}',
          shadow:
            '0 1px 2px 0 color-mix(in srgb, {surface.950}, transparent 94%)'
        },
        text: {
          color: '{surface.900}',
          hoverColor: '{surface.950}',
          mutedColor: '{surface.600}',
          hoverMutedColor: '{surface.700}'
        },
        content: {
          background: '{surface.0}',
          hoverBackground: '{surface.50}',
          borderColor: '{surface.300}',
          color: '{text.color}',
          hoverColor: '{text.hover.color}'
        },
        overlay: {
          select: {
            background: '{surface.0}',
            borderColor: '{surface.300}',
            color: '{text.color}'
          },
          popover: {
            background: '{surface.0}',
            borderColor: '{surface.300}',
            color: '{text.color}'
          },
          modal: {
            background: '{surface.0}',
            borderColor: '{surface.300}',
            color: '{text.color}'
          }
        },
        list: {
          option: {
            focusBackground: '{surface.50}',
            selectedBackground: '{highlight.background}',
            selectedFocusBackground: '{highlight.focus.background}',
            color: '{text.color}',
            focusColor: '{text.hover.color}',
            selectedColor: '{highlight.color}',
            selectedFocusColor: '{highlight.focus.color}',
            icon: {
              color: '{surface.500}',
              focusColor: '{surface.600}'
            }
          },
          optionGroup: {
            background: 'transparent',
            color: '{text.muted.color}'
          }
        },
        navigation: {
          item: {
            focusBackground: '{surface.50}',
            activeBackground: '{surface.50}',
            color: '{text.color}',
            focusColor: '{text.hover.color}',
            activeColor: '{text.hover.color}',
            icon: {
              color: '{surface.500}',
              focusColor: '{surface.600}',
              activeColor: '{surface.600}'
            }
          },
          submenuLabel: {
            background: 'transparent',
            color: '{text.muted.color}'
          },
          submenuIcon: {
            color: '{surface.500}',
            focusColor: '{surface.600}',
            activeColor: '{surface.600}'
          }
        }
      }
    }
  },
  components: {
    button: {
      root: {
        borderRadius: '999px',
        paddingX: '0.95rem',
        paddingY: '0.58rem',
        label: {
          fontWeight: '600'
        },
        raisedShadow:
          '0 12px 24px color-mix(in srgb, {surface.950}, transparent 88%)',
        focusRing: {
          width: '2px',
          style: 'solid',
          offset: '2px'
        }
      }
    },
    splitter: {
      gutter: {
        background:
          'color-mix(in srgb, {content.border.color}, transparent 18%)'
      },
      handle: {
        size: '18px',
        borderRadius: '999px'
      }
    },
    tabs: {
      tablist: {
        background: 'transparent',
        borderColor: '{content.border.color}'
      },
      tab: {
        hoverBackground: 'transparent',
        activeBackground: 'transparent',
        borderColor: '{content.border.color}',
        hoverBorderColor: '{content.border.color}',
        activeBorderColor: '{primary.400}',
        color: '{text.muted.color}',
        hoverColor: '{text.color}',
        activeColor: '{primary.color}',
        padding: '0.95rem 1rem'
      },
      tabpanel: {
        background: 'transparent',
        color: '{text.color}'
      }
    },
    tag: {
      root: {
        borderRadius: '999px',
        padding: '0.2rem 0.6rem',
        fontWeight: '600'
      }
    },
    toggleswitch: {
      root: {
        borderRadius: '999px',
        borderWidth: '1px',
        borderColor: '{surface.300}',
        hoverBorderColor: '{surface.400}',
        checkedBorderColor: '{primary.500}',
        checkedHoverBorderColor: '{primary.600}',
        shadow:
          'inset 0 1px 2px color-mix(in srgb, {surface.950}, transparent 92%)'
      },
      handle: {
        borderRadius: '999px'
      }
    }
  }
})
