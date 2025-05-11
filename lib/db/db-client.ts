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
  }
}))
