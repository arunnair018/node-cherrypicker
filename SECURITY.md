# Security policy

node-cherrypicker handles a GitHub token and runs git commands on your machine, so security reports are taken seriously.

## Reporting a vulnerability

Please **do not open a public issue** for a security problem.

Use GitHub's private reporting instead: go to the repository's **Security** tab, choose **Report a vulnerability**, and
describe what you found, how to reproduce it, and the impact. You will get a response as soon as the maintainer can
(this is a volunteer project, so there is no guaranteed turnaround).

## What is in scope

- Any way for a web page or another machine to reach the local server (it is meant to be reachable only from `localhost`).
- Any leak of the GitHub token (to disk, logs, the process list, the browser, or a third party).
- Command injection through branch names, PR numbers, paths or any other input.
- Anything that could modify a repository other than the one you selected, or lose your uncommitted work.

## Supported versions

Only the latest commit on `main` is supported.

## How it is designed

See [Security and privacy](./README.md#security-and-privacy) and the
[backend security design](./src/README.md#security-design).
