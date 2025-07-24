import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { Markdown } from 'tiptap-markdown';

export function markdownToHtml(markdown: string): string {
  const editor = new Editor({
    extensions: [StarterKit, Markdown],
    content: '',
  });
  // Set markdown content directly
  editor.commands.setContent(markdown);
  return editor.getHTML();
}

export function htmlToMarkdown(html: string): string {
  const editor = new Editor({
    extensions: [StarterKit, Markdown],
    content: html,
  });
  return editor.storage.markdown.getMarkdown();
}
