/**
 * Export utilities for generating downloadable files
 */

import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, BorderStyle } from 'docx';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

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
    // Heading 1
    if (line.startsWith('# ')) {
      children.push(
        new Paragraph({
          children: parseInlineFormatting(line.slice(2)),
          heading: HeadingLevel.HEADING_1,
        })
      );
    }
    // Heading 2
    else if (line.startsWith('## ')) {
      children.push(
        new Paragraph({
          children: parseInlineFormatting(line.slice(3)),
          heading: HeadingLevel.HEADING_2,
        })
      );
    }
    // Heading 3
    else if (line.startsWith('### ')) {
      children.push(
        new Paragraph({
          children: parseInlineFormatting(line.slice(4)),
          heading: HeadingLevel.HEADING_3,
        })
      );
    }
    // Heading 4
    else if (line.startsWith('#### ')) {
      children.push(
        new Paragraph({
          children: parseInlineFormatting(line.slice(5)),
          heading: HeadingLevel.HEADING_4,
        })
      );
    }
    // Heading 5
    else if (line.startsWith('##### ')) {
      children.push(
        new Paragraph({
          children: parseInlineFormatting(line.slice(6)),
          heading: HeadingLevel.HEADING_5,
        })
      );
    }
    // Heading 6
    else if (line.startsWith('###### ')) {
      children.push(
        new Paragraph({
          children: parseInlineFormatting(line.slice(7)),
          heading: HeadingLevel.HEADING_6,
        })
      );
    }
    // Nested bullet list (indented with spaces or tabs)
    else if (line.match(/^(\s{2,}|\t+)[-*] /)) {
      const match = line.match(/^(\s+)[-*] (.*)$/);
      if (match) {
        const indent = match[1].replace(/\t/g, '  ').length;
        const level = Math.min(Math.floor(indent / 2), 4); // Max 5 levels (0-4)
        children.push(
          new Paragraph({
            children: parseInlineFormatting(match[2]),
            bullet: { level },
          })
        );
      }
    }
    // Top-level bullet list
    else if (line.startsWith('- ') || line.startsWith('* ')) {
      children.push(
        new Paragraph({
          children: parseInlineFormatting(line.slice(2)),
          bullet: { level: 0 },
        })
      );
    }
    // Nested numbered list (indented with spaces or tabs)
    else if (line.match(/^(\s{2,}|\t+)\d+\. /)) {
      const match = line.match(/^(\s+)\d+\. (.*)$/);
      if (match) {
        const indent = match[1].replace(/\t/g, '  ').length;
        const level = Math.min(Math.floor(indent / 2), 4);
        children.push(
          new Paragraph({
            children: parseInlineFormatting(match[2]),
            numbering: { reference: 'default-numbering', level },
          })
        );
      }
    }
    // Top-level numbered list
    else if (line.match(/^\d+\. /)) {
      children.push(
        new Paragraph({
          children: parseInlineFormatting(line.replace(/^\d+\. /, '')),
          numbering: { reference: 'default-numbering', level: 0 },
        })
      );
    }
    // Horizontal rule
    else if (line.match(/^[-*_]{3,}\s*$/)) {
      children.push(
        new Paragraph({
          border: {
            bottom: { color: 'auto', space: 1, style: BorderStyle.SINGLE, size: 6 },
          },
        })
      );
    }
    // Empty line
    else if (line.trim() === '') {
      children.push(new Paragraph({ text: '' }));
    }
    // Regular paragraph with inline formatting
    else {
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
            { level: 0, format: 'decimal', text: '%1.', alignment: 'start' },
            { level: 1, format: 'lowerLetter', text: '%2.', alignment: 'start' },
            { level: 2, format: 'lowerRoman', text: '%3.', alignment: 'start' },
            { level: 3, format: 'decimal', text: '%4.', alignment: 'start' },
            { level: 4, format: 'lowerLetter', text: '%5.', alignment: 'start' },
          ],
        },
      ],
    },
  });
}

/**
 * Parse inline markdown formatting (bold, italic, underline, superscript, subscript)
 * Supports nested formatting like ***bold and italic***
 */
