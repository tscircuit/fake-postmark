import { withRouteSpec } from "lib/middleware/with-winter-spec"
import { z } from "zod"
import type { NewEmailTemplate } from "lib/db/db-client"
import type { EmailTemplate } from "lib/db/schema"

const createTemplateBaseBodySchema = z.object({
  Name: z.string({ required_error: "Name is required." }),
  Alias: z.string().optional(),
  HtmlBody: z.string().optional(),
  TextBody: z.string().optional(),
  LayoutTemplate: z.string().optional(),
})

// Discriminated union for TemplateType specific fields
const createTemplateBodySchema = z
  .discriminatedUnion("TemplateType", [
    createTemplateBaseBodySchema.extend({
      TemplateType: z.literal("Standard").default("Standard"),
      Subject: z.string({
        required_error: "Subject is required for Standard templates.",
      }),
    }),
    createTemplateBaseBodySchema.extend({
      TemplateType: z.literal("Layout"),
      Subject: z
        .undefined({
          errorMap: () => ({
            message: "Subject is not allowed for Layout templates.",
          }),
        })
        .optional(), // Explicitly disallow/ignore Subject for Layout
    }),
  ])
  .refine((data) => data.HtmlBody || data.TextBody, {
    message: "Either HtmlBody or TextBody must be provided.",
    path: ["HtmlBody"], // Path to report error, can be one or both
  })

const createTemplateResponseSchema = z.object({
  TemplateId: z.number().int(),
  Name: z.string(),
  Active: z.boolean(),
  Alias: z.string().nullable(),
  TemplateType: z.enum(["Standard", "Layout"]),
  LayoutTemplate: z.string().nullable(),
  // Postmark API also returns Subject in response for "Get a template", but not explicitly for "Create"
  // Let's include it for consistency if it's defined.
  Subject: z.string().optional(),
})

export default withRouteSpec({
  methods: ["POST"],
  jsonBody: createTemplateBodySchema,
  jsonResponse: createTemplateResponseSchema,
  auth: "none", // Assuming no auth for this fake endpoint
})(async (req, ctx) => {
  const templateDataFromRequest = req.jsonBody // Winterspec already parsed and validated

  // Prepare data for the database client
  // The schema validation ensures TemplateType is set.
  // If TemplateType is Layout, Subject should be undefined due to schema validation.
  const dbInput: NewEmailTemplate = {
    Name: templateDataFromRequest.Name,
    Alias: templateDataFromRequest.Alias,
    HtmlBody: templateDataFromRequest.HtmlBody,
    TextBody: templateDataFromRequest.TextBody,
    Subject:
      templateDataFromRequest.TemplateType === "Standard"
        ? templateDataFromRequest.Subject
        : undefined,
    TemplateType: templateDataFromRequest.TemplateType, // This will be "Standard" or "Layout"
    LayoutTemplate: templateDataFromRequest.LayoutTemplate,
  }

  const storedTemplate = ctx.db.addEmailTemplate(dbInput)

  return ctx.json({
    TemplateId: storedTemplate.TemplateId,
    Name: storedTemplate.Name,
    Active: storedTemplate.Active,
    Alias: storedTemplate.Alias,
    TemplateType: storedTemplate.TemplateType,
    LayoutTemplate: storedTemplate.LayoutTemplate,
    ...(storedTemplate.Subject && { Subject: storedTemplate.Subject }), // Conditionally add Subject
  })
})
