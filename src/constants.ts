import { z } from 'zod'

// TargetLanguages that are supported by the Dyspatch API
export const TargetLanguage = z.enum([
  'html',
  'handlebars',
  'ampscript',
  'freemarker',
  'cheetah',
  'jinja',
  'liquid',
  'mandrillhandlebars',
  'handlebarsjava',
])

// Supported Template Types
export const TemplateType = z.enum(['email', 'sms', 'push', 'voice', 'liveactivity'])

// Object types that support tags
export const TagType = z.enum(['template', 'draft', 'block'])


// Shared field descriptions
export const LANGUAGE_ID_DESCRIPTION =
  'IETF BCP 47 language code (e.g. en-US, fr-FR, zh-Hans-CN, zh-Hant-HK, es-419, ceb-PH).'
export const CURSOR_DESCRIPTION = 'Pagination cursor from a previous response'
export const TEMPLATE_TYPE_DESCRIPTION = 'Template channel type'
export const TARGET_LANGUAGE_DESCRIPTION = 'Target language for compiled output'
export const THEME_ID_DESCRIPTION = 'Theme ID to use when compiling'
export const LOCALIZATION_NAME_DESCRIPTION = 'Display name for the localization'
export const TRANSLATIONS_DESCRIPTION =
  'Key/value map of translation strings to set (replaces all existing translations)'
