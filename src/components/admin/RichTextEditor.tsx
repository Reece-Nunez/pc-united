'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import ImageExtension from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

/* ------------------------------------------------------------------ */
/*  SVG Icons (inline, 20x20 viewBox)                                 */
/* ------------------------------------------------------------------ */

const IconBold = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 4h5a3 3 0 0 1 0 6H6z" />
    <path d="M6 10h6a3 3 0 0 1 0 6H6z" />
  </svg>
);

const IconItalic = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="4" x2="8" y2="16" />
    <line x1="9" y1="4" x2="14" y2="4" />
    <line x1="6" y1="16" x2="11" y2="16" />
  </svg>
);

const IconH2 = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
    <text x="1" y="15" fontSize="11" fontWeight="700" fontFamily="system-ui,sans-serif">H2</text>
  </svg>
);

const IconH3 = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
    <text x="1" y="15" fontSize="11" fontWeight="700" fontFamily="system-ui,sans-serif">H3</text>
  </svg>
);

const IconBulletList = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="4" cy="5" r="1" fill="currentColor" stroke="none" />
    <circle cx="4" cy="10" r="1" fill="currentColor" stroke="none" />
    <circle cx="4" cy="15" r="1" fill="currentColor" stroke="none" />
    <line x1="8" y1="5" x2="17" y2="5" />
    <line x1="8" y1="10" x2="17" y2="10" />
    <line x1="8" y1="15" x2="17" y2="15" />
  </svg>
);

const IconOrderedList = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <text x="1" y="7" fontSize="6" fontWeight="700" fontFamily="system-ui,sans-serif" stroke="none">1</text>
    <text x="1" y="12.5" fontSize="6" fontWeight="700" fontFamily="system-ui,sans-serif" stroke="none">2</text>
    <text x="1" y="18" fontSize="6" fontWeight="700" fontFamily="system-ui,sans-serif" stroke="none">3</text>
    <line x1="8" y1="5" x2="17" y2="5" />
    <line x1="8" y1="10" x2="17" y2="10" />
    <line x1="8" y1="15" x2="17" y2="15" />
  </svg>
);

const IconLink = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8.5 13.5l-1 1a3 3 0 0 1-4.24-4.24l3-3a3 3 0 0 1 4.24 0" />
    <path d="M11.5 6.5l1-1a3 3 0 0 1 4.24 4.24l-3 3a3 3 0 0 1-4.24 0" />
  </svg>
);

const IconImage = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="14" height="14" rx="2" />
    <circle cx="7.5" cy="7.5" r="1.5" />
    <path d="M17 13l-3.5-4.5L9 14l-2.5-2L3 17" />
  </svg>
);

const IconUndo = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 8l4-4" />
    <path d="M4 8l4 4" />
    <path d="M4 8h9a4 4 0 0 1 0 8H11" />
  </svg>
);

const IconRedo = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 8l-4-4" />
    <path d="M16 8l-4 4" />
    <path d="M16 8H7a4 4 0 0 0 0 8h2" />
  </svg>
);

const IconAlignLeft = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <line x1="3" y1="4" x2="17" y2="4" />
    <line x1="3" y1="8" x2="12" y2="8" />
    <line x1="3" y1="12" x2="15" y2="12" />
    <line x1="3" y1="16" x2="10" y2="16" />
  </svg>
);

const IconAlignCenter = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <line x1="3" y1="4" x2="17" y2="4" />
    <line x1="5" y1="8" x2="15" y2="8" />
    <line x1="4" y1="12" x2="16" y2="12" />
    <line x1="6" y1="16" x2="14" y2="16" />
  </svg>
);

const IconAlignRight = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <line x1="3" y1="4" x2="17" y2="4" />
    <line x1="8" y1="8" x2="17" y2="8" />
    <line x1="5" y1="12" x2="17" y2="12" />
    <line x1="10" y1="16" x2="17" y2="16" />
  </svg>
);

const IconClear = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4l12 12" />
    <path d="M16 4L4 16" />
  </svg>
);

/* ------------------------------------------------------------------ */
/*  Toolbar button                                                     */
/* ------------------------------------------------------------------ */

function ToolbarButton({
  onClick,
  active,
  disabled,
  children,
  title,
  ariaLabel,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  title: string;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={ariaLabel}
      disabled={disabled}
      className={`p-1.5 rounded cursor-pointer transition-colors flex items-center justify-center ${
        disabled
          ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
          : active
            ? 'bg-team-blue text-white'
            : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
      }`}
    >
      {children}
    </button>
  );
}

function Separator() {
  return <div className="w-px self-stretch bg-gray-300 dark:bg-gray-600 mx-1.5" />;
}

/* ------------------------------------------------------------------ */
/*  Inline URL popover                                                 */
/* ------------------------------------------------------------------ */

