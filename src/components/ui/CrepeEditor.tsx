import React, { useEffect, useRef } from 'react';
import { Crepe } from "@milkdown/crepe";
import { Milkdown, MilkdownProvider } from '@milkdown/react';
import "@milkdown/crepe/theme/common/style.css";
import "@milkdown/crepe/theme/frame-dark.css";
import { Editor } from '@milkdown/core';
import { replaceAll } from '@milkdown/utils';

interface CrepeEditorProps {
  content: string;
  onChange?: (content: string) => void;
  placeholder?: string;
}

export const CrepeEditor: React.FC<CrepeEditorProps> = ({
  content,
  onChange,
  placeholder
}) => {
  const divRef = useRef<HTMLDivElement>(null);
  const markdownOutRef = useRef(content);
  const crepeRef = useRef<Editor>();

  useEffect(() => {
    if (!divRef.current) return;

    const crepe = new Crepe({
      root: divRef.current,
      defaultValue: content,
      features: {
        placeholder: true
      },
      featureConfigs: {
        placeholder: {
          text: placeholder || "Type something..."
        }
      }
    });
    
    // Initialize the editor
    crepe.create().then((editor) => {
      console.log('Crepe editor initialized');
      crepeRef.current = editor;
    });

    crepe.on(listener => {
      listener.markdownUpdated((_, markdown) => {
        console.log('Markdown updated:', markdown);
        markdownOutRef.current = markdown;
        onChange?.(markdown);
      });
    })

    return () => {
      crepe.destroy();
    };
  }, [content]);

  useEffect(() => {
    if (crepeRef.current) {
      if (content === markdownOutRef.current) {
        // console.log('Skipping update, content is the same');
        return;
      }
      console.log('replacing content', content)
      // crepeRef.current.action(replaceAll(content));
      crepeRef.current.action(ctx =>{
        // ctx.update
      })
    }
  }, [content]);

  return <div ref={divRef} className="min-h-[200px]" />;
};

export const CrepeEditorWrapper: React.FC<CrepeEditorProps> = (props) => {
  return (
    <div className="milkdown-editor prose dark:prose-invert max-w-none p-4 bg-white dark:bg-gray-800">
      <MilkdownProvider>
        <CrepeEditor {...props} />
      </MilkdownProvider>
    </div>
  );
};
