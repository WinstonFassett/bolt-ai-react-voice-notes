import React, { useRef, useEffect, useState } from 'react';
import { Editor } from "@milkdown/kit/core";
import { commonmark } from "@milkdown/kit/preset/commonmark";
import { listener, listenerCtx } from "@milkdown/kit/plugin/listener";
import { defaultValueCtx } from '@milkdown/kit/core';
import { rootCtx } from '@milkdown/kit/core';
import { editorViewCtx } from '@milkdown/kit/core';
import { Milkdown, useEditor } from "@milkdown/react";

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
  // Keep track of the last content we received
  const lastContentRef = useRef(content);
  // Keep track of whether we're currently editing
  const isEditingRef = useRef(false);
  // Keep track of the editor instance
  const editorInstanceRef = useRef<any>(null);
  
  // Use the hook to create the editor only once
  const { loading, get } = useEditor((root) => {
    const editor = Editor.make()
      .config((ctx) => {
        ctx.set(rootCtx, root);
        ctx.set(defaultValueCtx, content);
        
        if (onChange) {
          ctx.get(listenerCtx).markdownUpdated((_, markdown) => {
            // Only trigger onChange if we're not currently updating from a prop change
            if (!isEditingRef.current) {
              onChange(markdown);
            }
          });
        }
      })
      .use(commonmark)
      .use(listener);

    return editor;
  });
  
  // Store the editor instance when it's available
  useEffect(() => {
    if (get) {
      editorInstanceRef.current = get();
    }
  }, [get]);
  
  // Update editor content when prop changes, but only if we're not currently editing
  useEffect(() => {
    // Skip if content hasn't changed or we're currently editing
    if (content === lastContentRef.current) return;
    
    // Update our reference to the latest content
    lastContentRef.current = content;
    
    // Only update the editor if it exists
    if (editorInstanceRef.current) {
      // Set flag to prevent onChange from firing during our update
      isEditingRef.current = true;
      
      // Update the editor content
      editorInstanceRef.current.action((ctx: any) => {
        try {
          // Get the editor view
          const view = ctx.get(editorViewCtx);
          if (!view) return;
          
          // Set the content directly using the defaultValueCtx
          ctx.set(defaultValueCtx, content);
        } catch (error) {
          console.error('Error updating editor content:', error);
        } finally {
          // Reset the editing flag
          setTimeout(() => {
            isEditingRef.current = false;
          }, 10);
        }
      });
    }
  }, [content]);

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
