import React, { useEffect, useRef } from 'react';
import { Crepe } from "@milkdown/crepe";
import { Milkdown, MilkdownProvider } from '@milkdown/react';

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

  useEffect(() => {
    if (!divRef.current) return;

    const editor = new Crepe({
      root: divRef.current,
      defaultValue: content,
    }).create();

    return () => {
      editor.then(instance => instance.destroy());
    };
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
