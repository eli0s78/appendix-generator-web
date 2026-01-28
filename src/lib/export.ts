/**
 * Export utilities for generating downloadable files
 */

import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, BorderStyle } from 'docx';
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
 * Export planning table as PDF (opens print dialog)
 */
export function exportPlanningTableToPdf(planningData: PlanningDataExport): void {
  // Create HTML content for PDF
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Foresight Planning Table: ${escapeHtml(planningData.book_overview.title)}</title>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 800px;
      margin: 0 auto;
      padding: 40px;
    }
    h1 { color: #1a1a2e; border-bottom: 2px solid #4a4a8a; padding-bottom: 10px; }
    h2 { color: #2d2d5a; margin-top: 30px; }
    h3 { color: #4a4a8a; margin-top: 25px; }
    .overview-table { width: 100%; border-collapse: collapse; margin: 15px 0; }
    .overview-table td { padding: 8px 12px; border: 1px solid #ddd; }
    .overview-table td:first-child { font-weight: bold; background: #f5f5f5; width: 25%; }
    .group-section { border: 1px solid #e0e0e0; border-radius: 8px; padding: 20px; margin: 20px 0; background: #fafafa; }
    .badge { display: inline-block; background: #4a4a8a; color: white; padding: 3px 10px; border-radius: 4px; font-size: 0.85em; margin-right: 8px; }
    .badge-secondary { background: #666; }
    .quadrant-list { list-style: none; padding: 0; display: flex; flex-wrap: wrap; gap: 8px; }
    .quadrant-list li { background: #e8e8f0; padding: 4px 12px; border-radius: 4px; font-size: 0.9em; }
    .label { font-weight: 600; color: #555; margin-bottom: 5px; }
    .task-content { background: white; padding: 15px; border-radius: 4px; border: 1px solid #e0e0e0; white-space: pre-wrap; }
    .notes-section { background: #fff3cd; padding: 20px; border-radius: 8px; margin-top: 30px; }
    @media print {
      body { padding: 20px; }
      .group-section { break-inside: avoid; }
    }
  </style>
</head>
<body>
  <h1>Foresight Planning Table</h1>
  <h2>${escapeHtml(planningData.book_overview.title)}</h2>

  <table class="overview-table">
    <tr><td>Scope</td><td>${escapeHtml(planningData.book_overview.scope)}</td></tr>
    <tr><td>Total Chapters</td><td>${planningData.book_overview.total_chapters}</td></tr>
    <tr><td>Disciplines</td><td>${escapeHtml(planningData.book_overview.disciplines?.join(', ') || 'N/A')}</td></tr>
    <tr><td>Languages</td><td>${escapeHtml(planningData.book_overview.languages?.join(', ') || 'N/A')}</td></tr>
  </table>

  <h2>Chapter Groups (${planningData.chapters?.length || 0})</h2>

  ${(planningData.chapters || []).map(group => `
    <div class="group-section">
      <h3>
        <span class="badge${group.group_type === 'STANDALONE' ? ' badge-secondary' : ''}">${escapeHtml(group.group_id)}</span>
        ${escapeHtml(group.chapter_titles?.join(', ') || '')}
      </h3>

      <p><span class="label">Chapters:</span> ${group.chapter_numbers?.join(', ') || ''}</p>

      <p><span class="label">Summary:</span><br>${escapeHtml(group.content_summary)}</p>

      ${group.thematic_quadrants && group.thematic_quadrants.length > 0 ? `
        <p class="label">Thematic Quadrants:</p>
        <ul class="quadrant-list">
          ${group.thematic_quadrants.map(q => `<li>${escapeHtml(q)}</li>`).join('')}
        </ul>
      ` : ''}

      <p class="label">Foresight Task:</p>
      <div class="task-content">${escapeHtml(group.foresight_task)}</div>
    </div>
  `).join('')}

  ${planningData.implementation_notes ? `
    <div class="notes-section">
      <h2>Implementation Notes</h2>
      <p>${escapeHtml(planningData.implementation_notes)}</p>
    </div>
  ` : ''}

  <script>
    // Auto-trigger print dialog
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 500);
    };
  </script>
</body>
</html>
`;

  // Open in new window and trigger print
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
  }
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