function parseInlineFormatting(text: string, inheritedStyles: { bold?: boolean; italics?: boolean; underline?: object; superScript?: boolean; subScript?: boolean } = {}): TextRun[] {
  const runs: TextRun[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    // Check for bold+italic (***text*** or ___text___)
    const boldItalicMatch = remaining.match(/^\*\*\*(.+?)\*\*\*|^___(.+?)___/);
    if (boldItalicMatch) {
      const content = boldItalicMatch[1] || boldItalicMatch[2];
      const innerRuns = parseInlineFormatting(content, { ...inheritedStyles, bold: true, italics: true });
      runs.push(...innerRuns);
      remaining = remaining.slice(boldItalicMatch[0].length);
      continue;
    }

    // Check for bold (**text** or __text__)
    const boldMatch = remaining.match(/^\*\*(.+?)\*\*|^__(.+?)__/);
    if (boldMatch) {
      const content = boldMatch[1] || boldMatch[2];
      const innerRuns = parseInlineFormatting(content, { ...inheritedStyles, bold: true });
      runs.push(...innerRuns);
      remaining = remaining.slice(boldMatch[0].length);
      continue;
    }

    // Check for italic (*text* or _text_) - improved regex that doesn't conflict with bold
    // Match single asterisk/underscore that's not followed by another
    const italicAsteriskMatch = remaining.match(/^\*(?!\*)([^*]+?)\*(?!\*)/);
    if (italicAsteriskMatch) {
      const innerRuns = parseInlineFormatting(italicAsteriskMatch[1], { ...inheritedStyles, italics: true });
      runs.push(...innerRuns);
      remaining = remaining.slice(italicAsteriskMatch[0].length);
      continue;
    }

    const italicUnderscoreMatch = remaining.match(/^_(?!_)([^_]+?)_(?!_)/);
    if (italicUnderscoreMatch) {
      const innerRuns = parseInlineFormatting(italicUnderscoreMatch[1], { ...inheritedStyles, italics: true });
      runs.push(...innerRuns);
      remaining = remaining.slice(italicUnderscoreMatch[0].length);
      continue;
    }

    // Check for underline (<u>text</u>)
    const underlineMatch = remaining.match(/^<u>(.+?)<\/u>/i);
    if (underlineMatch) {
      const innerRuns = parseInlineFormatting(underlineMatch[1], { ...inheritedStyles, underline: {} });
      runs.push(...innerRuns);
      remaining = remaining.slice(underlineMatch[0].length);
      continue;
    }

    // Check for superscript (<sup>text</sup> or ^text^)
    const supHtmlMatch = remaining.match(/^<sup>(.+?)<\/sup>/i);
    if (supHtmlMatch) {
      runs.push(new TextRun({ text: supHtmlMatch[1], ...inheritedStyles, superScript: true }));
      remaining = remaining.slice(supHtmlMatch[0].length);
      continue;
    }

    const supCaretMatch = remaining.match(/^\^([^^]+?)\^/);
    if (supCaretMatch) {
      runs.push(new TextRun({ text: supCaretMatch[1], ...inheritedStyles, superScript: true }));
      remaining = remaining.slice(supCaretMatch[0].length);
      continue;
    }

    // Check for subscript (<sub>text</sub> or ~text~ but not ~~strikethrough~~)
    const subHtmlMatch = remaining.match(/^<sub>(.+?)<\/sub>/i);
    if (subHtmlMatch) {
      runs.push(new TextRun({ text: subHtmlMatch[1], ...inheritedStyles, subScript: true }));
      remaining = remaining.slice(subHtmlMatch[0].length);
      continue;
    }

    const subTildeMatch = remaining.match(/^~(?!~)([^~]+?)~(?!~)/);
    if (subTildeMatch) {
      runs.push(new TextRun({ text: subTildeMatch[1], ...inheritedStyles, subScript: true }));
      remaining = remaining.slice(subTildeMatch[0].length);
      continue;
    }

    // Find the next potential formatting marker
    const nextMarker = remaining.search(/\*|_|<[su]|[\^~]/i);
    if (nextMarker === -1) {
      // No more markers, add rest as plain text with inherited styles
      runs.push(new TextRun({ text: remaining, ...inheritedStyles }));
      break;
    } else if (nextMarker === 0) {
      // Marker at start but didn't match any pattern - treat as literal character
      runs.push(new TextRun({ text: remaining[0], ...inheritedStyles }));
      remaining = remaining.slice(1);
    } else {
      // Add text before the marker as plain text with inherited styles
      runs.push(new TextRun({ text: remaining.slice(0, nextMarker), ...inheritedStyles }));
      remaining = remaining.slice(nextMarker);
    }
  }

  return runs.length > 0 ? runs : [new TextRun({ text, ...inheritedStyles })];
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
    book_overview: {
      title: string;
      scope: string;
      total_chapters: number;
      disciplines: string[];
      languages: string[];
    };
    chapters: Array<{
      group_id: string;
      group_type: string;
      chapter_numbers: number[];
      chapter_titles: string[];
      content_summary: string;
      thematic_quadrants: string[];
      foresight_task: string;
    }>;
    implementation_notes: string;
  }
): void {
  let markdown = `# Foresight Planning Table: ${planningData.book_overview.title}\n\n`;
  markdown += `**Scope:** ${planningData.book_overview.scope}\n\n`;
  markdown += `**Total Chapters:** ${planningData.book_overview.total_chapters}\n\n`;
  markdown += `**Disciplines:** ${planningData.book_overview.disciplines?.join(', ') || 'N/A'}\n\n`;
  markdown += `**Languages:** ${planningData.book_overview.languages?.join(', ') || 'N/A'}\n\n`;
  markdown += `## Chapter Groups\n\n`;

  for (const group of planningData.chapters || []) {
    markdown += `### ${group.group_id} (${group.group_type})\n\n`;
    markdown += `**Chapters:** ${group.chapter_numbers?.join(', ')}\n\n`;
    markdown += `**Titles:** ${group.chapter_titles?.join(', ')}\n\n`;
    markdown += `**Summary:** ${group.content_summary}\n\n`;
    markdown += `**Thematic Quadrants:** ${group.thematic_quadrants?.join(', ')}\n\n`;
    markdown += `**Foresight Task:**\n${group.foresight_task}\n\n`;
    markdown += '---\n\n';
  }

  if (planningData.implementation_notes) {
    markdown += `## Implementation Notes\n\n${planningData.implementation_notes}\n`;
  }

  const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
  const fileName = sanitizeFileName(planningData.book_overview.title) + '_planning.md';
  saveAs(blob, fileName);
}

