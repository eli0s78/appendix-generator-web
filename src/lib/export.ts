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

