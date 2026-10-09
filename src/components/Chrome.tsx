import { useEffect, useRef, useState } from "react";
import type { BoardPayload } from "../../shared/types";
import { STATUS_ORDER } from "../../shared/config";
import { SECTION_LABEL, type SectionId } from "../../shared/layout";
import { summaryLine } from "../../shared/select";
import { formatAgo } from "../../shared/text";
import { StatusPill } from "./Marks";

export function TopBar({
  board,
  filter,
  onFilter,
  loading,
  onRefresh,
  zoom,
  ideaId,
  section,
  onCrumb,
}: {
  board: BoardPayload;
  filter: string;
  onFilter: (status: string) => void;
  loading: boolean;
  onRefresh: () => void;
  zoom: number;
  ideaId?: string;
  section?: SectionId;
  onCrumb: (target: "board" | "idea" | "section") => void;
}) {
  const [open, setOpen] = useState(false);
  const menu = useRef<HTMLDivElement>(null);
  const idea = board.ideas.find((item) => item.id === ideaId);
  const counts = countStatuses(board);
  const shown = filter === "all" ? board.ideas.length : counts[filter] ?? 0;

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!menu.current?.contains(event.target as Node)) setOpen(false);
    };
    window.addEventListener("pointerdown", close);
    return () => window.removeEventListener("pointerdown", close);
  }, []);

  return (
    <header className="topbar">
      <div className="brand pill">
        <span className="logo" aria-hidden="true">
          L
        </span>
        <div>
          <strong>Lean Startup Lab</strong>
          <nav className="crumbs" aria-label="Breadcrumb">
            <button type="button" onClick={() => onCrumb("board")}>
              Board
            </button>
            {idea ? (
              <>
                <span aria-hidden="true">›</span>
                <button type="button" onClick={() => onCrumb("idea")}>
                  {idea.name}
                </button>
              </>
            ) : (
              <em>
                {shown} idea{shown === 1 ? "" : "s"}
                <span className="zoom-read"> · {Math.round(zoom * 100)}%</span>
              </em>
            )}
            {idea && section && (
              <>
                <span aria-hidden="true">›</span>
                <button type="button" onClick={() => onCrumb("section")}>
                  {SECTION_LABEL[section].replace(/^\d+\s+/, "")}
                </button>
              </>
            )}
          </nav>
        </div>
      </div>

      {board.source === "example" && <div className="example-banner">Example data · not real</div>}

      <div className="filter" ref={menu}>
        <button type="button" className="filter-button" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
          {filter === "all" ? `All ${board.ideas.length} ideas` : filter} ▾
        </button>
        {open && (
          <ul className="filter-menu">
            <li>
              <button
                type="button"
                onClick={() => {
                  onFilter("all");
                  setOpen(false);
                }}
              >
                All {board.ideas.length} ideas
              </button>
            </li>
            {visibleStatuses(board).map((status) => (
              <li key={status}>
                <button
                  type="button"
                  onClick={() => {
                    onFilter(status);
                    setOpen(false);
                  }}
                >
                  <StatusPill status={status} /> {counts[status] ?? 0}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <button type="button" className={`sync pill${loading ? " is-loading" : ""}`} onClick={onRefresh}>
        <span className="sync-copy">
          {board.source === "notion" ? "Synced from Notion · read-only" : "Example data · read-only"}
          <small>{loading ? "Refreshing…" : formatAgo(board.syncedAt)}</small>
        </span>
        <RefreshIcon />
      </button>
    </header>
  );
}

export function ToolBar({
  onZoom,
  onFit,
  readOnly,
}: {
  onZoom: (factor: number) => void;
  onFit: () => void;
  readOnly: boolean;
}) {
  return (
    <div className="tools pill" aria-label="Canvas tools">
      <span className="tool is-on" title="Pan">
        <HandIcon />
      </span>
      <button type="button" onClick={() => onZoom(1 / 1.12)} aria-label="Zoom out">
        −
      </button>
      <button type="button" onClick={onFit} aria-label="Fit">
        <FitIcon />
      </button>
      <button type="button" onClick={() => onZoom(1.12)} aria-label="Zoom in">
        +
      </button>
      {readOnly && (
        <span className="readonly">
          <LockSmall /> Read-only
        </span>
      )}
    </div>
  );
}

export function ZoomBar({ zoom, onZoom, onFit, dirty, onReset }: { zoom: number; onZoom: (factor: number) => void; onFit: () => void; dirty: boolean; onReset: () => void }) {
  return (
    <div className="zoombar pill">
      <button type="button" onClick={() => onZoom(1 / 1.12)} aria-label="Zoom out">
        −
      </button>
      <span>{Math.round(zoom * 100)}%</span>
      <button type="button" onClick={() => onZoom(1.12)} aria-label="Zoom in">
        +
      </button>
      <button type="button" onClick={onFit}>
        Fit
      </button>
      {dirty && (
        <button type="button" onClick={onReset}>
          Reset
        </button>
      )}
    </div>
  );
}

export function Hint() {
  return <p className="hint pill">Drag to pan · scroll to zoom · click a frame to zoom in · coaching happens in chat</p>;
}

export function MobileSheet({
  board,
  filter,
  onOpen,
}: {
  board: BoardPayload;
  filter: string;
  onOpen: (ideaId: string) => void;
}) {
  const ideas = filter === "all" ? board.ideas : board.ideas.filter((idea) => idea.status === filter);
  return (
    <aside className="sheet" data-testid="mobile-sheet">
      <div className="sheet-handle" />
      <h2>
        Ideas on this board <em>{ideas.length}</em>
      </h2>
      <ul>
        {ideas.map((idea) => (
          <li key={idea.id}>
            <button type="button" onClick={() => onOpen(idea.id)}>
              <StatusPill status={idea.status} />
              <span>
                <strong>{idea.name}</strong>
                <small>{summaryLine(board, idea)}</small>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </aside>
  );
}

export function PinchHint({ onDone }: { onDone: () => void }) {
  return (
    <button type="button" className="pinch-hint" onClick={onDone}>
      <span>Pinch to zoom into an idea</span>
      <small>Drag to pan · tap a frame to open</small>
    </button>
  );
}

export function ErrorBanner({ message, onExample }: { message: string; onExample: () => void }) {
  return (
    <div className="error-banner" role="alert">
      <p>{message}</p>
      <button type="button" onClick={onExample}>
        Show example data
      </button>
    </div>
  );
}

function countStatuses(board: BoardPayload): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const idea of board.ideas) counts[idea.status] = (counts[idea.status] ?? 0) + 1;
  return counts;
}

function visibleStatuses(board: BoardPayload): string[] {
  const present = new Set(board.ideas.map((idea) => idea.status));
  const known = STATUS_ORDER.filter((status) => present.has(status));
  const extra = [...present].filter((status) => !STATUS_ORDER.includes(status as (typeof STATUS_ORDER)[number]));
  return [...known, ...extra];
}

function RefreshIcon() {
  return (
    <svg viewBox="0 0 20 20" className="icon" aria-hidden="true">
      <path d="M16 10a6 6 0 1 1-1.6-4.1" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M16 3.5V7h-3.5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function HandIcon() {
  return (
    <svg viewBox="0 0 20 20" className="icon" aria-hidden="true">
      <path d="M8 9V4.5a1.2 1.2 0 0 1 2.3-.5L11 7V4a1.2 1.2 0 1 1 2.4 0V8l.3-1.2A1.2 1.2 0 0 1 16 8.2V13a4 4 0 0 1-4 4h-.5A4.5 4.5 0 0 1 7 12.5V9" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

function FitIcon() {
  return (
    <svg viewBox="0 0 20 20" className="icon" aria-hidden="true">
      <path d="M4 8V4h4M16 8V4h-4M4 12v4h4M16 12v4h-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function LockSmall() {
  return (
    <svg viewBox="0 0 16 16" className="icon" aria-hidden="true">
      <rect x="3" y="7" width="10" height="7" rx="1.4" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}
