import { createStore, type StoreApi } from "zustand/vanilla"
// import { immer } from "zustand/middleware/immer" // Not currently used, but available
import { hoist, type HoistedStoreApi } from "zustand-hoist"

import { databaseSchema, type DatabaseSchema, type Thing, type PostmarkEmail } from "./schema.ts"
import { combine } from "zustand/middleware"
import { v4 as uuidv4 } from "uuid"

export const createDatabase = () => {
  return hoist(createStore(initializer))
}

export type DbClient = ReturnType<typeof createDatabase>

// Define the input type for adding an email, omitting server-generated fields
export type NewPostmarkEmail = Omit<PostmarkEmail, "MessageID" | "SubmittedAt" | "ErrorCode" | "StatusMessage">

// Input type for adding a templated email.
// Subject, HtmlBody, TextBody are omitted as they will be generated.
// Headers are expected to be transformed into a Record.
export type InputForTemplatedEmail = {
  From: string;
  To: string;
  Cc?: string;
  Bcc?: string;
  Tag?: string;
  ReplyTo?: string;
  Headers?: Record<string, string>;
  TrackOpens?: boolean;
  TrackLinks?: "None" | "HtmlAndText" | "HtmlOnly" | "TextOnly";
  Metadata?: Record<string, string>;
  Attachments?: Array<{
    Name: string;
    Content: string; // Base64 encoded content
    ContentType: string;
    ContentID?: string | null;
  }>;
  MessageStream?: string;
  TemplateModel: Record<string, any>;
} & ({ TemplateId: number; TemplateAlias?: string } | { TemplateId?: number; TemplateAlias: string });


const initializer = combine(databaseSchema.parse({}), (set, get) => ({
  addThing: (thing: Omit<Thing, "thing_id">) => {
    set((state) => ({
      things: [
        ...state.things,
        { ...thing, thing_id: state.idCounter.toString() },
      ],
      idCounter: state.idCounter + 1,
    }))
  },
  addPostmarkEmail: (emailData: NewPostmarkEmail): PostmarkEmail => {
    const newEmail: PostmarkEmail = {
      ...emailData,
      MessageID: uuidv4(),
      SubmittedAt: new Date().toISOString(),
      ErrorCode: 0,
      StatusMessage: "OK",
    }
    set((state) => ({
      postmarkEmails: [...state.postmarkEmails, newEmail],
    }))
    return newEmail
  },
  getPostmarkEmails: (): PostmarkEmail[] => {
    return get().postmarkEmails
  },
  addTemplatedPostmarkEmail: (emailData: InputForTemplatedEmail): PostmarkEmail => {
    const { TemplateId, TemplateAlias, TemplateModel } = emailData;
    // Fake generation of content based on template info
    const subject = `Templated Subject (ID: ${TemplateId ?? "N/A"}, Alias: ${TemplateAlias ?? "N/A"})`;
    const htmlBody = `<h1>Templated Email</h1><p>Template ID: ${TemplateId ?? "N/A"}, Template Alias: ${TemplateAlias ?? "N/A"}</p><p>Model: ${JSON.stringify(TemplateModel)}</p>`;
    const textBody = `Templated Email. Template ID: ${TemplateId ?? "N/A"}, Template Alias: ${TemplateAlias ?? "N/A"}. Model: ${JSON.stringify(TemplateModel)}`;

    const newEmail: PostmarkEmail = {
      ...emailData, // Spreads common fields like From, To, Tag, Metadata, etc.
      // Explicitly set template fields that are part of PostmarkEmail schema
      TemplateId: emailData.TemplateId,
      TemplateAlias: emailData.TemplateAlias,
      TemplateModel: emailData.TemplateModel,
      // Generated fields
      Subject: subject,
      HtmlBody: htmlBody,
      TextBody: textBody,
      // Server-generated fields
      MessageID: uuidv4(),
      SubmittedAt: new Date().toISOString(),
      ErrorCode: 0,
      StatusMessage: "OK",
    };
    set((state) => ({
      postmarkEmails: [...state.postmarkEmails, newEmail],
    }));
    return newEmail;
  },
}))
