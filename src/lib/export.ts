/**
 * Export utilities for generating downloadable files
 */

import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

/**
 * Export content as Markdown file
 */
export function exportToMarkdown(content: string, title: string): void {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  const fileName = sanitizeFileName(title) + '.md';
  saveAs(blob, fileName);
}

/**
 * Export content as Word document
 */
export async function exportToDocx(content: string, title: string): Promise<void> {
  const doc = createDocxFromMarkdown(content, title);
  const blob = await Packer.toBlob(doc);
  const fileName = sanitizeFileName(title) + '.docx';
  saveAs(blob, fileName);
}

/**
 * Create a DOCX document from markdown content
 */
function createDocxFromMarkdown(markdown: string, title: string): Document {
  const lines = markdown.split('\n');
  const children: Paragraph[] = [];

  for (const line of lines) {
    if (line.startsWith('# ')) {
      children.push(
        new Paragraph({
          text: line.slice(2),
          heading: HeadingLevel.HEADING_1,
        })
      );
    } else if (line.startsWith('## ')) {
      children.push(
        new Paragraph({
          text: line.slice(3),
          heading: HeadingLevel.HEADING_2,
        })
      );
    } else if (line.startsWith('### ')) {
      children.push(
        new Paragraph({
          text: line.slice(4),
          heading: HeadingLevel.HEADING_3,
        })
      );
    } else if (line.startsWith('#### ')) {
      children.push(
        new Paragraph({
          text: line.slice(5),
          heading: HeadingLevel.HEADING_4,
        })
      );
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      children.push(
        new Paragraph({
          text: line.slice(2),
          bullet: { level: 0 },
        })
      );
    } else if (line.match(/^\d+\. /)) {
      children.push(
        new Paragraph({
          text: line.replace(/^\d+\. /, ''),
          numbering: { reference: 'default-numbering', level: 0 },
        })
      );
    } else if (line.trim() === '') {
      children.push(new Paragraph({ text: '' }));
    } else {
      // Handle bold and italic
      const runs: TextRun[] = parseInlineFormatting(line);
      children.push(new Paragraph({ children: runs }));
    }
  }

  return new Document({
    title,
    sections: [
      {
        properties: {},
        children,
      },
    ],
    numbering: {
      config: [
        {
          reference: 'default-numbering',
          levels: [
            {
              level: 0,
              format: 'decimal',
              text: '%1.',
              alignment: 'start',
            },
          ],
        },
      ],
    },
  });
}

/**
 * Parse inline markdown formatting (bold, italic)
 */
function parseInlineFormatting(text: string): TextRun[] {
  const runs: TextRun[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    // Check for bold (**text** or __text__)
    const boldMatch = remaining.match(/^\*\*(.+?)\*\*|^__(.+?)__/);
    if (boldMatch) {
      runs.push(new TextRun({ text: boldMatch[1] || boldMatch[2], bold: true }));
      remaining = remaining.slice(boldMatch[0].length);
      continue;
    }

    // Check for italic (*text* or _text_)
    const italicMatch = remaining.match(/^\*([^*]+?)\*|^_([^_]+?)_/);
    if (italicMatch) {
      runs.push(new TextRun({ text: italicMatch[1] || italicMatch[2], italics: true }));
      remaining = remaining.slice(italicMatch[0].length);
      continue;
    }

    // Find the next formatting marker
    const nextMarker = remaining.search(/\*|_/);
    if (nextMarker === -1) {
      runs.push(new TextRun({ text: remaining }));
      break;
    } else if (nextMarker === 0) {
      runs.push(new TextRun({ text: remaining[0] }));
      remaining = remaining.slice(1);
    } else {
      runs.push(new TextRun({ text: remaining.slice(0, nextMarker) }));
      remaining = remaining.slice(nextMarker);
    }
  }

  return runs.length > 0 ? runs : [new TextRun({ text })];
}

/**
 * Export all appendices as a ZIP file
 */
export async function exportAllAsZip(
  appendices: Record<string, string>,
  bookTitle: string
): Promise<void> {
  const zip = new JSZip();
  const folder = zip.folder('appendices');

  if (!folder) {
    throw new Error('Failed to create ZIP folder');
  }

  for (const [groupId, content] of Object.entries(appendices)) {
    const safeName = sanitizeFileName(groupId);

    // Add Markdown
    folder.file(`${safeName}.md`, content);

    // Add DOCX
    const doc = createDocxFromMarkdown(content, groupId);
    const docxBlob = await Packer.toBlob(doc);
    folder.file(`${safeName}.docx`, docxBlob);
  }

  const zipBlob = await zip.generateAsync({ type: 'blob' });
  const zipFileName = sanitizeFileName(bookTitle || 'appendices') + '_all.zip';
  saveAs(zipBlob, zipFileName);
}

/**
 * Sanitize a string for use as a filename
 */
function sanitizeFileName(name: string): string {
  return name
    .replace(/[^\w\s-]/g, '_')
    .replace(/\s+/g, '_')
    .slice(0, 50)
    .trim() || 'untitled';
}

/**
 * Export planning table as Markdown
 */
export function exportPlanningTableToMarkdown(
  planningData: {
    book_overview: { title: string; main_theme: string; field: string };
    recommended_appendix_groups: Array<{
      group_id: string;
      theme: string;
      chapters_covered: number[];
      suggested_title: string;
      rationale: string;
    }>;
  }
): void {
  let markdown = `# Planning Table: ${planningData.book_overview.title}\n\n`;
  markdown += `**Theme:** ${planningData.book_overview.main_theme}\n`;
  markdown += `**Field:** ${planningData.book_overview.field}\n\n`;
  markdown += `## Recommended Appendices\n\n`;

  for (const group of planningData.recommended_appendix_groups) {
    markdown += `### ${group.group_id}: ${group.theme}\n\n`;
    markdown += `**Suggested Title:** ${group.suggested_title}\n\n`;
    markdown += `**Chapters Covered:** ${group.chapters_covered.join(', ')}\n\n`;
    markdown += `**Rationale:** ${group.rationale}\n\n`;
    markdown += '---\n\n';
  }

  const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
  const fileName = sanitizeFileName(planningData.book_overview.title) + '_planning.md';
  saveAs(blob, fileName);
}