function UrlPopover({
  open,
  onClose,
  onSubmit,
  label,
  anchorRef,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (url: string) => void;
  label: string;
  anchorRef: React.RefObject<HTMLDivElement | null>;
}) {
  const [url, setUrl] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setUrl('');
      // Small delay so the DOM renders before we focus
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        anchorRef.current &&
        !anchorRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open, onClose, anchorRef]);

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim()) {
      onSubmit(url.trim());
      setUrl('');
      onClose();
    }
  };

  return (
    <div
      ref={popoverRef}
      className="absolute top-full left-0 mt-1 z-50 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg p-2 flex items-center gap-2"
    >
      <input
        ref={inputRef}
        type="url"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder={`Enter ${label} URL...`}
        className="w-56 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-team-blue"
        onKeyDown={(e) => {
          if (e.key === 'Escape') onClose();
        }}
      />
      <button
        type="button"
        onClick={handleSubmit}
        className="px-3 py-1 text-sm font-medium text-white bg-team-blue rounded hover:opacity-90 cursor-pointer whitespace-nowrap"
      >
        Insert
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

export default function RichTextEditor({ content, onChange, placeholder }: RichTextEditorProps) {
  const [showLinkPopover, setShowLinkPopover] = useState(false);
  const [showImagePopover, setShowImagePopover] = useState(false);
  const linkAnchorRef = useRef<HTMLDivElement>(null);
  const imageAnchorRef = useRef<HTMLDivElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      ImageExtension,
      Link.configure({ openOnClick: false }),
    ],
    content,
    onUpdate: ({ editor: ed }) => {
      onChange(ed.getHTML());
    },
    editorProps: {
      attributes: {
        class:
          'prose prose-sm dark:prose-invert max-w-none min-h-[200px] px-4 py-3 focus:outline-none',
      },
    },
  });

  const handleInsertLink = useCallback(
    (url: string) => {
      if (!editor) return;
      editor.chain().focus().setLink({ href: url }).run();
    },
    [editor],
  );

  const handleInsertImage = useCallback(
    (url: string) => {
      if (!editor) return;
      editor.chain().focus().setImage({ src: url }).run();
    },
    [editor],
  );

  const handleClear = useCallback(() => {
    if (!editor) return;
    editor.chain().focus().clearContent().run();
  }, [editor]);

  if (!editor) return null;

  return (
    <div className="border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 p-2 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600 relative">
        {/* Undo / Redo */}
        <ToolbarButton
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          title="Undo"
          ariaLabel="Undo"
        >
          <IconUndo />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          title="Redo"
          ariaLabel="Redo"
        >
          <IconRedo />
        </ToolbarButton>

        <Separator />

        {/* Inline formatting */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive('bold')}
          title="Bold"
          ariaLabel="Bold"
        >
          <IconBold />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive('italic')}
          title="Italic"
          ariaLabel="Italic"
        >
          <IconItalic />
        </ToolbarButton>

        <Separator />

        {/* Headings */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          active={editor.isActive('heading', { level: 2 })}
          title="Heading 2"
          ariaLabel="Heading 2"
        >
          <IconH2 />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          active={editor.isActive('heading', { level: 3 })}
          title="Heading 3"
          ariaLabel="Heading 3"
        >
          <IconH3 />
        </ToolbarButton>

        <Separator />

        {/* Lists */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive('bulletList')}
          title="Bullet List"
          ariaLabel="Bullet List"
        >
          <IconBulletList />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive('orderedList')}
          title="Ordered List"
          ariaLabel="Ordered List"
        >
          <IconOrderedList />
        </ToolbarButton>

        <Separator />

        {/* Alignment */}
        <ToolbarButton
          onClick={() => document.execCommand('justifyLeft')}
          title="Align Left"
          ariaLabel="Align Left"
        >
          <IconAlignLeft />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => document.execCommand('justifyCenter')}
          title="Align Center"
          ariaLabel="Align Center"
        >
          <IconAlignCenter />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => document.execCommand('justifyRight')}
          title="Align Right"
          ariaLabel="Align Right"
        >
          <IconAlignRight />
        </ToolbarButton>

        <Separator />

        {/* Link (with inline popover) */}
        <div ref={linkAnchorRef} className="relative">
          <ToolbarButton
            onClick={() => {
              setShowImagePopover(false);
              setShowLinkPopover((v) => !v);
            }}
            active={editor.isActive('link')}
            title="Insert Link"
            ariaLabel="Insert Link"
          >
            <IconLink />
          </ToolbarButton>
          <UrlPopover
            open={showLinkPopover}
            onClose={() => setShowLinkPopover(false)}
            onSubmit={handleInsertLink}
            label="link"
            anchorRef={linkAnchorRef}
          />
        </div>

        {/* Image (with inline popover) */}
        <div ref={imageAnchorRef} className="relative">
          <ToolbarButton
            onClick={() => {
              setShowLinkPopover(false);
              setShowImagePopover((v) => !v);
            }}
            title="Insert Image"
            ariaLabel="Insert Image"
          >
            <IconImage />
          </ToolbarButton>
          <UrlPopover
            open={showImagePopover}
            onClose={() => setShowImagePopover(false)}
            onSubmit={handleInsertImage}
            label="image"
            anchorRef={imageAnchorRef}
          />
        </div>

        <Separator />

        {/* Clear / Reset */}
        <ToolbarButton
          onClick={handleClear}
          title="Clear Content"
          ariaLabel="Clear Content"
        >
          <IconClear />
        </ToolbarButton>
      </div>

      {/* Editor */}
      <EditorContent editor={editor} />
    </div>
  );
}
