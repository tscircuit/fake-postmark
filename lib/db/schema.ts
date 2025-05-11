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

// Schema for Email Templates
export const emailTemplateSchema = z.object({
  TemplateId: z.number().int(),
  Name: z.string(),
  Alias: z.string().nullable(),
  Subject: z.string().optional(), // Optional because Layout templates don't have subjects
  HtmlBody: z.string().optional(),
  TextBody: z.string().optional(),
  TemplateType: z.enum(["Standard", "Layout"]),
  LayoutTemplate: z.string().nullable(), // Alias of the layout template, if used
  Active: z.boolean(),
  // AssociatedServerId: z.number(), // We might not need this for the fake server
})
export type EmailTemplate = z.infer<typeof emailTemplateSchema>

export const databaseSchema = z.object({
  idCounter: z.number().default(0),
  templateIdCounter: z.number().default(1), // Start template IDs from 1
  things: z.array(thingSchema).default([]),
  postmarkEmails: z.array(postmarkEmailSchema).default([]),
  emailTemplates: z.array(emailTemplateSchema).default([]),
})
export type DatabaseSchema = z.infer<typeof databaseSchema>
