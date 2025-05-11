import { z } from "zod"

// When defining your database schema, try to use snake case for column names.

export const thingSchema = z.object({
  thing_id: z.string(),
  name: z.string(),
  description: z.string(),
})
export type Thing = z.infer<typeof thingSchema>

export const postmarkEmailSchema = z.object({
  MessageID: z.string(),
  From: z.string(),
  To: z.string(),
  Cc: z.string().optional(),
  Bcc: z.string().optional(),
  Subject: z.string().optional(),
  Tag: z.string().optional(),
  HtmlBody: z.string().optional(),
  TextBody: z.string().optional(),
  ReplyTo: z.string().optional(),
  Headers: z.record(z.string()).optional(), // Simplified from Postmark's Array<Header>
  TrackOpens: z.boolean().optional(),
  TrackLinks: z.string().optional(), // None, HtmlAndText, HtmlOnly, TextOnly
  Metadata: z.record(z.string()).optional(),
  Attachments: z.array(z.object({
    Name: z.string(),
    Content: z.string(),
    ContentType: z.string(),
    ContentID: z.string().nullable().optional(),
  })).optional(),
  MessageStream: z.string().optional(),
  SubmittedAt: z.string(), // ISO DateTime
  ErrorCode: z.number().default(0),
  StatusMessage: z.string().default("OK"), // "OK" or error message
  // New fields for templated emails
  TemplateId: z.number().int().optional(),
  TemplateAlias: z.string().optional(),
  TemplateModel: z.record(z.any()).optional(),
})
export type PostmarkEmail = z.infer<typeof postmarkEmailSchema>

export const databaseSchema = z.object({
  idCounter: z.number().default(0),
  things: z.array(thingSchema).default([]),
  postmarkEmails: z.array(postmarkEmailSchema).default([]),
})
export type DatabaseSchema = z.infer<typeof databaseSchema>
