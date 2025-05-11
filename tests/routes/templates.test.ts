import { test, expect } from "bun:test"
import { getTestServer } from "tests/fixtures/get-test-server"
import { ServerClient as PostmarkClient } from "postmark"
import type { EmailTemplate } from "lib/db/schema"

test("POST /templates should create a Standard template and return Postmark-like response", async () => {
  const { url, ky: serverKy } = await getTestServer()

  // Using ky directly as the official Postmark client doesn't have a method for /templates POST
  // and we want to test our specific endpoint implementation.
  const templateData = {
    Name: "Test Standard Template",
    Alias: "test-standard-v1",
    Subject: "Welcome, {{name}}!",
    HtmlBody: "<h1>Hello {{name}}!</h1>",
    TextBody: "Hello {{name}}!",
    TemplateType: "Standard",
    LayoutTemplate: "my-base-layout",
  }

  const response = await serverKy.post("templates", { json: templateData })
  const createdTemplate = await response.json<EmailTemplate>()

  // expect(response.status).toBe(200) // Implicit with ky if no error is thrown
  expect(createdTemplate.TemplateId).toBeInteger()
  expect(createdTemplate.TemplateId).toBeGreaterThan(0)
  expect(createdTemplate.Name).toBe(templateData.Name)
  expect(createdTemplate.Active).toBe(true)
  expect(createdTemplate.Alias).toBe(templateData.Alias)
  expect(createdTemplate.TemplateType).toBe("Standard")
  expect(createdTemplate.LayoutTemplate).toBe(templateData.LayoutTemplate)
  expect(createdTemplate.Subject).toBe(templateData.Subject)

  // Optional: Verify storage if a GET /_fake/templates/list endpoint existed
  // For now, we trust the response reflects what would be stored.
})

test("POST /templates should create a Layout template and return Postmark-like response", async () => {
  const { url, ky: serverKy } = await getTestServer()

  const templateData = {
    Name: "Test Layout Template",
    Alias: "base-layout-v2",
    HtmlBody: "<html><head></head><body>{{{ @content }}}</body></html>",
    TextBody: "{{{ @content }}}",
    TemplateType: "Layout",
  }

  const response = await serverKy.post("templates", { json: templateData })
  const createdTemplate = await response.json<EmailTemplate>()

  // expect(response.status).toBe(200) // Implicit with ky
  expect(createdTemplate.TemplateId).toBeInteger()
  expect(createdTemplate.TemplateId).toBeGreaterThan(0) // Assuming it's the next ID
  expect(createdTemplate.Name).toBe(templateData.Name)
  expect(createdTemplate.Active).toBe(true)
  expect(createdTemplate.Alias).toBe(templateData.Alias)
  expect(createdTemplate.TemplateType).toBe("Layout")
  expect(createdTemplate.LayoutTemplate).toBeNull() // Not specified
  expect(createdTemplate.Subject).toBeUndefined() // Layouts don't have subjects
})
