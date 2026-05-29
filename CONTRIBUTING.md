# Contributing to Intaroom

Thank you for your interest in contributing! This project is licensed under
[CC BY-NC 4.0](LICENSE) — contributions are welcome for non-commercial use only.

## Getting started

1. Fork the repository and create your branch from `main`.
2. Copy `.env.example` to `.env.local` and fill in your own credentials.
3. Install dependencies:
   ```bash
   pnpm install
   ```
4. Run the development server:
   ```bash
   pnpm dev
   ```

## Making changes

- Keep pull requests focused on a single concern.
- Follow the existing code style (TypeScript, Tailwind, Next.js App Router).
- Do not commit `.env`, `.env.local`, or any file containing real credentials.
- Run `pnpm lint` and `pnpm build` before opening a PR — both must pass.

## Reporting issues

Open a GitHub Issue with:
- A clear title describing the problem.
- Steps to reproduce.
- Expected vs. actual behaviour.
- Your environment (OS, Node version, browser).

## Security issues

Do **not** open a public issue for security vulnerabilities. Email the
maintainer directly instead, and allow reasonable time for a fix before
any public disclosure.

## Credential policy

Never commit real usernames, passwords, API keys, or service-role keys.
The default admin seed in `db_setup/` uses placeholder values that must be
replaced before any production deployment (see `.env.example`).

## License

By submitting a contribution you agree that your work will be licensed under
the same [CC BY-NC 4.0](LICENSE) terms as the rest of the project.
