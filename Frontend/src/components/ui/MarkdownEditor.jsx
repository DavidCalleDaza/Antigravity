import React, { useState, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Code,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  CheckSquare,
  Quote,
  Table,
  Code2,
  Image as ImageIcon,
  HelpCircle,
  Pencil,
  Eye,
  X,
} from 'lucide-react';

export default function MarkdownEditor({
  value = '',
  onChange,
  placeholder = 'Escribe la descripción en formato Markdown...',
  rows = 4,
}) {
  const [activeTab, setActiveTab] = useState('edit'); // 'edit' | 'preview'
  const [showHelp, setShowHelp] = useState(false);
  const textareaRef = useRef(null);

  // Auxiliar para formatear o envolver la selección de texto
  const insertFormatting = (prefix, suffix = '', defaultText = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = value.substring(start, end) || defaultText;
    const replacement = `${prefix}${selected}${suffix}`;
    const newValue = value.substring(0, start) + replacement + value.substring(end);

    if (onChange) onChange(newValue);

    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + prefix.length + selected.length;
      textarea.setSelectionRange(
        selected ? start + prefix.length : start + prefix.length,
        newCursorPos
      );
    }, 0);
  };

  // Auxiliar para formatear por líneas (Listas, Títulos, Citas)
  const insertLinePrefix = (prefix) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const before = value.substring(0, start);
    const selected = value.substring(start, end);
    const after = value.substring(end);

    const lines = selected ? selected.split('\n') : [''];
    const prefixed = lines.map((line) => `${prefix}${line}`).join('\n');
    const newValue = before + prefixed + after;

    if (onChange) onChange(newValue);

    setTimeout(() => {
      textarea.focus();
    }, 0);
  };

  // Plantilla de tabla
  const insertTable = () => {
    const tableTemplate = `\n| Columna 1 | Columna 2 |\n| --- | --- |\n| Dato 1 | Dato 2 |\n`;
    insertFormatting('', tableTemplate);
  };

  // Bloque de código
  const insertCodeBlock = () => {
    insertFormatting('```\n', '\n```', 'código aquí');
  };

  return (
    <div className="markdown-editor">
      {/* Barra superior de pestañas (icon-only) */}
      <div className="markdown-editor-tabs">
        <button
          type="button"
          className={`btn btn-ghost btn-sm btn-icon-only markdown-editor-tab ${activeTab === 'edit' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('edit')}
          title="Modificar"
          aria-label="Modificar"
        >
          <Pencil width={14} height={14} />
        </button>
        <button
          type="button"
          className={`btn btn-ghost btn-sm btn-icon-only markdown-editor-tab ${activeTab === 'preview' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('preview')}
          title="Previsualizar"
          aria-label="Previsualizar"
        >
          <Eye width={14} height={14} />
        </button>
      </div>

      {/* Barra de herramientas (solo en modo 'edit') */}
      {activeTab === 'edit' && (
        <div className="markdown-editor-toolbar">
          <button
            type="button"
            className="btn btn-ghost btn-sm btn-icon-only markdown-tool-btn"
            onClick={() => insertFormatting('**', '**', 'negrita')}
            title="Negrita (**texto**)"
          >
            <Bold width={14} height={14} />
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-sm btn-icon-only markdown-tool-btn"
            onClick={() => insertFormatting('*', '*', 'cursiva')}
            title="Cursiva (*texto*)"
          >
            <Italic width={14} height={14} />
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-sm btn-icon-only markdown-tool-btn"
            onClick={() => insertFormatting('<u>', '</u>', 'subrayado')}
            title="Subrayado (<u>texto</u>)"
          >
            <Underline width={14} height={14} />
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-sm btn-icon-only markdown-tool-btn"
            onClick={() => insertFormatting('~~', '~~', 'tachado')}
            title="Tachado (~~texto~~)"
          >
            <Strikethrough width={14} height={14} />
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-sm btn-icon-only markdown-tool-btn"
            onClick={() => insertFormatting('`', '`', 'código')}
            title="Código inline (`código`)"
          >
            <Code width={14} height={14} />
          </button>

          <span className="markdown-editor-divider" />

          <button
            type="button"
            className="btn btn-ghost btn-sm btn-icon-only markdown-tool-btn"
            onClick={() => insertLinePrefix('# ')}
            title="Encabezado H1 (# Título)"
          >
            <Heading1 width={14} height={14} />
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-sm btn-icon-only markdown-tool-btn"
            onClick={() => insertLinePrefix('## ')}
            title="Encabezado H2 (## Título)"
          >
            <Heading2 width={14} height={14} />
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-sm btn-icon-only markdown-tool-btn"
            onClick={() => insertLinePrefix('### ')}
            title="Encabezado H3 (### Título)"
          >
            <Heading3 width={14} height={14} />
          </button>

          <span className="markdown-editor-divider" />

          <button
            type="button"
            className="btn btn-ghost btn-sm btn-icon-only markdown-tool-btn"
            onClick={() => insertLinePrefix('- ')}
            title="Lista de viñetas (- elemento)"
          >
            <List width={14} height={14} />
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-sm btn-icon-only markdown-tool-btn"
            onClick={() => insertLinePrefix('1. ')}
            title="Lista numerada (1. elemento)"
          >
            <ListOrdered width={14} height={14} />
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-sm btn-icon-only markdown-tool-btn"
            onClick={() => insertLinePrefix('- [ ] ')}
            title="Checklist (- [ ] tarea)"
          >
            <CheckSquare width={14} height={14} />
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-sm btn-icon-only markdown-tool-btn"
            onClick={() => insertLinePrefix('> ')}
            title="Cita (> texto)"
          >
            <Quote width={14} height={14} />
          </button>

          <span className="markdown-editor-divider" />

          <button
            type="button"
            className="btn btn-ghost btn-sm btn-icon-only markdown-tool-btn"
            onClick={insertTable}
            title="Insertar Tabla"
          >
            <Table width={14} height={14} />
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-sm btn-icon-only markdown-tool-btn"
            onClick={insertCodeBlock}
            title="Bloque de código (```)"
          >
            <Code2 width={14} height={14} />
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-sm btn-icon-only markdown-tool-btn"
            onClick={() => insertFormatting('![', '](https://url-imagen)', 'descripción')}
            title="Insertar Imagen (![alt](url))"
          >
            <ImageIcon width={14} height={14} />
          </button>
          <button
            type="button"
            className={`btn btn-ghost btn-sm btn-icon-only markdown-tool-btn ${showHelp ? 'is-active' : ''}`}
            onClick={() => setShowHelp(!showHelp)}
            title="Guía rápida de formato Markdown"
          >
            <HelpCircle width={14} height={14} />
          </button>
        </div>
      )}

      {/* Guía rápida emergente de Markdown */}
      {activeTab === 'edit' && showHelp && (
        <div className="markdown-editor-help">
          <div className="markdown-editor-help-header">
            <span>Guía Rápida de Markdown</span>
            <button
              type="button"
              className="markdown-editor-help-close"
              onClick={() => setShowHelp(false)}
            >
              <X width={12} height={12} />
            </button>
          </div>
          <ul className="markdown-editor-help-list">
            <li><code>**texto**</code> : Negrita</li>
            <li><code>*texto*</code> : Cursiva</li>
            <li><code>~~texto~~</code> : Tachado</li>
            <li><code># Título</code> : Encabezado grande</li>
            <li><code>- Item</code> : Lista de viñetas</li>
            <li><code>1. Item</code> : Lista numerada</li>
            <li><code>- [ ] Tarea</code> : Checklist de tarea</li>
            <li><code>&gt; Cita</code> : Bloque de cita</li>
            <li><code>`código`</code> : Código inline</li>
            <li><code>![alt](url)</code> : Imagen</li>
          </ul>
        </div>
      )}

      {/* Contenido principal */}
      <div className="markdown-editor-content">
        {activeTab === 'edit' ? (
          <textarea
            ref={textareaRef}
            className="form-textarea markdown-editor-textarea"
            value={value}
            onChange={(e) => onChange && onChange(e.target.value)}
            placeholder={placeholder}
            rows={rows}
          />
        ) : (
          <div className="markdown-editor-preview">
            {value && value.trim() ? (
              <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
                {value}
              </ReactMarkdown>
            ) : (
              <p className="markdown-editor-empty">*Sin descripción*</p>
            )}
          </div>
        )}
      </div>

      <style>{`
        .markdown-editor {
          display: flex;
          flex-direction: column;
          border: 1px solid var(--border-color);
          border-radius: var(--radius-lg);
          overflow: hidden;
          background: var(--surface-raised);
          transition: border-color var(--transition-fast);
        }

        [data-theme="light"] .markdown-editor {
          border: 1px solid #000000 !important;
        }

        .markdown-editor:focus-within {
          border-color: var(--gold);
        }

        [data-theme="light"] .markdown-editor:focus-within {
          border-color: #000000 !important;
        }

        .markdown-editor-tabs {
          display: flex;
          align-items: center;
          gap: 2px;
          background: var(--sidebar-bg);
          border-bottom: 1px solid var(--border-color);
          padding: 2px var(--space-2);
        }

        .markdown-editor-tab {
          width: 28px !important;
          height: 28px !important;
          padding: 0 !important;
          color: var(--text-tertiary);
          background: transparent;
          border-radius: var(--radius-sm) !important;
          border: none;
          cursor: pointer;
          transition: all var(--transition-fast);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .markdown-editor-tab:hover {
          color: var(--text-primary);
          background: var(--surface-hover);
        }

        .markdown-editor-tab.is-active {
          color: var(--gold);
          background: var(--gold-soft);
        }

        [data-theme="light"] .markdown-editor-tab.is-active {
          color: var(--mint-green);
          background: rgba(62, 180, 137, 0.15);
        }

        .markdown-editor-toolbar {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 2px;
          padding: var(--space-1) var(--space-2);
          background: var(--card-bg);
          border-bottom: 1px solid var(--border-color);
        }

        .markdown-tool-btn {
          width: 28px !important;
          height: 28px !important;
          padding: 0 !important;
          color: var(--text-secondary);
          border-radius: var(--radius-sm) !important;
        }

        .markdown-tool-btn:hover,
        .markdown-tool-btn.is-active {
          color: var(--gold);
          background: var(--gold-soft);
        }

        [data-theme="light"] .markdown-tool-btn:hover,
        [data-theme="light"] .markdown-tool-btn.is-active {
          color: var(--mint-green);
          background: rgba(62, 180, 137, 0.15);
        }

        .markdown-editor-divider {
          width: 1px;
          height: 16px;
          background: var(--border-color);
          margin: 0 4px;
        }

        .markdown-editor-help {
          background: var(--sidebar-bg);
          border-bottom: 1px solid var(--border-color);
          padding: var(--space-3);
          font-size: var(--text-xs);
        }

        .markdown-editor-help-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-weight: var(--font-semibold);
          color: var(--gold);
          margin-bottom: var(--space-2);
        }

        [data-theme="light"] .markdown-editor-help-header {
          color: var(--mint-green);
        }

        .markdown-editor-help-close {
          background: transparent;
          border: none;
          color: var(--text-tertiary);
          cursor: pointer;
        }

        .markdown-editor-help-close:hover {
          color: var(--text-primary);
        }

        .markdown-editor-help-list {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
          gap: var(--space-1) var(--space-3);
          list-style: none;
          padding: 0;
          margin: 0;
          color: var(--text-secondary);
        }

        .markdown-editor-help-list code {
          background: var(--neutral-800);
          color: var(--gold);
          padding: 1px 4px;
          border-radius: 3px;
        }

        [data-theme="light"] .markdown-editor-help-list code {
          background: var(--neutral-100);
          color: var(--mint-green);
        }

        .markdown-editor-textarea {
          border: none !important;
          border-radius: 0 !important;
          background: transparent !important;
          box-shadow: none !important;
          outline: none !important;
          resize: vertical;
          padding: var(--space-3) !important;
        }

        [data-theme="light"] .markdown-editor-textarea {
          border: none !important;
          background: transparent !important;
        }

        .markdown-editor-preview {
          padding: var(--space-3);
          min-height: 100px;
          max-height: 250px;
          overflow-y: auto;
          font-size: var(--text-sm);
          color: var(--text-primary);
          line-height: var(--leading-relaxed);
        }

        .markdown-editor-empty {
          color: var(--text-tertiary);
          font-style: italic;
        }

        /* Estilos para elementos renderizados en la previsualización */
        .markdown-editor-preview h1,
        .markdown-editor-preview h2,
        .markdown-editor-preview h3 {
          font-family: var(--font-display);
          color: var(--text-primary);
          margin-top: 0.8em;
          margin-bottom: 0.4em;
        }

        .markdown-editor-preview h1 { font-size: 1.3em; font-weight: 700; }
        .markdown-editor-preview h2 { font-size: 1.15em; font-weight: 600; }
        .markdown-editor-preview h3 { font-size: 1.05em; font-weight: 600; }

        .markdown-editor-preview p {
          margin-bottom: 0.6em;
        }

        .markdown-editor-preview ul,
        .markdown-editor-preview ol {
          padding-left: 1.4em;
          margin-bottom: 0.6em;
        }

        .markdown-editor-preview blockquote {
          border-left: 3px solid var(--gold);
          margin: 0.6em 0;
          padding-left: 0.8em;
          color: var(--text-secondary);
          font-style: italic;
        }

        [data-theme="light"] .markdown-editor-preview blockquote {
          border-left-color: var(--mint-green);
        }

        .markdown-editor-preview code {
          background: var(--neutral-800);
          color: var(--gold);
          padding: 2px 5px;
          border-radius: var(--radius-sm);
          font-family: var(--font-mono);
          font-size: 0.9em;
        }

        [data-theme="light"] .markdown-editor-preview code {
          background: var(--neutral-100);
          color: var(--mint-green);
        }

        .markdown-editor-preview pre {
          background: var(--neutral-900);
          padding: var(--space-3);
          border-radius: var(--radius-md);
          overflow-x: auto;
          margin-bottom: 0.6em;
        }

        .markdown-editor-preview pre code {
          background: transparent;
          padding: 0;
          color: var(--cream);
        }

        .markdown-editor-preview table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 0.6em;
        }

        .markdown-editor-preview th,
        .markdown-editor-preview td {
          border: 1px solid var(--border-color);
          padding: 6px 10px;
          text-align: left;
        }

        .markdown-editor-preview th {
          background: var(--sidebar-bg);
          font-weight: var(--font-semibold);
        }

        .markdown-editor-preview img {
          max-width: 100%;
          height: auto;
          border-radius: var(--radius-md);
        }
      `}</style>
    </div>
  );
}
