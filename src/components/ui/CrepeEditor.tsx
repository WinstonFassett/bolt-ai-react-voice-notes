import React from 'react';
import { Milkdown, MilkdownProvider, useEditor } from '@milkdown/react';
import { Crepe } from "@milkdown/crepe";
import { defaultValueCtx } from '@milkdown/core';
import '../../styles/milkdown.css';

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
  useEditor((root) => {
    return new Crepe({
      root,
      defaultValue: content,
    }).create();
  });

  return <Milkdown />;
};

export const CrepeEditorWrapper: React.FC<CrepeEditorProps> = (props) => {
  return (
    <div className="milkdown-theme-wrapper">
      <MilkdownProvider>
        <CrepeEditor {...props} />
      </MilkdownProvider>
    </div>
  );
};
