  // ───────────────────────────────── lcs ─────────────────────────────────
  registerDP("lcs", { label: "Longest common subsequence" }, (input, ops) => {
    const A = String(input.a != null ? input.a : input.text || "")
    const B = String(input.b != null ? input.b : input.pattern || "")
    const m = A.length
    const n = B.length
    const rowLabels = ["∅", ...A.split("")]
    const colLabels = ["∅", ...B.split("")]
    ops.board(
      rowLabels,
      colLabels,
      `Longest common subsequence of "${A}" and "${B}". Cell dp[i][j] holds the LCS length of the first i letters of "${A}" and the first j of "${B}".`,
    )
    const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0))
    for (let c = 0; c <= n; c++) ops.set(0, c, 0, [], `An empty first string has LCS 0.`)
    for (let r = 1; r <= m; r++) ops.set(r, 0, 0, [], `An empty second string has LCS 0.`)
    for (let r = 1; r <= m; r++) {
      for (let c = 1; c <= n; c++) {
        if (A[r - 1] === B[c - 1]) {
          dp[r][c] = dp[r - 1][c - 1] + 1
          ops.set(
            r,
            c,
            dp[r][c],
            [[r - 1, c - 1]],
            `'${A[r - 1]}' = '${B[c - 1]}' → take the diagonal + 1 = ${dp[r][c]}.`,
          )
        } else {
          dp[r][c] = Math.max(dp[r - 1][c], dp[r][c - 1])
          const better = dp[r - 1][c] >= dp[r][c - 1] ? "top" : "left"
          ops.set(
            r,
            c,
            dp[r][c],
            [
              [r - 1, c],
              [r, c - 1],
            ],
            `'${A[r - 1]}' ≠ '${B[c - 1]}' → this letter can't extend the match, so the optimum here is inherited from an optimal sub-answer: the better of top (${dp[r - 1][c]}) and left (${dp[r][c - 1]}) = ${dp[r][c]} (from the ${better}).`,
          )
        }
      }
    }
    // Per-step traceback: walk the corner back to the origin one move at a time,
    // so the reader watches the answer decompose into the sub-answers it was
    // built from. The LCS path grows by one cell on each diagonal (match) step;
    // a mismatch step inherits the optimum from the better neighbour (optimal
    // substructure) without adding a letter.
    let r = m
    let c = n
    const path = []
    while (r > 0 && c > 0) {
      if (A[r - 1] === B[c - 1]) {
        path.unshift([r, c])
        ops.markPath(
          path,
          `dp[${r}][${c}]: '${A[r - 1]}' = '${B[c - 1]}' — this cell was built from dp[${r - 1}][${c - 1}] + 1, so '${A[r - 1]}' joins the LCS. Step diagonally to that sub-answer.`,
        )
        r--
        c--
      } else if (dp[r - 1][c] >= dp[r][c - 1]) {
        ops.markPath(
          path,
          `dp[${r}][${c}]: '${A[r - 1]}' ≠ '${B[c - 1]}' — its optimum was inherited from the top sub-answer dp[${r - 1}][${c}]. Follow it upward; no letter added.`,
        )
        r--
      } else {
        ops.markPath(
          path,
          `dp[${r}][${c}]: '${A[r - 1]}' ≠ '${B[c - 1]}' — its optimum was inherited from the left sub-answer dp[${r}][${c - 1}]. Follow it leftward; no letter added.`,
        )
        c--
      }
    }
    const lcs = path.map((p) => A[p[0] - 1]).join("")
    ops.markPath(
      path,
      `Traceback done: the ${path.length} diagonal step${path.length === 1 ? "" : "s"} spell the LCS "${lcs}".`,
    )
    ops.done(`LCS length = ${dp[m][n]} ("${lcs}").`)
  })

