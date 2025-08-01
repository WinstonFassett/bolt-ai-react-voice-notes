import React, { useRef, useEffect } from 'react';
import { Editor } from "@milkdown/kit/core";
import { commonmark } from "@milkdown/kit/preset/commonmark";
import { listener, listenerCtx } from "@milkdown/kit/plugin/listener";
import { defaultValueCtx } from '@milkdown/kit/core';
import { rootCtx } from '@milkdown/kit/core';
import { Milkdown } from "@milkdown/react";

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
  const divRef = useRef<HTMLDivElement>(null);
  
  // Recreate the editor when content changes, just like CrepeEditor
  useEffect(() => {
    if (!divRef.current) return;
    
    const editor = Editor.make()
      .config((ctx) => {
        ctx.set(rootCtx, divRef.current);
        ctx.set(defaultValueCtx, content);
        
        if (onChange) {
          ctx.get(listenerCtx).markdownUpdated((_, markdown) => {
            onChange(markdown);
          });
        }
      })
      .use(commonmark)
      .use(listener)
      .create();
    
    return () => {
      editor.then(instance => instance.destroy());
    };
  }, [content, onChange]);
  
  return <div ref={divRef} className="min-h-[200px]" />;
};

export const MilkdownEditorWrapper: React.FC<MilkdownEditorProps> = (props) => {
  return (
    // prose and dark:prose-invert handle all the markdown styling
    // prose-sm makes it match our app's text size better
    <div className="milkdown-editor prose prose-sm dark:prose-invert max-w-none p-4 bg-white dark:bg-gray-800">
      <MilkdownEditor {...props} />
    </div>
  );
};
