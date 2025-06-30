// Simple markdown renderer for agent content
export const renderMarkdown = (markdown: string): string => {
  if (!markdown) return '';
  
  let html = markdown
    // Headers
    .replace(/^### (.*$)/gm, '<h3 class="text-lg font-semibold text-white mt-4 mb-2">$1</h3>')
    .replace(/^## (.*$)/gm, '<h2 class="text-xl font-semibold text-white mt-4 mb-2">$1</h2>')
    .replace(/^# (.*$)/gm, '<h1 class="text-2xl font-bold text-white mt-4 mb-2">$1</h1>')
    
    // Bold and italic
    .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-white">$1</strong>')
    .replace(/\*(.*?)\*/g, '<em class="italic text-gray-300">$1</em>')
    
    // Lists - handle properly to avoid double bullets
    .replace(/^- (.*$)/gm, '<li class="text-gray-300 list-disc ml-6">$1</li>')
    .replace(/^\d+\. (.*$)/gm, '<li class="text-gray-300 list-decimal ml-6">$1</li>')
    
    // Line breaks
    .replace(/\n\n/g, '<br><br>')
    .replace(/\n/g, '<br>')
    
  // Wrap consecutive <li> elements in <ul> or <ol>
  html = html.replace(/(<li class="text-gray-300 list-disc[^"]*">[^<]*<\/li>(?:\s*<br>)*)+/g, (match) => {
    return '<ul class="space-y-1 mb-4">' + match.replace(/<br>/g, '') + '</ul>';
  });
  
  html = html.replace(/(<li class="text-gray-300 list-decimal[^"]*">[^<]*<\/li>(?:\s*<br>)*)+/g, (match) => {
    return '<ol class="space-y-1 mb-4">' + match.replace(/<br>/g, '') + '</ol>';
  });
  
  return html;
};

export const stripMarkdown = (markdown: string): string => {
  if (!markdown) return '';
  
  return markdown
    .replace(/^#+\s*/gm, '') // Remove headers
    .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
    .replace(/\*(.*?)\*/g, '$1') // Remove italic
    .replace(/^[-\d+\.]\s*/gm, '') // Remove list markers
    .replace(/\n+/g, ' ') // Replace newlines with spaces
    .trim();
};