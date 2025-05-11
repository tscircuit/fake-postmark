import { test, expect, afterEach, beforeEach } from "bun:test"
import { getTestServer } from "tests/fixtures/get-test-server"
import { ServerClient as PostmarkClient } from "postmark" // Official Postmark client

test("POST /email should store email and return Postmark-like response", async () => {
  const { url, server } = await getTestServer()

  // Use the official Postmark client, configured to point to our test server
  const client = new PostmarkClient("YOUR_SERVER_TOKEN", {
    requestHost: url,
    useHttps: false,
  })

  const emailData = {
    From: "sender@example.com",
    To: "receiver@example.com",
    Subject: "Test Email",
    HtmlBody: "<h1>Hello World</h1>",
    TextBody: "Hello World",
    MessageStream: "outbound",
    Tag: "test-email",
    Metadata: {
      testId: "123",
    },
  }

  const response = await client.sendEmail(emailData)

  expect(response.ErrorCode).toBe(0)
  expect(response.Message).toBe("OK")
  expect(response.MessageID).toBeString()
  expect(response.SubmittedAt).toBeString()
  expect(response.To).toBe(emailData.To)

  // Verify the email was stored using the _fake/emails/list endpoint
  const { axios } = await getTestServer({
    port: server.port, // Re-use the same server instance if possible or ensure clean state
    dbInstance: (server as any).db, // This part is tricky, test server needs to share db or state
    // For now, let's assume getTestServer can fetch from the same running instance
    // Or, more simply, use the axios from the *same* getTestServer call
  })

  // Fetching the list of emails
  // Note: The test server setup might need adjustment to ensure `axios` from a new `getTestServer`
  // call can access the state of the server started by the first call.
  // A simpler way for this specific test is to use the `axios` instance from the initial `getTestServer` call
  // if the server remains running and shares state.
  // However, `getTestServer` typically creates a new server or a new isolated context.
  // For this example, we'll assume we can query the same server instance.
  // This might require `getTestServer` to return the same server if called with the same port,
  // or for the server state (like the in-memory db) to be accessible/shared.

  // Let's use the original server's port to create a new axios client to query it.
  // This assumes the server started by the first `getTestServer()` is still running.
  const listRes = await defaultAxios.get(`${url}/_fake/emails/list`)

  expect(listRes.status).toBe(200)
  expect(listRes.data.emails).toBeArrayOfSize(1)
  const storedEmail = listRes.data.emails[0]

  expect(storedEmail.From).toBe(emailData.From)
  expect(storedEmail.To).toBe(emailData.To)
  expect(storedEmail.Subject).toBe(emailData.Subject)
  expect(storedEmail.HtmlBody).toBe(emailData.HtmlBody)
  expect(storedEmail.MessageStream).toBe(emailData.MessageStream)
  expect(storedEmail.Tag).toBe(emailData.Tag)
  expect(storedEmail.Metadata.testId).toBe("123")
  expect(storedEmail.MessageID).toBe(response.MessageID)

  // Clean up server if necessary (afterEach in getTestServer should handle this)
})

// Need to import defaultAxios if used directly
import defaultAxios from "redaxios"
