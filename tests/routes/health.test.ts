import { it, expect } from "bun:test"
import { getTestServer } from "tests/fixtures/get-test-server"

it("GET /health should return ok", async () => {
  const { ky } = await getTestServer()
  const response = await ky.get("health")
  // expect(response.status).toBe(200) // Implicit with ky on success
  expect(await response.json()).toEqual({ ok: true })
})
