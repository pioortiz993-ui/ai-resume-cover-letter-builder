# AI Resume & Cover Letter Builder

A small browser-based final project for AD-ET 101. The responsive frontend is plain HTML, CSS, and JavaScript. A Cloudflare Worker calls Google Gemini with a server-side API key. The resume and letter drafts, including saved versions, stay in this browser's localStorage.

## Features

- Edit personal details, summary, experience, education, skills, projects, certifications, awards, organizations, volunteering, and languages. Add, remove, and reorder repeatable entries.
- Live preview with Modern, Classic, and Minimal templates.
- Gemini-powered resume wording improvements, supported skills, cover letter creation, cover letter improvement, and job posting analysis. AI results come from a real upstream request; there are no demo responses.
- Review suggestions before applying them. The generated cover letter remains editable.
- Save, reopen, and delete local versions. Use Download PDF, then select **Save as PDF** in the browser print dialog.

## Open in VS Code and run locally

1. Extract the ZIP and open the `ai-resume-cover-letter-builder` folder in VS Code.
2. Install [Node.js](https://nodejs.org/) version 20 or newer if needed. In VS Code, open **Terminal → New Terminal**.
3. Run `npm run dev`. Open the printed `http://localhost:5173` URL in your browser. There are no packages to install.
4. For the AI buttons, copy `.env.example` to `.env`, then add a Google AI Studio key after `GEMINI_API_KEY=`. Restart `npm run dev`. The key stays on the local server and is not put in frontend JavaScript.

Without a key, the editor, previews, saved versions, and PDF print flow still work. AI requests report that Gemini is not configured; they never show a fake result.

### Folder structure

```text
ai-resume-cover-letter-builder/
├── dist/
│   ├── client/            # index.html, styles.css, app.js
│   └── server/index.js    # secure Gemini API route
├── dev-server.mjs         # local frontend + API server
├── package.json
├── .env.example
├── .gitignore
└── README.md
```

## Configure Gemini

1. Create a Gemini API key in [Google AI Studio](https://aistudio.google.com/app/apikey). Check the current free tier and limits for your account.
2. In the site's private environment variable settings, add `GEMINI_API_KEY` as a **secret**. Do not paste it into frontend code, Git, screenshots, or a published README.
3. Deploy a saved site version after changing the variable. Check `/api/health`; `aiConfigured` should be `true`.
4. Enter a real work-experience sentence, select **Improve with AI**, review the suggestion, and apply it. Try job analysis and the letter generator too.

## How it works

The browser sends the current text and relevant context to `/api/ai`. The Worker validates the request, adds a task-specific instruction against invented credentials, and calls Gemini's `generateContent` endpoint. The key only exists in the Worker environment. The browser receives the resulting text. A missing key, bad input, quota limit, network failure, or empty result produces an honest error; there is no simulated result.

Data is stored per browser and is not synced across devices. Clearing site data deletes saved work. The Gemini service processes text sent through AI actions. Print output uses the browser's PDF printer, so page breaks may vary by device.

## Demo flow

Add a name, role, summary, experience, and education. Review the live preview and switch templates. Improve the experience sentence with Gemini and apply it. Paste a job description in Job analyzer, then generate and edit a cover letter. Save a version and export each document using the browser's Save as PDF destination.

## Troubleshooting

- **AI not configured**: add `GEMINI_API_KEY` to the deployment's secret environment and redeploy.
- **Rate limit**: wait and retry, or inspect the limit in AI Studio.
- **No result**: give the assistant concrete applicant facts; it will not invent experience.
- **Blank PDF**: enter a name or letter content before using Download PDF.
