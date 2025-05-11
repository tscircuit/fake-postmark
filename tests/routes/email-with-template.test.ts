import { test, expect } from "bun:test"
import { getTestServer } from "tests/fixtures/get-test-server"
import { ServerClient as PostmarkClient } from "postmark" // Official Postmark client
import type { PostmarkEmail } from "lib/db/schema"

test("POST /email/withTemplate should store email (using TemplateId) and return Postmark-like response", async () => {
  const { url, ky: serverKy } = await getTestServer()

  const client = new PostmarkClient("YOUR_SERVER_TOKEN", {
    requestHost: new URL(url).host,
    useHttps: false,
  })

  const emailData = {
    From: "sender-id@example.com",
    To: "receiver-id@example.com",
    TemplateId: 9876,
    TemplateModel: {
      customer_name: "Jane Doe",
      product_name: "Super Widget",
    },
    Tag: "test-templateid-email",
    Metadata: {
      testRun: "template-id-run-123",
    },
  }

  const response = await client.sendEmailWithTemplate(emailData)

  expect(response.ErrorCode).toBe(0)
  expect(response.Message).toBe("OK")
  expect(response.MessageID).toBeString()
  expect(response.SubmittedAt).toBeString()
  expect(response.To).toBe(emailData.To)

  // Verify the email was stored using the _fake/emails/list endpoint
  const listResData = await serverKy.get("_fake/emails/list").json<{emails: PostmarkEmail[]}>()
  
  const storedEmail = listResData.emails.find((e: PostmarkEmail) => e.MessageID === response.MessageID)
  expect(storedEmail).toBeDefined()

  if (!storedEmail) return // Type guard

  expect(storedEmail.From).toBe(emailData.From)
  expect(storedEmail.To).toBe(emailData.To)
  expect(storedEmail.Tag).toBe(emailData.Tag)
  expect(storedEmail.Metadata?.testRun).toBe(emailData.Metadata.testRun)
  expect(storedEmail.TemplateId).toBe(emailData.TemplateId)
  expect(storedEmail.TemplateAlias).toBeUndefined()
  expect(storedEmail.TemplateModel).toEqual(emailData.TemplateModel)
  
  // Check generated fields (basic check for fake implementation)
  expect(storedEmail.Subject).toContain(`ID: ${emailData.TemplateId}`)
  expect(storedEmail.Subject).toContain(`Alias: N/A`)
  expect(storedEmail.HtmlBody).toContain(`Template ID: ${emailData.TemplateId}`)
  expect(storedEmail.HtmlBody).toContain(JSON.stringify(emailData.TemplateModel))
})

test("POST /email/withTemplate should store email (using TemplateAlias) and return Postmark-like response", async () => {
  const { url, ky: serverKy } = await getTestServer()

  const client = new PostmarkClient("YOUR_SERVER_TOKEN", {
    requestHost: new URL(url).host,
    useHttps: false,
  })

  const emailData = {
    From: "sender-alias@example.com",
    To: "receiver-alias@example.com",
    TemplateAlias: "my-custom-alias",
    TemplateModel: {
      username: "JohnSmith",
      order_id: "XYZ123",
    },
    Tag: "test-templatealias-email",
  }

  const response = await client.sendEmailWithTemplate(emailData)

  expect(response.ErrorCode).toBe(0)
  expect(response.Message).toBe("OK")
  expect(response.MessageID).toBeString()

  // Verify the email was stored
  const listResData = await serverKy.get("_fake/emails/list").json<{emails: PostmarkEmail[]}>()

  const storedEmail = listResData.emails.find((e: PostmarkEmail) => e.MessageID === response.MessageID)
  expect(storedEmail).toBeDefined()

  if (!storedEmail) return // Type guard

  expect(storedEmail.From).toBe(emailData.From)
  expect(storedEmail.To).toBe(emailData.To)
  expect(storedEmail.Tag).toBe(emailData.Tag)
  expect(storedEmail.TemplateId).toBeUndefined()
  expect(storedEmail.TemplateAlias).toBe(emailData.TemplateAlias)
  expect(storedEmail.TemplateModel).toEqual(emailData.TemplateModel)

  // Check generated fields
  expect(storedEmail.Subject).toContain(`ID: N/A`)
  expect(storedEmail.Subject).toContain(`Alias: ${emailData.TemplateAlias}`)
  expect(storedEmail.HtmlBody).toContain(`Template Alias: ${emailData.TemplateAlias}`)
  expect(storedEmail.HtmlBody).toContain(JSON.stringify(emailData.TemplateModel))
})

test("POST /email/withTemplate should store email (using both TemplateId and TemplateAlias)", async () => {
  const { url, ky: serverKy } = await getTestServer();

  const client = new PostmarkClient("YOUR_SERVER_TOKEN", {
    requestHost: new URL(url).host,
    useHttps: false,
  });

  const emailData = {
    From: "sender-both@example.com",
    To: "receiver-both@example.com",
    TemplateId: 1122,
    TemplateAlias: "alias-takes-precedence-or-id-does", // Behavior might depend on Postmark client or server
    TemplateModel: {
      user_id: "user456",
    },
  };

  // The Postmark client might prioritize one if both are sent.
  // Our Zod schema allows both. The db function stores both if provided.
  const response = await client.sendEmailWithTemplate(emailData);

  expect(response.ErrorCode).toBe(0);
  expect(response.Message).toBe("OK");

  const listResData = await serverKy.get("_fake/emails/list").json<{emails: PostmarkEmail[]}>();
  const storedEmail = listResData.emails.find((e: PostmarkEmail) => e.MessageID === response.MessageID);
  expect(storedEmail).toBeDefined();

  if (!storedEmail) return;

  expect(storedEmail.TemplateId).toBe(emailData.TemplateId);
  expect(storedEmail.TemplateAlias).toBe(emailData.TemplateAlias);
  // Check generated subject based on how addTemplatedPostmarkEmail prioritizes
  expect(storedEmail.Subject).toContain(`ID: ${emailData.TemplateId}`);
  expect(storedEmail.Subject).toContain(`Alias: ${emailData.TemplateAlias}`);
});
