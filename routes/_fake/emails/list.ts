import { withRouteSpec } from "lib/middleware/with-winter-spec"
import { z } from "zod"
import { postmarkEmailSchema } from "lib/db/schema"

export default withRouteSpec({
  methods: ["GET"],
  jsonResponse: z.object({
    emails: z.array(postmarkEmailSchema),
  }),
  auth: "none", // No auth for this internal debug endpoint
} as const)((req, ctx) => {
  const emails = ctx.db.getPostmarkEmails()
  return ctx.json({ emails })
})
