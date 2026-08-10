import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

type Redirect = { source: string; destination: string; permanent: boolean }

test("historical Search Console URLs redirect once to canonical routes", () => {
  const config = JSON.parse(
    readFileSync(new URL("../../vercel.json", import.meta.url), "utf8"),
  ) as { redirects?: Redirect[] }
  const redirects = config.redirects ?? []
  const bySource = new Map(redirects.map((redirect) => [redirect.source, redirect]))

  assert.equal(redirects.length, 83)
  assert.equal(bySource.size, redirects.length)
  assert.deepEqual(bySource.get("/About"), {
    source: "/About",
    destination: "/about",
    permanent: true,
  })
  assert.equal(
    bySource.get("/mvc-mvvm")?.destination,
    "/software-architecture/application-architecture/presentation-architecture-variants",
  )
  assert.equal(
    bySource.get("/software-engineering/02-computer-science/data-structures/list")?.destination,
    "/computer-science/data-structures/linear-structures/dynamic-array",
  )
  assert.equal(
    bySource.get("/plug-in-architecture-\\(microkernel\\)")?.destination,
    "/software-architecture/application-architecture/plug-in-architecture-%28microkernel%29",
  )
  assert.equal(
    bySource.get("/software-engineering/07-security/authentication/sso-single-sign-on")
      ?.destination,
    "/security/authentication/sso-%28single-sign-on%29",
  )

  for (const redirect of redirects) {
    assert.equal(redirect.permanent, true)
    assert.match(redirect.source, /^\/[^?]*[^/]$/)
    assert.match(redirect.destination, /^\/[^?]*[^/]$/)
    assert.doesNotMatch(redirect.source, /(^|[^\\])[()]/)
    assert.doesNotMatch(redirect.destination, /(^|[^\\])[()]/)
    assert.doesNotMatch(redirect.destination, /\\/)
    assert.equal(bySource.has(redirect.destination), false)
  }
})