/**
 * Planning data type for exports
 */
interface PlanningDataExport {
  book_overview: {
    title: string;
    scope: string;
    total_chapters: number;
    disciplines: string[];
    languages: string[];
  };
  chapters: Array<{
    group_id: string;
    group_type: string;
    chapter_numbers: number[];
    chapter_titles: string[];
    content_summary: string;
    thematic_quadrants: string[];
    foresight_task: string;
  }>;
  implementation_notes: string;
}

/**
 * Export planning table as Word document
 */
export async function exportPlanningTableToDocx(planningData: PlanningDataExport): Promise<void> {
  const children: (Paragraph | Table)[] = [];

  // Title
  children.push(
    new Paragraph({
      text: `Foresight Planning Table: ${planningData.book_overview.title}`,
      heading: HeadingLevel.HEADING_1,
    })
  );
  children.push(new Paragraph({ text: '' }));

  // Book Overview Section
  children.push(
    new Paragraph({
      text: 'Book Overview',
      heading: HeadingLevel.HEADING_2,
    })
  );
  children.push(new Paragraph({ text: '' }));

  // Overview table
  const overviewRows = [
    ['Scope', planningData.book_overview.scope],
    ['Total Chapters', String(planningData.book_overview.total_chapters)],
    ['Disciplines', planningData.book_overview.disciplines?.join(', ') || 'N/A'],
    ['Languages', planningData.book_overview.languages?.join(', ') || 'N/A'],
  ];

  children.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: overviewRows.map(
        ([label, value]) =>
          new TableRow({
            children: [
              new TableCell({
                width: { size: 25, type: WidthType.PERCENTAGE },
                children: [new Paragraph({ children: [new TextRun({ text: label, bold: true })] })],
              }),
              new TableCell({
                width: { size: 75, type: WidthType.PERCENTAGE },
                children: [new Paragraph({ text: value })],
              }),
            ],
          })
      ),
    })
  );
  children.push(new Paragraph({ text: '' }));

  // Chapter Groups Section
  children.push(
    new Paragraph({
      text: 'Chapter Groups',
      heading: HeadingLevel.HEADING_2,
    })
  );
  children.push(new Paragraph({ text: '' }));

  for (const group of planningData.chapters || []) {
    // Group heading
    children.push(
      new Paragraph({
        text: `${group.group_id} (${group.group_type})`,
        heading: HeadingLevel.HEADING_3,
      })
    );
    children.push(new Paragraph({ text: '' }));

    // Chapters covered
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: 'Chapters: ', bold: true }),
          new TextRun({ text: group.chapter_numbers?.join(', ') || '' }),
        ],
      })
    );

    // Chapter titles
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: 'Titles: ', bold: true }),
          new TextRun({ text: group.chapter_titles?.join(', ') || '' }),
        ],
      })
    );
    children.push(new Paragraph({ text: '' }));

    // Summary
    children.push(
      new Paragraph({
        children: [new TextRun({ text: 'Summary', bold: true })],
      })
    );
    children.push(new Paragraph({ text: group.content_summary }));
    children.push(new Paragraph({ text: '' }));

    // Thematic Quadrants
    if (group.thematic_quadrants && group.thematic_quadrants.length > 0) {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: 'Thematic Quadrants', bold: true })],
        })
      );
      for (const quadrant of group.thematic_quadrants) {
        children.push(
          new Paragraph({
            text: quadrant,
            bullet: { level: 0 },
          })
        );
      }
      children.push(new Paragraph({ text: '' }));
    }

    // Foresight Task
    children.push(
      new Paragraph({
        children: [new TextRun({ text: 'Foresight Task', bold: true })],
      })
    );
    children.push(new Paragraph({ text: group.foresight_task }));
    children.push(new Paragraph({ text: '' }));

    // Separator line (horizontal rule simulation)
    children.push(
      new Paragraph({
        border: {
          bottom: { color: 'auto', space: 1, style: BorderStyle.SINGLE, size: 6 },
        },
      })
    );
    children.push(new Paragraph({ text: '' }));
  }

  // Implementation Notes
  if (planningData.implementation_notes) {
    children.push(
      new Paragraph({
        text: 'Implementation Notes',
        heading: HeadingLevel.HEADING_2,
      })
    );
    children.push(new Paragraph({ text: '' }));
    children.push(new Paragraph({ text: planningData.implementation_notes }));
  }

  const doc = new Document({
    title: `Foresight Planning Table: ${planningData.book_overview.title}`,
    sections: [{ properties: {}, children }],
  });

  const blob = await Packer.toBlob(doc);
  const fileName = sanitizeFileName(planningData.book_overview.title) + '_planning.docx';
  saveAs(blob, fileName);
}

