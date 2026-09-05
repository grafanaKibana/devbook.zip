const demand = () => {
  if (!document.querySelector(`.flowmaid-mount[data-flowmaid-program]`)) return
  document.removeEventListener(`nav`, demand)
  document.removeEventListener(`render`, demand)
  const loadRuntime = new Function(
    `return import(\`/static/flowmaid/flowmaid.js\`)`,
  ) as () => Promise<unknown>
  void loadRuntime().catch((error) => {
    document.addEventListener(`nav`, demand)
    document.addEventListener(`render`, demand)
    document.querySelectorAll<HTMLElement>(`.flowmaid-mount[data-flowmaid-program]`).forEach((mount) => {
      if (mount.querySelector(`:scope > .flowmaid-diagnostic`)) return
      const message = mount.ownerDocument.createElement(`p`)
      message.className = `flowmaid-diagnostic`
      message.textContent = `Flowmaid: ${error instanceof Error ? error.message : String(error)}`
      mount.append(message)
    })
  })
}

document.addEventListener(`nav`, demand)
document.addEventListener(`render`, demand)
demand()
