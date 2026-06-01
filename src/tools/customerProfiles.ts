import { z } from 'zod'
import type { DyspatchClient } from '../client.js'
import type { ToolDefinition } from '../index.js'
import { CURSOR_DESCRIPTION } from '../constants.js'

const listCustomerProfilesSchema = z.object({
  cursor: z.string().optional().describe(CURSOR_DESCRIPTION),
  workspaceId: z.string().optional().describe('Filter customer profiles by workspace ID'),
})

const getCustomerProfileSchema = z.object({
  customerProfileId: z.string().describe('Customer profile ID (e.g. dat_xxxx)'),
})

export function customerProfileTools(client: DyspatchClient): ToolDefinition[] {
  return [
    {
      name: 'list_customer_profiles',
      description:
        'List customer profiles for the organization. Results can be filtered by workspace ID. The list may include an unnamed customer profile (name is empty string) which represents global variables available to all templates. Returns paginated results. Each profile includes workspaceIds (direct assignments) and effectiveWorkspaceIds (including folder-inherited assignments).',
      inputSchema: listCustomerProfilesSchema,
      annotations: {
        title: 'List Customer Profiles',
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
      async handler(args) {
        const { cursor, workspaceId } = listCustomerProfilesSchema.parse(args)
        return client.get('/customerprofiles', { cursor, workspaceId })
      },
    },
    {
      name: 'get_customer_profile',
      description:
        'Get a customer profile by ID, including its JSON data content and workspace associations. Returns workspaceIds (direct assignments) and effectiveWorkspaceIds (including workspaces inherited from parent folders).',
      inputSchema: getCustomerProfileSchema,
      annotations: {
        title: 'Get Customer Profile',
        readOnlyHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
      async handler(args) {
        const { customerProfileId } = getCustomerProfileSchema.parse(args)
        return client.get(`/customerprofiles/${customerProfileId}`)
      },
    },
  ]
}