/**
 * Export planning table as PDF (direct download)
 */
export function exportPlanningTableToPdf(planningData: PlanningDataExport): void {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let yPos = 20;

  // Colors
  const primaryColor: [number, number, number] = [74, 74, 138]; // #4a4a8a
  const darkColor: [number, number, number] = [26, 26, 46]; // #1a1a2e
  const grayColor: [number, number, number] = [100, 100, 100];

  // Helper to check page break
  const checkPageBreak = (neededHeight: number) => {
    if (yPos + neededHeight > doc.internal.pageSize.getHeight() - 20) {
      doc.addPage();
      yPos = 20;
    }
  };

  // Title
  doc.setFontSize(20);
  doc.setTextColor(...darkColor);
  doc.setFont('helvetica', 'bold');
  doc.text('Foresight Planning Table', margin, yPos);
  yPos += 10;

  // Book title
  doc.setFontSize(14);
  doc.setTextColor(...primaryColor);
  doc.text(planningData.book_overview.title, margin, yPos);
  yPos += 5;

  // Underline
  doc.setDrawColor(...primaryColor);
  doc.setLineWidth(0.5);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 15;

  // Book Overview Section
  doc.setFontSize(14);
  doc.setTextColor(...darkColor);
  doc.setFont('helvetica', 'bold');
  doc.text('Book Overview', margin, yPos);
  yPos += 8;

  // Overview table
  autoTable(doc, {
    startY: yPos,
    margin: { left: margin, right: margin },
    head: [],
    body: [
      ['Scope', planningData.book_overview.scope],
      ['Total Chapters', String(planningData.book_overview.total_chapters)],
      ['Disciplines', planningData.book_overview.disciplines?.join(', ') || 'N/A'],
      ['Languages', planningData.book_overview.languages?.join(', ') || 'N/A'],
    ],
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 40, fillColor: [245, 245, 245] },
      1: { cellWidth: contentWidth - 40 },
    },
    styles: {
      fontSize: 10,
      cellPadding: 4,
    },
    theme: 'grid',
  });

  yPos = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 15;

  // Chapter Groups Section
  checkPageBreak(20);
  doc.setFontSize(14);
  doc.setTextColor(...darkColor);
  doc.setFont('helvetica', 'bold');
  doc.text(`Chapter Groups (${planningData.chapters?.length || 0})`, margin, yPos);
  yPos += 10;

  // Each chapter group
  for (const group of planningData.chapters || []) {
    checkPageBreak(60);

    // Group header with badge
    doc.setFillColor(...primaryColor);
    doc.roundedRect(margin, yPos - 4, 25, 7, 1, 1, 'F');
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.text(group.group_id, margin + 2, yPos);

    doc.setFontSize(11);
    doc.setTextColor(...darkColor);
    doc.setFont('helvetica', 'bold');
    const titleText = group.chapter_titles?.join(', ') || '';
    const titleLines = doc.splitTextToSize(titleText, contentWidth - 30);
    doc.text(titleLines, margin + 28, yPos);
    yPos += Math.max(8, titleLines.length * 5) + 3;

    // Chapters
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...grayColor);
    doc.text('Chapters:', margin, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(group.chapter_numbers?.join(', ') || '', margin + 25, yPos);
    yPos += 6;

    // Summary
    checkPageBreak(20);
    doc.setFont('helvetica', 'bold');
    doc.text('Summary:', margin, yPos);
    yPos += 5;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 60);
    const summaryLines = doc.splitTextToSize(group.content_summary, contentWidth);
    doc.text(summaryLines, margin, yPos);
    yPos += summaryLines.length * 5 + 4;

    // Thematic Quadrants
    if (group.thematic_quadrants && group.thematic_quadrants.length > 0) {
      checkPageBreak(15);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...grayColor);
      doc.text('Thematic Quadrants:', margin, yPos);
      yPos += 5;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(60, 60, 60);
      const quadrantsText = group.thematic_quadrants.join(' • ');
      const quadrantLines = doc.splitTextToSize(quadrantsText, contentWidth);
      doc.text(quadrantLines, margin, yPos);
      yPos += quadrantLines.length * 5 + 4;
    }

    // Foresight Task
    checkPageBreak(25);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...grayColor);
    doc.text('Foresight Task:', margin, yPos);
    yPos += 5;

    // Task box
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(40, 40, 40);
    const taskLines = doc.splitTextToSize(group.foresight_task, contentWidth - 10);
    const taskHeight = taskLines.length * 5 + 8;

    checkPageBreak(taskHeight + 5);
    doc.setFillColor(250, 250, 250);
    doc.setDrawColor(220, 220, 220);
    doc.roundedRect(margin, yPos - 2, contentWidth, taskHeight, 2, 2, 'FD');
    doc.text(taskLines, margin + 5, yPos + 4);
    yPos += taskHeight + 8;

    // Separator
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 10;
  }

  // Implementation Notes
  if (planningData.implementation_notes) {
    checkPageBreak(30);

    doc.setFillColor(255, 243, 205);
    doc.setDrawColor(255, 230, 150);
    const notesLines = doc.splitTextToSize(planningData.implementation_notes, contentWidth - 10);
    const notesHeight = notesLines.length * 5 + 20;
    doc.roundedRect(margin, yPos, contentWidth, notesHeight, 3, 3, 'FD');

    doc.setFontSize(12);
    doc.setTextColor(...darkColor);
    doc.setFont('helvetica', 'bold');
    doc.text('Implementation Notes', margin + 5, yPos + 8);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 60, 0);
    doc.text(notesLines, margin + 5, yPos + 16);
  }

  // Save the PDF
  const fileName = sanitizeFileName(planningData.book_overview.title) + '_planning.pdf';
  doc.save(fileName);
}

