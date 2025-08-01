import React, { useRef, useEffect } from 'react';
import { Editor } from "@milkdown/kit/core";
import { commonmark } from "@milkdown/kit/preset/commonmark";
import { listener, listenerCtx } from "@milkdown/kit/plugin/listener";
import { defaultValueCtx } from '@milkdown/kit/core';
import { rootCtx } from '@milkdown/kit/core';
import { Milkdown, MilkdownProvider, useEditor } from "@milkdown/react";
import { replaceAll } from '@milkdown/utils';

interface MilkdownEditorProps {
  content: string;
  onChange?: (content: string) => void;
  placeholder?: string;
}

export const MilkdownEditor: React.FC<MilkdownEditorProps> = ({
  content,
  onChange,
  placeholder
}) => {
  // Track the last content to avoid unnecessary updates
  const lastContentRef = useRef(content);
  
  // Create the editor
  const { loading, get } = useEditor((root) => {
    const editor = Editor.make()
      .config((ctx) => {
        ctx.set(rootCtx, root);
        ctx.set(defaultValueCtx, content);
        
        if (onChange) {
          ctx.get(listenerCtx).markdownUpdated((_, markdown) => {
            onChange(markdown);
          });
        }
      })
      .use(commonmark)
      .use(listener);

    return editor;
  });
  
  // Update editor content when prop changes
  useEffect(() => {
    // Skip if content hasn't changed or editor isn't ready
    if (content === lastContentRef.current || !get) return;
    
    // Update our reference
    lastContentRef.current = content;
    
    // Get the editor instance
    const editor = get();
    if (!editor) return;
    
    // Use the replaceAll utility to update the content
    // This is a simpler approach that directly replaces all content
    try {
      editor.action(replaceAll(content));
      console.log('Document updated successfully');
    } catch (error) {
      console.error('Error updating editor content:', error);
    }
  }, [content, get]);

  return <Milkdown />;
};


export const MilkdownEditorWrapper: React.FC<MilkdownEditorProps> = (props) => {
  return (
    // prose and dark:prose-invert handle all the markdown styling
    // prose-sm makes it match our app's text size better
    <div className="milkdown-editor prose prose-sm dark:prose-invert max-w-none p-4 bg-white dark:bg-gray-800">
      <MilkdownProvider>
        <MilkdownEditor {...props} />
      </MilkdownProvider>
    </div>
  );
};
