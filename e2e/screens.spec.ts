// Screenshots for LOOKING at the app (see @meddleware/frontend-config/shots). Run: npm run shots. The connected states go through the e2e
// build's mock wallet.
import { defineShots } from '@meddleware/frontend-config/shots'
import { disconnected, done, iconUpload, identity, myTokens, review, settings, terms, token } from './open.js'

defineShots({ disconnected, identity, token, iconUpload, settings, terms, review, done, myTokens })