/**
 * Export appendix content as PDF (direct download)
 */
export function exportAppendixToPdf(content: string, title: string): void {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let yPos = 25;

  // Colors
  const primaryColor: [number, number, number] = [74, 74, 138];
  const darkColor: [number, number, number] = [26, 26, 46];
  const grayColor: [number, number, number] = [100, 100, 100];

  // Helper to check page break
  const checkPageBreak = (neededHeight: number) => {
    if (yPos + neededHeight > pageHeight - 20) {
      doc.addPage();
      yPos = 25;
    }
  };

  // Parse markdown and render
  const lines = content.split('\n');
  let inTable = false;
  let tableRows: string[][] = [];
  let tableHeaders: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();

    // Skip empty lines but add spacing
    if (trimmedLine === '') {
      if (inTable && tableRows.length > 0) {
        // End of table - render it
        checkPageBreak(40);
        renderPdfTable(doc, tableHeaders, tableRows, margin, yPos, contentWidth);
        yPos = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
        inTable = false;
        tableRows = [];
        tableHeaders = [];
      }
      yPos += 4;
      continue;
    }

    // Table row detection
    if (trimmedLine.startsWith('|') && trimmedLine.endsWith('|')) {
      const cells = trimmedLine.split('|').filter(c => c.trim() !== '');

      // Check if separator row
      if (cells.every(c => /^[-:]+$/.test(c.trim()))) {
        continue; // Skip separator
      }

      if (!inTable) {
        inTable = true;
        tableHeaders = cells.map(c => stripMarkdownFormatting(c.trim()));
      } else {
        tableRows.push(cells.map(c => stripMarkdownFormatting(c.trim())));
      }
      continue;
    }

    // If we were in a table but hit non-table content, render the table
    if (inTable && tableRows.length > 0) {
      checkPageBreak(40);
      renderPdfTable(doc, tableHeaders, tableRows, margin, yPos, contentWidth);
      yPos = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
      inTable = false;
      tableRows = [];
      tableHeaders = [];
    }

    // Heading 1
    if (trimmedLine.startsWith('# ')) {
      checkPageBreak(20);
      doc.setFontSize(18);
      doc.setTextColor(...darkColor);
      doc.setFont('helvetica', 'bold');
      const text = stripMarkdownFormatting(trimmedLine.slice(2));
      const textLines = doc.splitTextToSize(text, contentWidth);
      doc.text(textLines, margin, yPos);
      yPos += textLines.length * 8 + 6;
    }
    // Heading 2
    else if (trimmedLine.startsWith('## ')) {
      checkPageBreak(16);
      doc.setFontSize(14);
      doc.setTextColor(...primaryColor);
      doc.setFont('helvetica', 'bold');
      const text = stripMarkdownFormatting(trimmedLine.slice(3));
      const textLines = doc.splitTextToSize(text, contentWidth);
      doc.text(textLines, margin, yPos);
      yPos += textLines.length * 6 + 5;
    }
    // Heading 3
    else if (trimmedLine.startsWith('### ')) {
      checkPageBreak(14);
      doc.setFontSize(12);
      doc.setTextColor(...darkColor);
      doc.setFont('helvetica', 'bold');
      const text = stripMarkdownFormatting(trimmedLine.slice(4));
      const textLines = doc.splitTextToSize(text, contentWidth);
      doc.text(textLines, margin, yPos);
      yPos += textLines.length * 5 + 4;
    }
    // Heading 4-6
    else if (trimmedLine.match(/^#{4,6} /)) {
      checkPageBreak(12);
      doc.setFontSize(11);
      doc.setTextColor(...grayColor);
      doc.setFont('helvetica', 'bold');
      const text = stripMarkdownFormatting(trimmedLine.replace(/^#{4,6} /, ''));
      const textLines = doc.splitTextToSize(text, contentWidth);
      doc.text(textLines, margin, yPos);
      yPos += textLines.length * 5 + 3;
    }
    // Nested bullet (starts with spaces/tab then - or *)
    else if (line.match(/^(\s{2,}|\t)[-*] /)) {
      checkPageBreak(8);
      doc.setFontSize(10);
      doc.setTextColor(80, 80, 80);
      doc.setFont('helvetica', 'normal');
      const match = line.match(/^(\s+)[-*] (.*)$/);
      if (match) {
        const indent = Math.min(Math.floor(match[1].replace(/\t/g, '  ').length / 2), 3) * 6;
        const text = stripMarkdownFormatting(match[2]);
        const textLines = doc.splitTextToSize(text, contentWidth - 10 - indent);
        doc.text('◦', margin + indent, yPos);
        doc.text(textLines, margin + indent + 6, yPos);
        yPos += textLines.length * 5 + 2;
      }
    }
    // Top-level bullet list
    else if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ')) {
      checkPageBreak(8);
      doc.setFontSize(10);
      doc.setTextColor(60, 60, 60);
      doc.setFont('helvetica', 'normal');
      const text = stripMarkdownFormatting(trimmedLine.slice(2));
      const textLines = doc.splitTextToSize(text, contentWidth - 10);
      doc.text('•', margin, yPos);
      doc.text(textLines, margin + 8, yPos);
      yPos += textLines.length * 5 + 2;
    }
    // Numbered list
    else if (trimmedLine.match(/^\d+\. /)) {
      checkPageBreak(8);
      doc.setFontSize(10);
      doc.setTextColor(60, 60, 60);
      doc.setFont('helvetica', 'normal');
      const match = trimmedLine.match(/^(\d+)\. (.*)$/);
      if (match) {
        const num = match[1];
        const text = stripMarkdownFormatting(match[2]);
        const textLines = doc.splitTextToSize(text, contentWidth - 12);
        doc.text(`${num}.`, margin, yPos);
        doc.text(textLines, margin + 10, yPos);
        yPos += textLines.length * 5 + 2;
      }
    }
    // Horizontal rule
    else if (trimmedLine.match(/^[-*_]{3,}$/)) {
      checkPageBreak(10);
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.3);
      doc.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 8;
    }
    // Blockquote
    else if (trimmedLine.startsWith('> ')) {
      checkPageBreak(12);
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.setFont('helvetica', 'italic');
      const text = stripMarkdownFormatting(trimmedLine.slice(2));
      const textLines = doc.splitTextToSize(text, contentWidth - 15);
      // Draw left border
      doc.setDrawColor(...primaryColor);
      doc.setLineWidth(2);
      doc.line(margin, yPos - 2, margin, yPos + textLines.length * 5);
      doc.text(textLines, margin + 8, yPos);
      yPos += textLines.length * 5 + 4;
    }
    // Regular paragraph
    else {
      checkPageBreak(10);
      doc.setFontSize(10);
      doc.setTextColor(40, 40, 40);
      doc.setFont('helvetica', 'normal');
      const text = stripMarkdownFormatting(trimmedLine);
      const textLines = doc.splitTextToSize(text, contentWidth);
      doc.text(textLines, margin, yPos);
      yPos += textLines.length * 5 + 3;
    }
  }

  // Render any remaining table
  if (inTable && tableRows.length > 0) {
    checkPageBreak(40);
    renderPdfTable(doc, tableHeaders, tableRows, margin, yPos, contentWidth);
  }

  // Save the PDF
  const fileName = sanitizeFileName(title) + '.pdf';
  doc.save(fileName);
}

