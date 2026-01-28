/**
 * AI Prompts for Appendix Generation
 * Ported from Python prompts.py - Full detailed version
 */

export function getAnalysisPrompt(bookContent: string): string {
  return `You are tasked with analyzing a book to prepare a "Forward Thinking - Foresight" framework. Your goal is to create a structured planning document that will guide the subsequent generation of future-oriented appendices for each chapter (or chapter group).

## THE BOOK CONTENT

The following is the extracted text from the book.
NOTE: For very long books, some middle content may have been truncated (marked with "[... CONTENT TRUNCATED ...]"). However, the beginning (including Table of Contents) and end of the book are preserved.

<book_content>
${bookContent}
</book_content>

## YOUR TASK

### STEP 1: READ AND MAP THE BOOK - FIND ALL CHAPTERS
CRITICAL: You must identify ALL chapters in the book, not just the ones with full content.

To find all chapters:
1. FIRST look for a Table of Contents (usually near the beginning) - this lists ALL chapters
2. Look for chapter headings throughout the text (e.g., "Chapter 1:", "CHAPTER ONE", "1.", etc.)
3. Look for Part/Section divisions that may contain multiple chapters
4. Check BOTH the beginning AND end of the text for chapter markers
5. If content was truncated, infer missing chapters from the Table of Contents or chapter numbering patterns

For each chapter, note:
- Chapter number and title
- Approximate page location (if visible)
- Whether full content is available or only referenced in TOC

### STEP 2: ANALYZE EACH CHAPTER
For each chapter (even if content was truncated), determine:
- Core subject matter and key arguments (from available content or TOC entry)
- Main concepts, theories, or frameworks introduced
- The chapter's role within the book's overall narrative
- Key conceptual drivers that would anchor a foresight analysis

For chapters with truncated content, base your analysis on:
- The chapter title
- Any partial content available
- Context from surrounding chapters
- The Table of Contents description (if any)

### STEP 3: IDENTIFY THEMATIC QUADRANTS
For each chapter (or group), identify 3-5 thematic quadrants that organize the chapter's subject matter. These quadrants will structure the Futures Radar analysis in the appendix.

Examples of quadrant themes:
- Economic & Technological Transformation
- National Power & Security
- Social Cohesion & Governance
- Well-Being & Life Satisfaction
- Environmental Resilience
- Institutional Evolution
- Labor & Demographics
- Knowledge & Innovation Systems

### STEP 4: IDENTIFY POTENTIAL CHAPTER GROUPINGS
Group chapters ONLY if:
- They address the same core phenomenon from different angles
- A combined appendix would be more coherent than separate ones
- Separate appendices would result in significant redundancy

Keep chapters STANDALONE if:
- They have a distinct, self-contained focus
- Their foresight implications are unique

### STEP 5: CREATE THE FORESIGHT PLANNING TABLE

## OUTPUT FORMAT

Respond with a JSON object in this exact structure:

{
  "book_overview": {
    "title": "Book title",
    "scope": "Brief description of the book's scope",
    "total_chapters": 0,
    "disciplines": ["List", "of", "disciplines"],
    "languages": ["Languages used"]
  },
  "chapters": [
    {
      "group_id": "GROUP_A or STANDALONE_1",
      "group_type": "GROUP or STANDALONE",
      "chapter_numbers": [1, 2, 3],
      "chapter_titles": ["Title 1", "Title 2", "Title 3"],
      "content_summary": "3-5 sentence summary of the chapter(s) content",
      "thematic_quadrants": ["Quadrant 1", "Quadrant 2", "Quadrant 3", "Quadrant 4"],
      "foresight_task": "Detailed 200-350 word assignment brief specifying: (A) Futures Radar Analysis instructions with phenomena to examine across 4 layers, (B) Cross-Impact Matrix requirements, (C) 4 scenario specifications (optimistic, pessimistic, transformative, baseline), (D) Policy narrative areas to address, (E) Parameters including time horizon and word count target"
    }
  ],
  "implementation_notes": "Any observations for the person generating appendices, including notes about chapters with limited content"
}

IMPORTANT:
- Include ALL chapters from the book, even if some content was truncated
- The total_chapters count must match the actual number of chapters in the book
- The foresight_task must be detailed and specific to the chapter content
- Include specific phenomena, trends, and wild cards relevant to each chapter
- Specify time horizon (typically 2040-2050) and word count (typically 2000-4000 words)
- In implementation_notes, mention any chapters that had limited content due to truncation
- Respond ONLY with the JSON object, no additional text`;
}

