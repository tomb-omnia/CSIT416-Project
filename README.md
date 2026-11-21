# PhishGuard UI Prototype

Interactive, clickable prototype for the CSIT 416 PhishGuard Use Case Specification (UC1 to UC35).
Client side only: all data is simulated and lives in memory. See `CLAUDE.md` for scope and conventions.

## Run

```
npm install
npm run dev       # http://localhost:5173
npm run build     # production build in dist/ (works from any path, uses HashRouter)
npm run lint
```

## Demo tips

- **Sign in:** use the *Demo sign-in* buttons on the login page, then the **Viewing as** switcher in the top bar to change roles without losing data.
- **Reloading the page resets all data** unless *Keep data in this browser* is on in Demo Controls.
- **Demo Controls** (bottom right, or Ctrl+Shift+D): slow service, service unavailable, one-shot save/notification failures, partial purge failure, reset data.
- **Seeded alternate paths:**
  - Report `40319233` is "already classified" by another officer (UC19).
  - Incident `52044951` is being reviewed by another officer (UC30).
  - Account `hsato` is under access review by another admin (UC34).
  - Activity `LOG-20110` is already flagged (UC35).
  - Jamie Morales already has a certificate for *Phishing Fundamentals* (UC33).
  - Imensah and jmorales already have *Remedial: Spotting Lookalike Domains* (UC22).
  - The *Archived Interns* group has no active users (UC21).
- **Mock verdicts:** blocklisted domains, raw IP hosts, URL shorteners, and lookalikes (`paypa1`, `rnicrosoft`, `montclair-edu`) are malicious. The Scan Attachment page has sample-file buttons.
- **Credential prompt (UC3):** any password works except `wrong`.
- **Awareness landing page:** `#/aware/PT-301`.
