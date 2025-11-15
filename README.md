# 📚 Daily AI-Generated Blog Automation

Automatically generate a human-like, SEO-friendly blog every day using OpenAI, GitHub Actions, and GitHub Pages. Each day a fresh blog post is created, saved into this repository, and published automatically.

---

## 🚀 Features

- **Daily generation** of a 1,200–1,600 word blog post using an OpenAI model.  
- **Human-like writing**: conversational, natural, and personality-driven.  
- **SEO-friendly**: invisible SEO (keyword used naturally, scannable headings).  
- **Real images**: uses real stock image URLs from Unsplash / Pexels / Pixabay.  
- **Automated publish**: builds the site with PNPM and deploys to GitHub Pages.  
- **Fictional author names**: realistic, rotating author names (no real-person PII).

---
 

## 🔐 Setup

1. **Add your OpenAI API key** to GitHub Secrets:
   - Go to **Settings → Secrets → Actions → New repository secret**
   - Name: `OPENAI_API_KEY`
   - Value: `<your_openai_api_key>`

2. Ensure the repository has:
   - `scripts/generate-blog.js`
   - `package.json` with scripts (e.g., `build`)
   - `pnpm-lock.yaml`

3. Confirm GitHub Pages is enabled for the repo (the workflow will deploy to Pages).

---

## ⚡ How it works

- A GitHub Actions workflow runs on a schedule (daily) or manually.
- The workflow installs PNPM, installs dependencies, runs `scripts/generate-blog.js` which:
  - Calls the OpenAI API with your writing template
  - Receives Markdown output
  - Extracts & sanitizes the title
  - Saves the file under `src/blog`  
- The repo is built (`pnpm build`) and `dist/` is deployed to GitHub Pages.

---
 