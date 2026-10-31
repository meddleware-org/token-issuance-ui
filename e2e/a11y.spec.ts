// The shared accessibility sweep (WCAG 2.2 AA and AAA in every colour mode × season, reflow, text size, forced colours, reduced motion,
// keyboard) over the wizard, step by step, and the tabs. The e2e build's mock wallet and stub chain make the connected ones reachable.
import { defineA11ySuite } from '@meddleware/frontend-config/a11y'
import { disconnected, done, iconUpload, identity, myTokens, review, settings, terms, token } from './open.js'

defineA11ySuite(
  {
    disconnected,
    identity,
    token,
    'token: icon upload': iconUpload,
    settings,
    'terms dialog': terms,
    review,
    done,
    'my tokens': myTokens,
  },
  { aaa: 'gate' },
)