export function getGenerationPrompt(
  targetAssignment: string,
  chapterInfo: string,
  bookContent: string,
  wordCount: string = "2500-3500",
  forecastYears: number = 15
): string {
  const targetYear = new Date().getFullYear() + forecastYears;

  return `You are tasked with writing a "Forward Thinking - Foresight" appendix for a specific chapter or group of a book.

## TARGET ASSIGNMENT

Generate the appendix for: ${targetAssignment}

## CHAPTER INFORMATION FROM PLANNING TABLE

${chapterInfo}

## RELEVANT BOOK CONTENT

<book_content>
${bookContent.slice(0, 100000)}
</book_content>

## YOUR TASK

Write a complete appendix following this structure:

### SECTION 1: PURPOSE STATEMENT
Begin with 1-2 paragraphs explaining:
- The purpose of this supplementary material
- Why it accompanies this particular chapter
- That these perspectives represent structured interpretations, not certainties
- That the appendix includes elements like wild cards and strengthening trends

### SECTION 2: CHAPTER SYNTHESIS
Provide 2-3 paragraphs covering:
- The chapter's main arguments and frameworks
- The key conceptual drivers identified
- How these connect to broader societal/policy challenges
- The thematic quadrants that organize the analysis

### SECTION 3: FUTURES RADAR ANALYSIS
For each thematic quadrant specified in the assignment:

Analyze phenomena across four layers:
1. **Main Drivers** — Primary forces shaping future trajectories
2. **Important Aspects** — Significant factors currently influencing the domain
3. **Potential Changes to Come** — Mid- to long-term developments on the horizon
4. **Wild Cards** — Low-probability but high-impact disruptive events

Classify each phenomenon by trajectory:
- **Weak Signal** — Emerging issues that may gain importance
- **Strengthening** — Trends increasing in influence
- **Established** — Stable factors already shaping present/future
- **Weakening** — Elements declining in influence
- **Wild Card** — Low probability, high impact

Explain interconnections between quadrants.

### SECTION 4: CROSS-IMPACT MATRIX
Create a table showing how phenomena in each quadrant affect the others. Format:

| Realm ↓ / Aim → | [Quadrant 1] | [Quadrant 2] | [Quadrant 3] | [Quadrant 4] |
|-----------------|--------------|--------------|--------------|--------------|
| [Quadrant 1] | — | Impact description | Impact description | Impact description |
| [Quadrant 2] | Impact description | — | Impact description | Impact description |
| [Quadrant 3] | Impact description | Impact description | — | Impact description |
| [Quadrant 4] | Impact description | Impact description | Impact description | — |

### SECTION 5: ALTERNATIVE FUTURE SCENARIOS
Develop 4 distinct scenarios for the year ${targetYear}:

For each scenario provide:
- A descriptive name
- Likelihood assessment (e.g., "Moderately Likely", "Possible but Policy-Dependent")
- 2-3 paragraph narrative explaining how this future unfolds

Ensure diversity:
- At least one optimistic trajectory
- At least one pessimistic/risk trajectory
- At least one transformation scenario
- At least one baseline/continuation scenario

Then create a Scenario Comparison Table:

| Dimension | Scenario 1 | Scenario 2 | Scenario 3 | Scenario 4 |
|-----------|------------|------------|------------|------------|
| [Dimension 1] | Description | Description | Description | Description |
| [Dimension 2] | Description | Description | Description | Description |
| Social Impact | Description | Description | Description | Description |

### SECTION 6: POLICY NARRATIVES & RECOMMENDATIONS
Translate foresight into concrete, actionable policy suggestions organized thematically (A, B, C, etc.):

For each policy area include:
- The strategic objective
- Specific measures or interventions
- Who should act (government, institutions, civil society, private sector)
- How this builds resilience or anticipatory capacity
- Potential challenges or trade-offs

### SECTION 7: CONCLUSION
End with:
- Key takeaways (3-5 bullet points)
- Critical uncertainties to monitor
- A statement acknowledging that uncertainty cannot be eliminated, but adaptability and resilience can be cultivated

## QUALITY REQUIREMENTS

Your appendix MUST:
- Be grounded in the chapter's specific content, terminology, and frameworks
- Show interdisciplinary connections
- Distinguish between established trends, emerging signals, and wild cards
- Present multiple plausible futures, not just one preferred outcome
- Provide concrete recommendations with specific actors and actions
- Show how phenomena in different domains affect each other
- Acknowledge uncertainty and limitations

## OUTPUT

Write the complete appendix in Markdown format. Target length: ${wordCount} words.
Use proper Markdown formatting including headers (##, ###), tables, bullet points, and bold text.`;
}
