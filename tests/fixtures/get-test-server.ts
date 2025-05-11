import { afterEach } from "bun:test"
import { tmpdir } from "node:os"
import kyDefault from "ky" // Changed from ky-universal
import { startServer } from "./start-server"

interface TestFixture {
  url: string
  server: any
  ky: typeof kyDefault
}

export const getTestServer = async (): Promise<TestFixture> => {
  const port = 3001 + Math.floor(Math.random() * 999)
  const testInstanceId = Math.random().toString(36).substring(2, 15)
  const testDbName = `testdb${testInstanceId}`

  const server = await startServer({
    port,
    testDbName,
  })

  const url = `http://127.0.0.1:${port}`
  const ky = kyDefault.create({
    prefixUrl: url,
    throwHttpErrors: true, // Default, but explicit
  })

  afterEach(async () => {
    await server.stop()
    // Here you might want to add logic to drop the test database
  })

  return {
    url,
    server,
    ky,
  }
}
