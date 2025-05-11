import { withRouteSpec } from "lib/middleware/with-winter-spec"
import { z } from "zod"
import type { InputForTemplatedEmail } from "lib/db/db-client"

// Schema for common email fields, excluding template-specific ones (TemplateId, TemplateAlias, TemplateModel)
// and generated ones (Subject, HtmlBody, TextBody).
const emailBaseSchema = z.object({
  From: z.string().email(),
  To: z.string().email(), // Simplified to single recipient for consistency with /email
  Cc: z.string().email().optional(),
  Bcc: z.string().email().optional(),
  Tag: z.string().optional(),
  ReplyTo: z.string().email().optional(),
  Headers: z
    .array(z.object({ Name: z.string(), Value: z.string() }))
    .optional(),
  TrackOpens: z.boolean().optional(),
  TrackLinks: z
    .enum(["None", "HtmlAndText", "HtmlOnly", "TextOnly"])
    .optional(),
  Metadata: z.record(z.string()).optional(),
  Attachments: z
    .array(
      z.object({
        Name: z.string(),
        Content: z.string(), // Base64 encoded content
        ContentType: z.string(),
        ContentID: z.string().nullable().optional(),
      }),
    )
    .optional(),
  MessageStream: z.string().optional(),
  InlineCss: z.boolean().optional().default(true), // As per Postmark docs
  TemplateModel: z.record(z.any()), // The model to be applied to the template
})

// Schema for the request body, ensuring either TemplateId or TemplateAlias is present
const sendEmailWithTemplateRequestBodySchema = emailBaseSchema.and(
  z.union([
    z.object({
      TemplateId: z.number().int(),
      TemplateAlias: z.string().optional(),
    }), // TemplateId is present
    z.object({
      TemplateId: z.number().int().optional(),
      TemplateAlias: z.string(),
    }), // TemplateAlias is present
  ]),
)

// Schema for the successful response, mimicking Postmark (same as /email route's response)
const sendEmailResponseSchema = z.object({
  To: z.string(),
  SubmittedAt: z.string(), // ISO DateTime
  MessageID: z.string().uuid(),
  ErrorCode: z.number(),
  Message: z.string(),
})

export default withRouteSpec({
  methods: ["POST"],
  jsonBody: sendEmailWithTemplateRequestBodySchema,
  jsonResponse: sendEmailResponseSchema,
  auth: "none", // Assuming no auth for this fake endpoint
} as const)(async (req, ctx) => {
  const emailDataFromRequest = req.jsonBody

  // Transform Headers from array to record for database client
  const headersRecord = emailDataFromRequest.Headers
    ? Object.fromEntries(
        emailDataFromRequest.Headers.map((h) => [h.Name, h.Value]),
      )
    : undefined

  // Prepare the data for the database client function
  // This explicitly constructs the object matching InputForTemplatedEmail
  const dbInput: InputForTemplatedEmail = {
    From: emailDataFromRequest.From,
    To: emailDataFromRequest.To,
    Cc: emailDataFromRequest.Cc,
    Bcc: emailDataFromRequest.Bcc,
    Tag: emailDataFromRequest.Tag,
    ReplyTo: emailDataFromRequest.ReplyTo,
    Headers: headersRecord,
    TrackOpens: emailDataFromRequest.TrackOpens,
    TrackLinks: emailDataFromRequest.TrackLinks,
    Metadata: emailDataFromRequest.Metadata,
    Attachments: emailDataFromRequest.Attachments,
    MessageStream: emailDataFromRequest.MessageStream,
    TemplateModel: emailDataFromRequest.TemplateModel,
    // TemplateId and TemplateAlias are handled by the union logic:
    // One of them must be defined according to sendEmailWithTemplateRequestBodySchema.
    // Pass them as they are from the request.
    ...(emailDataFromRequest.TemplateId !== undefined && {
      TemplateId: emailDataFromRequest.TemplateId,
    }),
    ...(emailDataFromRequest.TemplateAlias !== undefined && {
      TemplateAlias: emailDataFromRequest.TemplateAlias,
    }),
  }

  const storedEmail = ctx.db.addTemplatedPostmarkEmail(dbInput)

  return ctx.json({
    To: storedEmail.To,
    SubmittedAt: storedEmail.SubmittedAt,
    MessageID: storedEmail.MessageID,
    ErrorCode: storedEmail.ErrorCode,
    Message: storedEmail.StatusMessage,
  })
})
