import { createWithWinterSpec } from "winterspec"
import {
  createWithDefaultExceptionHandling,
  createWithLogger,
} from "winterspec/middleware"
import { withDb } from "./with-db"

export const withRouteSpec = createWithWinterSpec({
  apiName: "Postmark API",
  productionServerUrl: "https://api.postmarkapp.com",
  globalMiddleware: [createWithDefaultExceptionHandling()],
  beforeAuthMiddleware: [],
  authMiddleware: {},
  afterAuthMiddleware: [withDb],
})