/**
 * Helper to render a table using jspdf-autotable
 */
function renderPdfTable(
  doc: jsPDF,
  headers: string[],
  rows: string[][],
  margin: number,
  yPos: number,
  contentWidth: number
): void {
  autoTable(doc, {
    startY: yPos,
    margin: { left: margin, right: margin },
    head: headers.length > 0 ? [headers] : undefined,
    body: rows,
    headStyles: {
      fillColor: [74, 74, 138],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
    },
    bodyStyles: {
      fontSize: 9,
      cellPadding: 3,
    },
    alternateRowStyles: {
      fillColor: [245, 245, 250],
    },
    styles: {
      overflow: 'linebreak',
      cellWidth: 'wrap',
    },
    theme: 'grid',
  });
}

/**
 * Strip markdown formatting for plain text (used in PDF)
 */
function stripMarkdownFormatting(text: string): string {
  return text
    .replace(/\*\*\*(.+?)\*\*\*/g, '$1')  // Bold+Italic ***text***
    .replace(/___(.+?)___/g, '$1')         // Bold+Italic ___text___
    .replace(/\*\*(.+?)\*\*/g, '$1')       // Bold **text**
    .replace(/__(.+?)__/g, '$1')           // Bold __text__
    .replace(/\*(.+?)\*/g, '$1')           // Italic *text*
    .replace(/_(.+?)_/g, '$1')             // Italic _text_
    .replace(/<u>(.+?)<\/u>/gi, '$1')      // Underline
    .replace(/<sup>(.+?)<\/sup>/gi, '$1')  // Superscript HTML
    .replace(/<sub>(.+?)<\/sub>/gi, '$1')  // Subscript HTML
    .replace(/\^(.+?)\^/g, '$1')           // Superscript ^text^
    .replace(/~(.+?)~/g, '$1')             // Subscript ~text~
    .replace(/`(.+?)`/g, '$1')             // Inline code
    .replace(/\[(.+?)\]\(.+?\)/g, '$1');   // Links [text](url)
}

