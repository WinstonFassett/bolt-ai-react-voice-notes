import React from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import CharacterCount from '@tiptap/extension-character-count';
import { 
  BoldIcon, 
  ItalicIcon, 
  ListBulletIcon,
  NumberedListIcon
} from '@heroicons/react/24/outline';

interface TiptapEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
}

export const TiptapEditor: React.FC<TiptapEditorProps> = ({
  content,
  onChange,
  placeholder = "Start typing..."
}) => {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder,
      }),
      CharacterCount,
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-invert max-w-none focus:outline-none min-h-[200px] p-4',
      },
    },
  });

  // Update editor content when prop changes (for transcription updates)
  React.useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      console.log('TiptapEditor: Content prop changed, updating editor');
      editor.commands.setContent(content);
    }
  }, [editor, content]);
  if (!editor) {
    return null;
  }

  return (
    <div className="border border-gray-700 rounded-lg bg-gray-800 overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-1 p-2 border-b border-gray-700 bg-gray-900/50">
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`p-2 rounded hover:bg-gray-700 transition-colors ${
            editor.isActive('bold') ? 'bg-gray-700 text-indigo-400' : 'text-gray-300'
          }`}
        >
          <BoldIcon className="w-4 h-4" />
        </button>
        
        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`p-2 rounded hover:bg-gray-700 transition-colors ${
            editor.isActive('italic') ? 'bg-gray-700 text-indigo-400' : 'text-gray-300'
          }`}
        >
          <ItalicIcon className="w-4 h-4" />
        </button>
        
        <div className="w-px h-6 bg-gray-700 mx-1" />
        
        <button
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`p-2 rounded hover:bg-gray-700 transition-colors ${
            editor.isActive('bulletList') ? 'bg-gray-700 text-indigo-400' : 'text-gray-300'
          }`}
        >
          <ListBulletIcon className="w-4 h-4" />
        </button>
        
        <button
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`p-2 rounded hover:bg-gray-700 transition-colors ${
            editor.isActive('orderedList') ? 'bg-gray-700 text-indigo-400' : 'text-gray-300'
          }`}
        >
          <NumberedListIcon className="w-4 h-4" />
        </button>

        <div className="flex-1" />
        
        {/* Character count */}
        <div className="text-xs text-gray-400">
          {editor.storage.characterCount.characters()} characters
        </div>
      </div>

      {/* Editor */}
      <EditorContent editor={editor} />
    </div>
  );
};

interface TiptapRendererProps {
  content: string;
  className?: string;
}

export const TiptapRenderer: React.FC<TiptapRendererProps> = ({ content, className }) => {
  const editor = useEditor({
    extensions: [StarterKit],
    content,
    editable: false,
  });
  if (!editor) return null;
  return <EditorContent editor={editor} className={className || 'prose prose-invert max-w-none'} />;
};