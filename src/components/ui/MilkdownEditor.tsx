import React, { useRef, useEffect, useState } from 'react';
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
  const markdownOutRef = useRef(content);

  const { loading, get } = useEditor((root) => {
    const editor = Editor.make()
      .config((ctx) => {
        ctx.set(rootCtx, root);
        ctx.set(defaultValueCtx, content);
        // ctx.get(listenerCtx).updated((_, markdown) => {
        //   console.log('Editor updated:', markdown);
        // });
        if (onChange) {
          ctx.get(listenerCtx).markdownUpdated((_, markdown) => {
            // console.log('Markdown changed:', markdown);
            markdownOutRef.current = markdown;
            onChange(markdown);
          });
        }
      })
      .use(commonmark)
      .use(listener);

    return editor;
  }); 

  useEffect(() => {
    if (get) {
      const editor = get();
      if (editor) {
        if (content === markdownOutRef.current) {
          // console.log('Skipping update, content is the same');
          return;
        }
        // console.log('Updating editor content', content);
        editor.action(replaceAll(content));
      }
    }
  }, [content]);
  
  return (
    <Milkdown />
  );
};


export function useDebouncedEffect(effect: () => void, deps: any[], delay: number) {
  useEffect(() => {
    const handler = setTimeout(() => effect(), delay);
    return () => clearTimeout(handler);
  }, [...deps, delay]);
}

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
