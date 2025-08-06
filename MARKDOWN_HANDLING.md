# Markdown Handling Design Document

## Overview

This document outlines the standardized approach for handling markdown content throughout the Bolt AI React Voice Notes application. It defines how markdown should be rendered in different contexts while maintaining consistency across the application.

## Core Principles

1. **Preserve Raw Markdown**: Always store the original markdown content without modification.
2. **Context-Appropriate Rendering**: Render markdown differently based on the context (full view, preview, etc.).
3. **Consistent Styling**: Use consistent styling for rendered markdown across all components.
4. **No Stripping**: Never strip markdown formatting when displaying content in its primary context.

## Implementation Details

### 1. Note Content in Detail View

**Component**: `NoteDetailScreen.tsx`

**Implementation**:
- Use `CrepeEditorWrapper` for the main note content editor
- Preserve all markdown formatting
- Enable editing when appropriate
- Apply consistent styling via the `prose` and `prose-invert` classes

```tsx
<CrepeEditorWrapper
  content={content}
  onChange={handleEditorChange}
  placeholder="Start writing your note..."
/>
```

### 2. Note Previews in Cards

**Component**: `LibraryScreen.tsx`, `NoteDetailScreen.tsx` (for descendants)

**Implementation**:
- Display a truncated preview of the content (first 150 characters)
- Do NOT strip markdown formatting
- Use `line-clamp-2` to limit to 2 lines
- Apply consistent text styling

```tsx
<p className="text-sm text-muted-foreground mb-2 line-clamp-2">
  {getContentPreview(note.content)}
</p>
```

### 3. Takeaway/Descendant Content

**Component**: `NoteDetailScreen.tsx`

**Implementation**:
- Use the same hierarchical tree view as in LibraryScreen
- Render content previews with the same approach as note previews
- When viewing a descendant note in full, use the same markdown rendering as the main note content

### 4. AI Agent Generated Content

**Component**: Various

**Implementation**:
- Render markdown content using `CrepeEditorWrapper` with `readOnly={true}`
- Apply consistent styling with `prose` and `prose-invert` classes
- Preserve all markdown formatting

```tsx
<CrepeEditorWrapper 
  content={agentGeneratedContent} 
  readOnly={true} 
/>
```

### 5. Content Preview Helper Function

**Implementation**:
- Use a simple function to get the first N characters of content
- Do NOT strip markdown formatting
- Add ellipsis if content is truncated

```tsx
const getContentPreview = (content: string) => {
  if (!content) return '';
  return content.substring(0, 150).trim() + (content.length > 150 ? '...' : '');
};
```

## Component-Specific Guidelines

### CrepeEditorWrapper

- Primary markdown editor and renderer
- Configurable for read-only or editable mode
- Uses Milkdown/Crepe for WYSIWYG markdown editing
- Consistent styling via CSS classes

### Card Content Previews

- Always show raw markdown content in previews
- Use line clamping for consistent height
- Apply consistent text styling

### Tag Handling

- Tags should be clickable in all contexts
- Clicking a tag should navigate to library with that tag as a filter
- Consistent styling across all components

## CSS Classes

- `prose`: Base class for markdown styling
- `prose-invert`: Dark mode styling for markdown
- `prose-sm`: Smaller text size for markdown in compact contexts
- `milkdown-editor`: Base class for the editor component

## Testing Guidelines

1. Verify markdown renders correctly in all contexts
2. Ensure consistent styling across components
3. Confirm markdown is preserved when editing and saving
4. Test that previews show appropriate content without stripping markdown

## Future Improvements

1. Consider adding syntax highlighting for code blocks
2. Implement better handling of embedded content (images, videos)
3. Add support for custom markdown extensions
