import { jsPDF } from 'jspdf';
import type { VideoNote } from '../types';
import { formatTimestamp } from './time';

export function exportAsMarkdown(title: string, notes: VideoNote[]): string {
  let md = `# ${title}\n\n`;
  for (const note of notes) {
    if (note.timestamp !== null) {
      md += `**[${formatTimestamp(note.timestamp)}]** `;
    }
    md += `${note.content}\n\n`;
  }
  return md;
}

export function exportAsText(title: string, notes: VideoNote[]): string {
  let text = `${title}\n${'='.repeat(title.length)}\n\n`;
  for (const note of notes) {
    if (note.timestamp !== null) {
      text += `[${formatTimestamp(note.timestamp)}] `;
    }
    text += `${note.content}\n\n`;
  }
  return text;
}

export function exportAsPdf(title: string, notes: VideoNote[]): void {
  const doc = new jsPDF();
  doc.setFontSize(18);
  doc.text(title, 20, 20);
  doc.setFontSize(11);
  let y = 35;
  for (const note of notes) {
    if (y > 270) {
      doc.addPage();
      y = 20;
    }
    let line = '';
    if (note.timestamp !== null) {
      line += `[${formatTimestamp(note.timestamp)}] `;
    }
    line += note.content;
    const lines = doc.splitTextToSize(line, 170);
    doc.text(lines, 20, y);
    y += lines.length * 6 + 4;
  }
  doc.save(`${title.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
}

export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
