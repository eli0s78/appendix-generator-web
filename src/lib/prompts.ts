/**
 * AI Prompts for Appendix Generation
 * Ported from Python prompts.py
 */

export function getAnalysisPrompt(bookContent: string): string {
  return `You are an expert academic analyst specializing in identifying future research directions.

Analyze the following book content and create a structured planning table for generating future-oriented appendices.

IMPORTANT: The appendices will serve as a "crystal ball" looking 10-15 years into the future of the field.
They should explore how AI, technology, and societal changes might transform the topics discussed.

For each major theme or chapter cluster in the book, identify:
1. The core topic/theme
2. Key concepts that could evolve
3. Potential future directions worth exploring

Return your analysis as a JSON object with this EXACT structure:
{
  "book_overview": {
    "title": "Detected or inferred book title",
    "main_theme": "Central theme of the book",
    "field": "Academic field (e.g., Psychology, Business, Medicine)",
    "estimated_publication_year": "YYYY or 'Unknown'"
  },
  "chapter_analysis": [
    {
      "chapter_number": 1,
      "chapter_title": "Chapter title if detected, or descriptive title",
      "main_topics": ["topic1", "topic2", "topic3"],
      "key_concepts": ["concept1", "concept2"],
      "future_potential": "Brief description of future directions"
    }
  ],
  "recommended_appendix_groups": [
    {
      "group_id": "A1",
      "theme": "Thematic grouping name",
      "chapters_covered": [1, 2, 3],
      "rationale": "Why these chapters form a cohesive appendix topic",
      "suggested_title": "Future of X: AI and Beyond",
      "key_questions": [
        "What will X look like in 2035-2040?",
        "How might AI transform X?"
      ]
    }
  ],
  "generation_notes": "Any special considerations for generating appendices"
}

BOOK CONTENT:
${bookContent}

Return ONLY the JSON object, no additional text.`;
}

export function getGenerationPrompt(
  targetAssignment: string,
  chapterInfo: string,
  bookContent: string,
  wordCount: string = "2500-3500"
): string {
  return `You are an expert academic writer creating a future-oriented appendix for an academic book.

APPENDIX ASSIGNMENT: ${targetAssignment}

CHAPTER CONTEXT:
${chapterInfo}

Write a compelling, scholarly appendix that:

1. FUTURE FOCUS (10-15 years ahead):
   - Explore how AI, machine learning, and automation might transform this field
   - Consider technological disruptions and their implications
   - Discuss potential paradigm shifts in methodology and practice
   - Address emerging ethical considerations

2. STRUCTURE:
   - Opening hook that captures attention
   - Clear thesis about the future trajectory
   - 3-4 main sections with substantive analysis
   - Integration of current trends as launching points
   - Thought-provoking conclusion

3. STYLE:
   - Academic but accessible tone
   - Balance speculation with grounded analysis
   - Include specific scenarios and examples
   - Reference relevant emerging technologies
   - Connect to themes from the original chapters

4. LENGTH: ${wordCount} words

REFERENCE MATERIAL (from the book):
${bookContent.slice(0, 50000)}

Write the appendix now. Start directly with the title and content. Format in Markdown.`;
}
