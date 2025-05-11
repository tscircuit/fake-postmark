import { withRouteSpec } from "lib/middleware/with-winter-spec"
import { z } from "zod"
import type { NewPostmarkEmail } from "lib/db/db-client"

// Schema for the request body, based on Postmark's API
// This is a simplified version. A full implementation would be more extensive.
const sendEmailRequestBodySchema = z.object({
  From: z.string().email(),
  To: z.string().email(),
  Cc: z.string().email().optional(),
  Bcc: z.string().email().optional(),
  Subject: z.string().optional(),
  Tag: z.string().optional(),
  HtmlBody: z.string().optional(),
  TextBody: z.string().optional(),
  ReplyTo: z.string().email().optional(),
  Headers: z
    .array(z.object({ Name: z.string(), Value: z.string() }))
    .optional(), // Postmark expects an array of {Name: string, Value: string}
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
})

// Schema for the successful response, mimicking Postmark
const sendEmailResponseSchema = z.object({
  To: z.string(),
  SubmittedAt: z.string(), // ISO DateTime
  MessageID: z.string().uuid(),
  ErrorCode: z.number(),
  Message: z.string(),
})

export default withRouteSpec({
  methods: ["POST"],
  jsonBody: sendEmailRequestBodySchema,
  jsonResponse: sendEmailResponseSchema,
  commonParams: z
    .object({
      // Postmark uses X-Postmark-Server-Token in headers, which winterspec can map
    })
    .optional(),
  auth: "none", // Assuming no auth for this fake endpoint for now
} as const)(async (req, ctx) => {
  const emailDataFromRequest = req.jsonBody

  // Transform Headers from Postmark's array format to our simplified record format if necessary
  // For this fake, we'll assume the db schema's `Headers: z.record(z.string())` is sufficient
  // and the client might send it in a way that fits or we simplify what we store.
  // If strict Postmark client compatibility is needed, this transformation would be more complex.
  const emailToStore: NewPostmarkEmail = {
    ...emailDataFromRequest,
    // Headers might need transformation if the client sends an array of {Name, Value}
    // For simplicity, we'll assume the client sends a flat object or we ignore this mismatch for the fake.
    // If Headers are provided in the expected array format, convert them:
    Headers: emailDataFromRequest.Headers
      ? Object.fromEntries(
          emailDataFromRequest.Headers.map((h) => [h.Name, h.Value]),
        )
      : undefined,
  }

  const storedEmail = ctx.db.addPostmarkEmail(emailToStore)

  return ctx.json({
    To: storedEmail.To,
    SubmittedAt: storedEmail.SubmittedAt,
    MessageID: storedEmail.MessageID,
    ErrorCode: storedEmail.ErrorCode,
    Message: storedEmail.StatusMessage,
  })
})
