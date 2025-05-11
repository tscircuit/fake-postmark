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

test("POST /templates should fail if Subject is provided for a Layout template", async () => {
  const { ky: serverKy } = await getTestServer()

  const templateData = {
    Name: "Layout With Subject Fail",
    Alias: "layout-fail-subject",
    HtmlBody: "<body>{{{ @content }}}</body>",
    TemplateType: "Layout",
    Subject: "This should not be here",
  }

  try {
    await serverKy.post("templates", { json: templateData })
    // If the request succeeds, the test should fail
    expect(true).toBe(false) // Force fail if no error thrown
  } catch (error: any) {
    expect(error.response.status).toBe(400) // Expecting Bad Request
    const errorBody = await error.response.json()
    expect(errorBody.error.issues[0].message).toBe("Subject is not allowed for Layout templates.")
  }
})

test("POST /templates should fail if Subject is missing for a Standard template", async () => {
  const { ky: serverKy } = await getTestServer()

  const templateData = {
    Name: "Standard Missing Subject",
    Alias: "standard-fail-subject",
    HtmlBody: "<body>Hello</body>",
    TemplateType: "Standard",
    // Subject is missing
  }

  try {
    await serverKy.post("templates", { json: templateData })
    expect(true).toBe(false) // Force fail
  } catch (error: any) {
    expect(error.response.status).toBe(400)
    const errorBody = await error.response.json()
    expect(errorBody.error.issues[0].message).toBe("Subject is required for Standard templates.")
  }
})

test("POST /templates should fail if neither HtmlBody nor TextBody is provided", async () => {
  const { ky: serverKy } = await getTestServer()

  const templateData = {
    Name: "No Body Template",
    Alias: "no-body-v1",
    Subject: "A Subject",
    TemplateType: "Standard",
    // HtmlBody and TextBody are missing
  }

  try {
    await serverKy.post("templates", { json: templateData })
    expect(true).toBe(false) // Force fail
  } catch (error: any) {
    expect(error.response.status).toBe(400)
    const errorBody = await error.response.json()
    expect(errorBody.error.issues[0].message).toBe("Either HtmlBody or TextBody must be provided.")
  }
})
