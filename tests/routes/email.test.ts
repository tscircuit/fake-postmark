import { test, expect, afterEach, beforeEach } from "bun:test"
import { getTestServer } from "tests/fixtures/get-test-server"
import { ServerClient as PostmarkClient } from "postmark" // Official Postmark client

test("POST /email should store email and return Postmark-like response", async () => {
  const { url, server, ky: serverKy } = await getTestServer()

  // Use the official Postmark client, configured to point to our test server
  const client = new PostmarkClient("YOUR_SERVER_TOKEN", {
    requestHost: new URL(url).host, // Extract 'hostname:port' from the full URL
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
  // Use the ky instance associated with the server the email was sent to.
  const listResData = await serverKy
    .get("_fake/emails/list")
    .json<{ emails: any[] }>()

  expect(listResData.emails).toBeArrayOfSize(1)
  const storedEmail = listResData.emails[0]

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
