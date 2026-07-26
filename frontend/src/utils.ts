export const parseMarkdownToHtml = (markdown: string): string => {
  if (!markdown) return '';
  
  let html = markdown;

  // Escape HTML tags to prevent XSS
  html = html
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Code blocks
  html = html.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  // Bold
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  // Italics
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');

  // Parse Markdown Tables
  const lines = html.split('\n');
  let inTable = false;
  let tableRows: string[] = [];
  let parsedLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('|') && line.endsWith('|')) {
      if (!inTable) {
        const nextLine = lines[i + 1] ? lines[i + 1].trim() : '';
        if (nextLine.startsWith('|') && nextLine.includes('-')) {
          inTable = true;
          tableRows = [];
          const cols = line.split('|').map(c => c.trim()).filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
          tableRows.push('<thead><tr>' + cols.map(c => `<th>${c}</th>`).join('') + '</tr></thead><tbody>');
          i++; // Skip separator line
          continue;
        }
      }
      
      if (inTable) {
        const cols = line.split('|').map(c => c.trim()).filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
        tableRows.push('<tr>' + cols.map(c => `<td>${c}</td>`).join('') + '</tr>');
      }
    } else {
      if (inTable) {
        inTable = false;
        tableRows.push('</tbody>');
        parsedLines.push('<div class="table-container"><table>' + tableRows.join('') + '</table></div>');
      }
      parsedLines.push(lines[i]);
    }
  }
  
  if (inTable) {
    tableRows.push('</tbody>');
    parsedLines.push('<div class="table-container"><table>' + tableRows.join('') + '</table></div>');
  }

  html = parsedLines.join('\n');

  // Headers
  html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');

  // Lists (Unordered)
  html = html.replace(/^\s*-\s+(.*$)/gim, '<li>$1</li>');
  html = html.replace(/^\s*\*\s+(.*$)/gim, '<li>$1</li>');
  // Wrap list items
  html = html.replace(/(<li>.*<\/li>)/gim, '<ul>$1<\/ul>');
  html = html.replace(/<\/ul>\s*<ul>/g, '');

  // Newlines
  html = html.replace(/\n/g, '<br/>');

  return html;
};
