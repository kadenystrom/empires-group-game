# Security Policy

## Supported Versions

Because Empires is a client-side web application deployed directly via GitHub Pages, only the latest release running on the `main` branch is actively supported with security updates and bug fixes.

| Version / Branch | Supported          |
| ---------------- | ------------------ |
| `main` (Latest)  | :white_check_mark: |
| Older commits    | :x:                |

## Reporting a Vulnerability

If you discover a potential security flaw, database rule exposure, or injection vulnerability in this project, please report it responsibly.

### How to Report
* **Email:** You can send details directly to **kadeinystrom@gmail.com** with the subject line `[Empires Security Report]`.
* **LinkedIn:** You can reach out via message on [LinkedIn](https://www.linkedin.com/in/kade-nystrom/).
* **GitHub Security Advisory:** You can submit a private report via the repository's **Security** tab under **Report a vulnerability** (if enabled).

### What to Expect
* **Acknowledgment:** Expect an initial response within 48 to 72 hours of the report.
* **Resolution:** If a vulnerability is confirmed, a patch will be merged directly into the `main` branch and deployed live to GitHub Pages.
* **Client-Side Configuration Note:** The Firebase API key in `script.js` is intentionally public for frontend communication, with access restricted by HTTP referrer in Google Cloud Console and data integrity enforced via Firebase Realtime Database validation rules[cite: 7].
