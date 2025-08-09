import { cn } from "@/lib/utils";
import { CrepeEditorWrapper } from "./CrepeEditor";

interface MarkdownPreviewProps {
  content: string;
  className?: string;
}

export const MarkdownPreview: React.FC<MarkdownPreviewProps> = ({
  content,
  className,
}) => {
  return (
    <div className={className}>
      <CrepeEditorWrapper
        content={content}
        readOnly={true}
        className="p-0 m-0 [&_.editor]:p-0 [&_.editor]:m-0 [&_.editor]:shadow-none [&_.editor]:bg-transparent"
      />
    </div>
  );
};
