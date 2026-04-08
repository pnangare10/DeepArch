import { useCallback, useEffect, useRef, useState } from 'react';
import { NodeResizer, NodeToolbar, Position, type NodeProps } from '@xyflow/react';
import {
  Bold, Italic, Underline, Strikethrough,
  AlignLeft, AlignCenter, AlignRight,
  List, Link, Type, Trash2,
} from 'lucide-react';
import { useStore } from '../../store';
import type { NodeMetadata } from '@deeparch/shared';

const FONT_FAMILIES = ['System UI', 'Arial', 'Georgia', 'Courier New', 'Comic Sans MS'];
const FONT_SIZES = ['12', '14', '16', '18', '20', '24', '28', '32'];
const BG_COLORS = ['#fef08a', '#fed7aa', '#bbf7d0', '#bfdbfe', '#f5d0fe', '#fecaca', '#ffffff'];

interface StickyData {
  name: string;
  description?: string | null;
  nodeType: string;
  metadata: NodeMetadata & { bgColor?: string };
  childCount: number;
}

export function StickyNote({ data, selected, id }: NodeProps) {
  const noteData = data as unknown as StickyData;
  const bgColor = noteData.metadata?.bgColor ?? '#fef08a';

  const contentRef = useRef<HTMLDivElement>(null);
  const [fontFamily, setFontFamily] = useState('System UI');
  const [fontSize, setFontSize] = useState('14');
  const [showBgPalette, setShowBgPalette] = useState(false);

  const projectId = useStore((s) => s.projectId);
  const updateNode = useStore((s) => s.updateNode);
  const deleteNode = useStore((s) => s.deleteNode);

  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.innerHTML = noteData.description ?? '';
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveContent = useCallback(() => {
    if (!projectId || !contentRef.current) return;
    const html = contentRef.current.innerHTML;
    const text = contentRef.current.innerText.trim().slice(0, 50);
    updateNode(projectId, id, {
      description: html,
      name: text || 'Note',
    });
  }, [projectId, id, updateNode]);

  const exec = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    contentRef.current?.focus();
  };

  const handleChangeBgColor = (color: string) => {
    if (!projectId) return;
    updateNode(projectId, id, {
      metadata: {
        ...noteData.metadata,
        bgColor: color,
      },
    });
    setShowBgPalette(false);
  };

  const handleDelete = () => {
    if (!projectId) return;
    if (confirm('Delete this sticky note?')) {
      deleteNode(projectId, id);
    }
  };

  return (
    <>
      <NodeResizer
        minWidth={150}
        minHeight={120}
        isVisible={selected}
        lineClassName="!border-yellow-400"
        handleClassName="!bg-yellow-400 !border-yellow-600"
        onResizeEnd={(_, params) => {
          if (!projectId) return;
          updateNode(projectId, id, { width: params.width, height: params.height });
        }}
      />

      <div
        className="w-full h-full flex flex-col relative overflow-hidden rounded-sm shadow-md"
        style={{ backgroundColor: bgColor, minWidth: 150, minHeight: 120 }}
      >
        {/* Folded top-left corner */}
        <div
          className="absolute top-0 left-0 pointer-events-none"
          style={{
            width: 0,
            height: 0,
            borderStyle: 'solid',
            borderWidth: '22px 22px 0 0',
            borderColor: 'rgba(0,0,0,0.18) transparent transparent transparent',
            zIndex: 1,
          }}
        />

        {/* Drag handle header */}
        <div
          className="h-5 px-3 flex items-center cursor-grab active:cursor-grabbing bg-gray-100 border-b border-gray-200 transition-colors hover:bg-gray-200"
        >
          <div className="flex-1" />
          <div className="flex gap-1">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="w-0.5 h-0.5 rounded-full bg-gray-400" />
            ))}
          </div>
        </div>

        {/* Text content area */}
        <div
          ref={contentRef}
          contentEditable
          suppressContentEditableWarning
          className="nodrag flex-1 p-3 pt-4 pl-5 outline-none overflow-auto text-slate-800"
          style={{ fontFamily, fontSize: `${fontSize}px`, minHeight: 60 }}
          onBlur={saveContent}
          onKeyDown={(e) => e.stopPropagation()}
        />
      </div>

      {/* Formatting toolbar — rendered via NodeToolbar, positioned below the note */}
      <NodeToolbar isVisible={selected} position={Position.Bottom} offset={8}>
        <div
          className="nodrag nowheel flex items-center flex-wrap gap-0.5 px-2 py-1.5 bg-white border border-slate-200 rounded shadow-lg"
          onMouseDown={(e) => e.preventDefault()}
        >
          {/* Font family */}
          <select
            value={fontFamily}
            onChange={(e) => {
              setFontFamily(e.target.value);
              exec('fontName', e.target.value);
            }}
            className="text-xs border border-slate-200 rounded px-1 py-0.5"
          >
            {FONT_FAMILIES.map((f) => (
              <option key={f} value={f}>{f.split(' ')[0]}</option>
            ))}
          </select>

          {/* Font size */}
          <select
            value={fontSize}
            onChange={(e) => setFontSize(e.target.value)}
            className="text-xs border border-slate-200 rounded px-1 py-0.5 ml-0.5"
          >
            {FONT_SIZES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          <div className="w-px h-4 bg-slate-200 mx-0.5" />

          {/* Text color */}
          <label className="cursor-pointer p-1 hover:bg-slate-100 rounded" title="Text color">
            <Type className="w-3.5 h-3.5" />
            <input
              type="color"
              className="sr-only"
              onChange={(e) => exec('foreColor', e.target.value)}
            />
          </label>

          {/* Note background color */}
          <div className="relative">
            <button
              className="p-1 hover:bg-slate-100 rounded flex items-center gap-0.5"
              title="Note color"
              onMouseDown={(e) => { e.preventDefault(); setShowBgPalette((v) => !v); }}
            >
              <span
                className="w-3.5 h-3.5 rounded-sm border border-slate-300 inline-block"
                style={{ backgroundColor: bgColor }}
              />
            </button>
            {showBgPalette && (
              <div className="absolute bottom-full left-0 mb-1 flex gap-1 bg-white border border-slate-200 rounded-lg shadow-lg p-1.5 z-50">
                {BG_COLORS.map((c) => (
                  <button
                    key={c}
                    className="w-5 h-5 rounded-sm border border-slate-300 hover:scale-110 transition-transform"
                    style={{ backgroundColor: c }}
                    onMouseDown={(e) => { e.preventDefault(); handleChangeBgColor(c); }}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="w-px h-4 bg-slate-200 mx-0.5" />

          <button onMouseDown={() => exec('bold')} className="p-1 hover:bg-slate-100 rounded" title="Bold">
            <Bold className="w-3.5 h-3.5" />
          </button>
          <button onMouseDown={() => exec('italic')} className="p-1 hover:bg-slate-100 rounded" title="Italic">
            <Italic className="w-3.5 h-3.5" />
          </button>
          <button onMouseDown={() => exec('underline')} className="p-1 hover:bg-slate-100 rounded" title="Underline">
            <Underline className="w-3.5 h-3.5" />
          </button>
          <button onMouseDown={() => exec('strikeThrough')} className="p-1 hover:bg-slate-100 rounded" title="Strikethrough">
            <Strikethrough className="w-3.5 h-3.5" />
          </button>

          <div className="w-px h-4 bg-slate-200 mx-0.5" />

          <button onMouseDown={() => exec('justifyLeft')} className="p-1 hover:bg-slate-100 rounded" title="Align left">
            <AlignLeft className="w-3.5 h-3.5" />
          </button>
          <button onMouseDown={() => exec('justifyCenter')} className="p-1 hover:bg-slate-100 rounded" title="Align center">
            <AlignCenter className="w-3.5 h-3.5" />
          </button>
          <button onMouseDown={() => exec('justifyRight')} className="p-1 hover:bg-slate-100 rounded" title="Align right">
            <AlignRight className="w-3.5 h-3.5" />
          </button>

          <div className="w-px h-4 bg-slate-200 mx-0.5" />

          <button onMouseDown={() => exec('insertUnorderedList')} className="p-1 hover:bg-slate-100 rounded" title="Bullet list">
            <List className="w-3.5 h-3.5" />
          </button>
          <button
            onMouseDown={() => {
              const url = prompt('Enter URL:');
              if (url) exec('createLink', url);
            }}
            className="p-1 hover:bg-slate-100 rounded"
            title="Insert link"
          >
            <Link className="w-3.5 h-3.5" />
          </button>

          <div className="w-px h-4 bg-slate-200 mx-0.5 ml-auto" />

          <button
            onMouseDown={handleDelete}
            className="p-1 hover:bg-red-100 rounded text-red-600"
            title="Delete note"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </NodeToolbar>
    </>
  );
}
