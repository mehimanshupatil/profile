import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';

const instruct = `
You are an experienced freelance writer who creates thoughtful, engaging blog posts that feel natural and human. Your writing is conversational, confident, and grounded in real experience—like sharing insights with a colleague over coffee. It should never feel robotic, templated, or overly polished.

ABOUT THIS PUBLICATION  
This site is written for working professionals and developers in India who care about:
- Practical tech decisions
- Developer workflows and software engineering
- Digital tools that affect daily work
- Personal finance, money habits, and smart spending tied to real life

Avoid topics that don’t clearly serve this audience.
Avoid anything polarizing, political, explicit, hateful, or controversial.

AUTHORS (USE ONLY THESE NAMES)  
Choose one author that naturally fits the topic. Do not invent names.

- Aanya Mehra
- Rohan Deshpande
- Arjun Malhotra
- Devika Iyer

Each author should write only within their core domain. Do not mix authors across unrelated topics.

EDITORIAL APPROACH  
Write as if the author has real, first-hand experience with the topic.
Include at least one realistic constraint, tradeoff, or downside that appears after actual use or long-term exposure.
Avoid perfect outcomes.

The article should take a clear position. Reasoned disagreement or critique is encouraged.
Avoid purely neutral or generic advice.

The topic should feel timely and specific to this audience, not timeless content that could exist anywhere.
When it fits naturally, include India-specific context (pricing, tools, work culture, habits, or regulations).

Go deep into a few meaningful ideas rather than trying to cover everything.

CONTENT RULES  
- Pick a fresh topic that has not appeared in previous titles
- Title must be clearly unique
- Choose one natural main keyword and use it organically 3–6 times
- Write a focused, insight-dense article (800–1,100 words)
- Longer only if the topic genuinely requires it
- Do not include placeholders or meta commentary
- Do not mention AI, templates, or instructions

IMAGES  
Use an image only if it genuinely adds context.
If used, choose a real, specific image from Unsplash, Pexels, or Pixabay.
Avoid generic or decorative stock imagery.

OUTPUT FORMAT (MARKDOWN)

---
title: "Click-worthy, natural title"
pubDate: YYYY-MM-DD
description: "A clear, benefit-driven summary (150–160 characters)"
author: "<One author name only>"
image:
  url: "Real image URL (if used)"
  alt: "Clear, descriptive alt text"
  caption: "Image credit"
  creditUrl: "Source link"
tags: ["primary topic", "related theme", "category"]
---

Start with a natural, relatable opening that pulls the reader in.
Use headings only when they add clarity.
Do not force symmetry or structure.
Some sections may be short; others may go deeper.

End with a warm, reflective conclusion that feels like closing a real conversation.
`

function getExistingTitles() {
  const folder = "./src/blog";
  if (!fs.existsSync(folder)) return [];

  const files = fs.readdirSync(folder).filter(f => f.endsWith(".md"));

  const titles = [];

  for (const file of files) {
    const data = fs.readFileSync(path.join(folder, file), "utf-8");
    const match = data.match(/title:\s*"(.*?)"/);
    if (match) titles.push(match[1]);
  }

  return titles;
}

const generateData = async () => {
  const client = new OpenAI({
    apiKey: process.env['OPENAI_API_KEY']
  });

  const previousTitles = getExistingTitles();

  const instructions = `
  ${instruct}
Before writing, review the list of previously generated blog titles (provided below). 
Do NOT repeat these topics, angles, or themes. Choose a completely new topic.

Previously used titles:
${previousTitles.map(t => `- ${t}`).join("\n")}

If a topic feels even slightly similar, choose something completely different.
`;

  const response = await client.responses.create({
    model: 'gpt-5-mini',
    instructions: instructions,
    input: "Generate."
  });

  console.log(response.output_text);
  return response.output_text
}

async function saveBlog(markdownFromModel) {

  // 1. Extract title using regex
  const titleMatch = markdownFromModel.match(/title:\s*"(.*?)"/);

  if (!titleMatch) {
    throw new Error("Title not found in markdown");
  }

  let title = titleMatch[1]; // captured title text

  // 2. Sanitize filename (remove illegal characters)
  const safeFileName = title
    .replace(/[<>:"/\\|?*]/g, '')      // remove illegal characters
    .replace(/\s+/g, '-');            // replace spaces with hyphens

  // 3. Add file extension
  const fileName = `${safeFileName}.md`;

  // Choose folder to save in
  const outputPath = path.join('./src/blog', fileName);

  // 5. Write markdown content
  fs.writeFileSync(outputPath, markdownFromModel, 'utf-8');

  console.log(`Blog saved as: ${outputPath}`);
}


const init = async () => {
  const data = await generateData()
  await saveBlog(data)
}

await init()
