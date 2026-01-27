/**
 * PDF Text Extractor
 * Uses PDF.js to extract text from PDFs in the browser
 *
 * IMPORTANT: PDF.js is dynamically imported to prevent server-side rendering issues
 */

export interface ExtractionResult {
  text: string;
  info: {
    pages: number;
    estimatedWords: number;
    estimatedChars: number;
    bibliographyRemoved: boolean;
    bibliographyCharsSaved: number;
    indexRemoved: boolean;
    indexCharsSaved: number;
    wasTruncated: boolean;
    keptPercentage: number;
    originalChars: number;
  };
}

export interface ExtractionProgress {
  current: number;
  total: number;
  status: string;
}

/**
 * Extract text from a PDF file
 * Dynamically imports PDF.js to avoid server-side rendering issues
 */
export async function extractTextFromPdf(
  file: File,
  onProgress?: (progress: ExtractionProgress) => void
): Promise<ExtractionResult> {
  // Dynamically import PDF.js only on the client side
  const pdfjsLib = await import('pdfjs-dist');

  // Set up the worker
  pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const totalPages = pdf.numPages;

  onProgress?.({ current: 0, total: totalPages, status: 'Starting extraction...' });

  const textContent: string[] = [];

  for (let i = 1; i <= totalPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item) => ('str' in item ? item.str : ''))
      .join(' ');

    if (pageText.trim()) {
      textContent.push(`[Page ${i}]\n${pageText}`);
    }

    onProgress?.({
      current: i,
      total: totalPages,
      status: `Extracting page ${i} of ${totalPages}...`,
    });
  }

  let fullText = textContent.join('\n\n');
  const originalChars = fullText.length;

  onProgress?.({ current: totalPages, total: totalPages, status: 'Processing content...' });

  // Remove bibliography
  const { text: afterBib, removed: bibRemoved, charsSaved: bibCharsSaved } =
    detectAndRemoveBibliography(fullText);
  fullText = afterBib;

  // Remove index
  const { text: afterIndex, removed: indexRemoved, charsSaved: indexCharsSaved } =
    detectAndRemoveIndex(fullText);
  fullText = afterIndex;

  // Smart truncation
  const { text: finalText, wasTruncated, keptPercentage } = truncateContentSmart(fullText);

  const estimatedWords = finalText.split(/\s+/).length;

  return {
    text: finalText,
    info: {
      pages: totalPages,
      estimatedWords,
      estimatedChars: finalText.length,
      bibliographyRemoved: bibRemoved,
      bibliographyCharsSaved: bibCharsSaved,
      indexRemoved,
      indexCharsSaved,
      wasTruncated,
      keptPercentage,
      originalChars,
    },
  };
}

/**
 * Detect and remove bibliography sections
 */
function detectAndRemoveBibliography(content: string): {
  text: string;
  removed: boolean;
  charsSaved: number;
} {
  const originalLength = content.length;

  const bibPatterns = [
    /\[Page \d+\]\s*\n?\s*(References|Bibliography|Works Cited|Literature Cited|Sources|Cited Works|Reference List|Works Referenced)\s*\n/gi,
    /\n\s*(References|Bibliography|Works Cited|Literature Cited|Cited Works|Reference List)\s*\n/gi,
    /\n\s*(?:Chapter\s+)?\d*\.?\s*(References|Bibliography)\s*\n/gi,
  ];

  let bibStart: number | null = null;

  for (const pattern of bibPatterns) {
    const matches = [...content.matchAll(pattern)];
    for (const match of matches) {
      if (match.index !== undefined && match.index > content.length * 0.6) {
        if (bibStart === null || match.index < bibStart) {
          bibStart = match.index;
        }
      }
    }
  }

  if (bibStart !== null) {
    // Check for appendix after bibliography
    const remaining = content.slice(bibStart);
    const appendixMatch = remaining.match(
      /\[Page \d+\]\s*\n?\s*(Appendix|Appendices)\s/i
    );

    if (appendixMatch && appendixMatch.index !== undefined) {
      content = content.slice(0, bibStart) + remaining.slice(appendixMatch.index);
    } else {
      content = content.slice(0, bibStart);
    }

    return {
      text: content,
      removed: true,
      charsSaved: originalLength - content.length,
    };
  }

  return { text: content, removed: false, charsSaved: 0 };
}

/**
 * Detect and remove index sections
 */
function detectAndRemoveIndex(content: string): {
  text: string;
  removed: boolean;
  charsSaved: number;
} {
  const originalLength = content.length;

  const indexPatterns = [
    /\[Page \d+\]\s*\n?\s*(Subject Index|Author Index|Index|Name Index|General Index)\s*\n/gi,
    /\n\s*(Subject Index|Author Index|Index|Name Index|General Index)\s*\n/gi,
  ];

  let indexStart: number | null = null;

  for (const pattern of indexPatterns) {
    const matches = [...content.matchAll(pattern)];
    for (const match of matches) {
      if (match.index !== undefined && match.index > content.length * 0.8) {
        if (indexStart === null || match.index < indexStart) {
          indexStart = match.index;
        }
      }
    }
  }

  if (indexStart !== null) {
    content = content.slice(0, indexStart);
    return {
      text: content,
      removed: true,
      charsSaved: originalLength - content.length,
    };
  }

  return { text: content, removed: false, charsSaved: 0 };
}

/**
 * Smart truncation preserving beginning and end
 */
function truncateContentSmart(
  content: string,
  maxChars: number = 1000000
): { text: string; wasTruncated: boolean; keptPercentage: number } {
  if (content.length <= maxChars) {
    return { text: content, wasTruncated: false, keptPercentage: 100 };
  }

  const beginningChars = Math.floor(maxChars * 0.55);
  const endChars = Math.floor(maxChars * 0.45);

  let beginning = content.slice(0, beginningChars);
  const lastPageBreak = beginning.lastIndexOf('[Page ');
  if (lastPageBreak > beginningChars * 0.8) {
    beginning = beginning.slice(0, lastPageBreak);
  }

  let ending = content.slice(-endChars);
  const firstPageBreak = ending.indexOf('[Page ');
  if (firstPageBreak !== -1 && firstPageBreak < endChars * 0.2) {
    ending = ending.slice(firstPageBreak);
  }

  const truncated =
    beginning +
    '\n\n[... CONTENT TRUNCATED FOR LENGTH - MIDDLE SECTION OMITTED ...]\n\n' +
    ending;

  return {
    text: truncated,
    wasTruncated: true,
    keptPercentage: Math.round((truncated.length / content.length) * 100 * 10) / 10,
  };
}
