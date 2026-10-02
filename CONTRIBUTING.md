# Contributing

Thanks for helping improve Cherrypicker! Bug reports, ideas and pull requests are all welcome.

## Before you start

- **Found a bug or have an idea?** Open an issue first, especially for anything larger than a small fix, so we can agree
  on the approach before you spend time on it.
- **Security problem?** Don't open a public issue. See [SECURITY.md](./SECURITY.md).
- Read the architecture notes: [backend](./src/README.md) and [frontend](./client-vite/client/README.md). They explain
  the code flow end to end.

## Setting up

You need Node.js 20+, git 2.31+, and a GitHub account with a repository you can test on.

```bash
git clone https://github.com/arunnair018/node-cherrypicker.git
cd node-cherrypicker
npm install
npm --prefix client-vite/client install
npm run dev          # server on :8086 and the UI with hot reload on http://localhost:5173
```

Please **test against a throwaway repository**, not a real one. The tool pushes branches and opens pull requests.

## Making a change

- Keep pull requests **small and focused** on one thing.
- Match the style of the surrounding code. The UI has a linter: `npm --prefix client-vite/client run lint`.
- There is no automated test suite yet. In your PR description, say **how you tested it** (what you ran and what you saw).
  Adding tests is a very welcome contribution.
- Update the README or architecture docs if you change behaviour.
- Never commit secrets, tokens, `.env` files, or screenshots and logs that show private repository, branch or company names.

## Licensing of contributions

By submitting a contribution you agree that it is licensed under the project's [MIT License](./LICENSE), and that you have
the right to contribute it (it is your own work, or you have permission). Do not include code copied from projects with
incompatible licenses or from your employer's private code.
