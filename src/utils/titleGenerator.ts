// Simple title generation from transcript content
export const generateTitle = (content: string): string => {
  if (!content || content.trim().length === 0) {
    return 'Voice Note';
  }

  // Remove HTML tags and get plain text
  const plainText = content.replace(/<[^>]*>/g, ' ').trim();
  
  if (plainText.length === 0) {
    return 'Voice Note';
  }

  // Split into sentences
  const sentences = plainText.split(/[.!?]+/).filter(s => s.trim().length > 0);
  
  if (sentences.length === 0) {
    return 'Voice Note';
  }

  // Get first meaningful sentence
  const firstSentence = sentences[0].trim();
  
  // If first sentence is too short, try to combine with second
  if (firstSentence.length < 20 && sentences.length > 1) {
    const combined = `${firstSentence}. ${sentences[1].trim()}`;
    if (combined.length <= 50) {
      return combined;
    }
  }

  // Truncate if too long
  if (firstSentence.length > 50) {
    return firstSentence.substring(0, 47) + '...';
  }

  return firstSentence;
};

// Generate title using common patterns
export const generateSmartTitle = (content: string): string => {
  const plainText = content.replace(/<[^>]*>/g, ' ').trim().toLowerCase();
  
  // Meeting patterns
  if (plainText.includes('meeting') || plainText.includes('discuss') || plainText.includes('agenda')) {
    return 'Meeting Notes';
  }
  
  // Idea patterns
  if (plainText.includes('idea') || plainText.includes('think') || plainText.includes('concept')) {
    return 'Ideas & Thoughts';
  }
  
  // Todo patterns
  if (plainText.includes('todo') || plainText.includes('task') || plainText.includes('remember')) {
    return 'Tasks & Reminders';
  }
  
  // Interview patterns
  if (plainText.includes('interview') || plainText.includes('question') || plainText.includes('answer')) {
    return 'Interview Notes';
  }
  
  // Lecture patterns
  if (plainText.includes('lecture') || plainText.includes('learn') || plainText.includes('study')) {
    return 'Study Notes';
  }
  
  // Default to content-based title
  return generateTitle(content);
};