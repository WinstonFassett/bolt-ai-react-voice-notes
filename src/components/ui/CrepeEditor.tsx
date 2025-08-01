import { Crepe } from "@milkdown/crepe";
import "@milkdown/crepe/theme/common/style.css";
import "@milkdown/crepe/theme/frame-dark.css";
import { Milkdown, MilkdownProvider, useEditor } from "@milkdown/react";
import { replaceAll } from '@milkdown/utils';
import React, { useEffect, useRef } from 'react';

interface CrepeEditorProps {
  content: string;
  onChange?: (content: string) => void;
  placeholder?: string;
}

const CrepeEditor: React.FC<CrepeEditorProps> = ({
  content,
  onChange,
  placeholder
}) => {
  const markdownOutRef = useRef(content);
  const { get } = useEditor((root) => {
    const crepe = new Crepe({ 
      root,
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
    crepe.on(listener => {
      listener.markdownUpdated((_, markdown) => {
        markdownOutRef.current = markdown;
        onChange?.(markdown);
      });
    })
    return crepe;
  });

  useEffect(() => {
    if (get) {
      const editor = get();
      if (editor) {
        if (content === markdownOutRef.current) {
          return;
        }
        editor.action(replaceAll(content));
      }
    }
  }, [content]);

  return <Milkdown />;
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
