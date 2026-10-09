import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import type { BoardPayload } from "../../shared/types";
import {
  applyOffsets,
  focusAt,
  lodForZoom,
  type BoardLayout,
  type LayoutCard,
  type LayoutFrame,
  type Offsets,
  type SectionId,
} from "../../shared/layout";
import { deriveNow } from "../../shared/select";
import { formatAgo, seedFrom } from "../../shared/text";
import { cameraFit, cameraFocusFrame, zoomAt, type Camera } from "../lib/camera";
import { StatusPill } from "./Marks";
import { Sketch } from "./Sketch";
import { CardFace } from "./Cards";

export interface BoardView {
  zoom: number;
  ideaId?: string;
  section?: SectionId;
}

export interface BoardHandle {
  fit: () => void;
  focusIdea: (ideaId: string) => void;
  zoomBy: (factor: number) => void;
}

interface Props {
  board: BoardPayload;
  layout: BoardLayout;
  offsets: Offsets;
  selectedId?: string;
  mobile: boolean;
  onSelect: (card: LayoutCard | null) => void;
  onCommitOffset: (id: string, dx: number, dy: number) => void;
  onView: (view: BoardView) => void;
}

export const Board = forwardRef<BoardHandle, Props>(function Board(
  { board, layout, offsets, selectedId, mobile, onSelect, onCommitOffset, onView },
  ref,
) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const layoutRef = useRef(layout);
  layoutRef.current = layout;
  const [camera, setCamera] = useState<Camera>({ x: 40, y: 28, zoom: 0.4 });
  const [live, setLive] = useState<Offsets>({});
  const [size, setSize] = useState({ w: 0, h: 0 });
  const cameraRef = useRef(camera);
  cameraRef.current = camera;

  const placed = applyOffsets(layout, { ...offsets, ...live });
  const lod = lodForZoom(camera.zoom);

  function viewportBox() {
    const rect = viewportRef.current?.getBoundingClientRect();
    return { w: rect?.width ?? size.w, h: rect?.height ?? size.h, left: rect?.left ?? 0, top: rect?.top ?? 0 };
  }

  function fit() {
    const box = viewportBox();
    setCamera(cameraFit(layoutRef.current.overviewBounds, { w: box.w, h: box.h }, mobile ? 16 : 28));
  }

  function focusIdea(ideaId: string) {
    const frame = layoutRef.current.frames.find((item) => item.ideaId === ideaId && item.mode === "full");
    if (!frame) return;
    const box = viewportBox();
    setCamera(cameraFocusFrame(frame, { w: box.w, h: box.h }, mobile ? 64 : 84));
    onSelect(null);
  }

  useImperativeHandle(ref, () => ({
    fit,
    focusIdea,
    zoomBy(factor: number) {
      const box = viewportBox();
      setCamera((current) => zoomAt(current, box.left + box.w / 2, box.top + box.h / 2, current.zoom * factor, box));
    },
  }));

  useEffect(() => {
    const element = viewportRef.current;
    if (!element) return;
    const observer = new ResizeObserver(() => {
      const rect = element.getBoundingClientRect();
      setSize({ w: rect.width, h: rect.height });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const didFit = useRef(false);
  const lastFitWidth = useRef(0);
  useEffect(() => {
    if (size.w < 40) return;
    const widthJump = Math.abs(size.w - lastFitWidth.current) > 160;
    if (didFit.current && !widthJump) return;
    didFit.current = true;
    lastFitWidth.current = size.w;
    setCamera(cameraFit(layoutRef.current.overviewBounds, size, mobile ? 18 : 28));
  }, [mobile, size]);

  useEffect(() => {
    const element = viewportRef.current;
    if (!element) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const rect = element.getBoundingClientRect();
      const factor = event.deltaY > 0 ? 0.92 : 1.08;
      setCamera((current) => zoomAt(current, event.clientX, event.clientY, current.zoom * factor, rect));
    };
    element.addEventListener("wheel", onWheel, { passive: false });
    return () => element.removeEventListener("wheel", onWheel);
  }, []);

  const centerX = (size.w / 2 - camera.x) / camera.zoom;
  const centerY = (size.h / 2 - camera.y) / camera.zoom;
  const focus = focusAt(placed, centerX, centerY);
  useEffect(() => {
    // A fitted overview can still sit over a frame. The idea crumb is for a zoomed-in frame.
    const zoomedIn = lod !== "far";
    onView({
      zoom: camera.zoom,
      ideaId: zoomedIn ? focus.ideaId : undefined,
      section: zoomedIn ? focus.section : undefined,
    });
  }, [camera.zoom, focus.ideaId, focus.section, lod, onView]);

  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ dist: number; midX: number; midY: number } | null>(null);
  const panned = useRef(false);

  function onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if ((event.target as HTMLElement).closest("[data-card], .frame-head")) return;
    panned.current = false;
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    pinch.current = pinchSnapshot();
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function pinchSnapshot() {
    const points = [...pointers.current.values()];
    if (points.length < 2) return null;
    return {
      dist: Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y),
      midX: (points[0].x + points[1].x) / 2,
      midY: (points[0].y + points[1].y) / 2,
    };
  }

  function onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!pointers.current.has(event.pointerId)) return;
    const previous = pointers.current.get(event.pointerId)!;
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const nextPinch = pinchSnapshot();
    const rect = viewportRef.current?.getBoundingClientRect();
    if (nextPinch && pinch.current && rect && pinch.current.dist > 0) {
      const prevPinch = pinch.current;
      const factor = nextPinch.dist / prevPinch.dist;
      setCamera((current) => {
        const zoomed = zoomAt(current, prevPinch.midX, prevPinch.midY, current.zoom * factor, rect);
        return { ...zoomed, x: zoomed.x + (nextPinch.midX - prevPinch.midX), y: zoomed.y + (nextPinch.midY - prevPinch.midY) };
      });
    } else if (pointers.current.size === 1) {
      if (Math.hypot(event.clientX - previous.x, event.clientY - previous.y) > 2) panned.current = true;
      setCamera((current) => ({ ...current, x: current.x + event.clientX - previous.x, y: current.y + event.clientY - previous.y }));
    }
    pinch.current = nextPinch;
  }

  function onPointerUp(event: React.PointerEvent<HTMLDivElement>) {
    pointers.current.delete(event.pointerId);
    pinch.current = pinchSnapshot();
  }

  function beginDrag(event: React.PointerEvent, id: string, card: LayoutCard | null, frame?: LayoutFrame) {
    event.stopPropagation();
    event.preventDefault();
    const startX = event.clientX;
    const startY = event.clientY;
    const base = offsets[id] ?? { dx: 0, dy: 0 };
    const drag = { dx: base.dx, dy: base.dy, moved: false };
    const move = (ev: PointerEvent) => {
      const dx = (ev.clientX - startX) / cameraRef.current.zoom;
      const dy = (ev.clientY - startY) / cameraRef.current.zoom;
      if (Math.hypot(ev.clientX - startX, ev.clientY - startY) > 5) drag.moved = true;
      drag.dx = base.dx + dx;
      drag.dy = base.dy + dy;
      setLive({ [id]: { dx: drag.dx, dy: drag.dy } });
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      setLive({});
      if (drag.moved && card && card.kind !== "summary" && card.kind !== "empty") onCommitOffset(id, drag.dx, drag.dy);
      else if (card?.kind === "summary") focusIdea(card.ideaId);
      else if (card) onSelect(card);
      else if (frame?.ideaId) focusIdea(frame.ideaId);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  const cardById = new Map(placed.cards.map((card) => [card.id, card]));

  return (
    <div
      ref={viewportRef}
      className={`viewport lod-${lod}`}
      data-testid="board"
      style={{
        backgroundSize: `${22 * camera.zoom}px ${22 * camera.zoom}px`,
        backgroundPosition: `${camera.x}px ${camera.y}px`,
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <div className="world" style={{ transform: `translate(${camera.x}px, ${camera.y}px) scale(${camera.zoom})` }}>
        {placed.frames.map((frame) => (
          <FrameChrome
            key={frame.id}
            frame={frame}
            board={board}
            zoom={camera.zoom}
            onHeaderDown={(event) => beginDrag(event, frame.id, null, frame)}
            onBodyClick={() => {
              if (panned.current || !frame.ideaId) return;
              focusIdea(frame.ideaId);
            }}
          />
        ))}
        <svg className="arrow-layer" width={Math.max(placed.bounds.w + placed.bounds.x + 200, 10)} height={Math.max(placed.bounds.h + placed.bounds.y + 200, 10)}>
          <defs>
            <marker id="head" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
              <path d="M0,0 L7,3 L0,6 Z" fill="#1e1e1e" />
            </marker>
            <marker id="head-blue" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
              <path d="M0,0 L7,3 L0,6 Z" fill="#3b5bdb" />
            </marker>
          </defs>
          {placed.arrows.map((arrow) => {
            const from = cardById.get(arrow.fromId);
            const to = cardById.get(arrow.toId);
            if (!from || !to) return null;
            const path = arrowPath(from, to, arrow.kind);
            const blue = arrow.kind === "loop";
            return (
              <g key={arrow.id}>
                <path d={path.d} fill="none" stroke={blue ? "#3b5bdb" : "#1e1e1e"} strokeWidth={blue ? 1.6 : 1.4} strokeDasharray={blue ? "7 6" : undefined} markerEnd={blue ? "url(#head-blue)" : "url(#head)"} />
                {arrow.label && (
                  <text x={path.labelX} y={path.labelY} textAnchor="middle" className="loop-label">
                    {arrow.label}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
        {lod !== "far" &&
          placed.sections.map((section) => (
            <div key={`${section.ideaId}-${section.section}`} className="section-label" style={{ left: section.x, top: section.y, width: section.w }}>
              {section.label}
            </div>
          ))}
        {placed.cards.map((card) => (
          <CardFace
            key={card.id}
            card={card}
            board={board}
            zoom={camera.zoom}
            selected={selectedId === card.id}
            onPointerDown={(event) => beginDrag(event, card.id, card)}
          />
        ))}
      </div>
      <Minimap layout={placed} camera={camera} viewport={size} onJump={(worldX, worldY) => {
        setCamera((current) => ({
          ...current,
          x: size.w / 2 - worldX * current.zoom,
          y: size.h / 2 - worldY * current.zoom,
        }));
      }} />
    </div>
  );
});

function FrameChrome({
  frame,
  board,
  zoom,
  onHeaderDown,
  onBodyClick,
}: {
  frame: LayoutFrame;
  board: BoardPayload;
  zoom: number;
  onHeaderDown: (event: React.PointerEvent) => void;
  onBodyClick: () => void;
}) {
  const idea = frame.ideaId ? board.ideas.find((item) => item.id === frame.ideaId) : undefined;
  const far = zoom < 0.32;
  return (
    <section className={`frame${frame.mode === "cluster" ? " is-cluster" : ""}`} style={{ left: frame.x, top: frame.y, width: frame.w, height: frame.h }} data-testid={`frame-${frame.ideaId ?? frame.id}`} onClick={onBodyClick}>
      <Sketch width={frame.w} height={frame.h} seed={seedFrom(frame.id)} stroke="#1e1e1e" strokeWidth={2} roughness={1.35} />
      <header className={`frame-head${far ? " is-far" : ""}`} style={far ? { transform: `scale(${1 / zoom})` } : undefined} onPointerDown={onHeaderDown} onClick={(event) => event.stopPropagation()}>
        <h2 style={{ fontSize: far ? 18 : Math.min(36, Math.max(22, 18 / zoom)) }}>
          {frame.title}
          {idea && <StatusPill status={idea.status} />}
        </h2>
        {!far && idea && (
          <p>
            Now: {deriveNow(board, idea.id)} · updated {formatAgo(idea.updatedAt)}
          </p>
        )}
        {!far && frame.subtitle && <p>{frame.subtitle}</p>}
      </header>
    </section>
  );
}

function arrowPath(from: LayoutCard, to: LayoutCard, kind: "test" | "loop"): { d: string; labelX: number; labelY: number } {
  if (kind === "loop") {
    const x1 = from.x + from.w / 2;
    const y1 = from.y + from.h - 8;
    const x2 = to.x + to.w * 0.55;
    const y2 = to.y + to.h - 6;
    const dip = Math.max(y1, y2) + 30;
    const mid = (x1 + x2) / 2;
    return {
      d: `M ${x1} ${y1} C ${x1} ${dip}, ${mid + 40} ${dip}, ${mid} ${dip} S ${x2} ${y2 + 24}, ${x2} ${y2}`,
      labelX: mid,
      labelY: dip + 16,
    };
  }
  const x1 = from.x + from.w;
  const y1 = from.y + from.h * 0.45;
  const x2 = to.x;
  const y2 = to.y + Math.min(46, to.h * 0.4);
  const bend = Math.max(26, (x2 - x1) * 0.45);
  return {
    d: `M ${x1} ${y1} C ${x1 + bend} ${y1}, ${x2 - bend} ${y2}, ${x2 - 7} ${y2}`,
    labelX: 0,
    labelY: 0,
  };
}

function Minimap({
  layout,
  camera,
  viewport,
  onJump,
}: {
  layout: BoardLayout;
  camera: Camera;
  viewport: { w: number; h: number };
  onJump: (worldX: number, worldY: number) => void;
}) {
  const bounds = layout.bounds;
  const pad = 18;
  const width = 188;
  const height = 124;
  const scale = Math.min((width - 16) / Math.max(bounds.w + pad * 2, 1), (height - 16) / Math.max(bounds.h + pad * 2, 1));
  const originX = 8 - (bounds.x - pad) * scale;
  const originY = 8 - (bounds.y - pad) * scale;
  const view = {
    x: originX + (-camera.x / camera.zoom) * scale,
    y: originY + (-camera.y / camera.zoom) * scale,
    w: (viewport.w / camera.zoom) * scale,
    h: (viewport.h / camera.zoom) * scale,
  };

  function jump(event: React.PointerEvent<SVGSVGElement>) {
    event.stopPropagation();
    const rect = event.currentTarget.getBoundingClientRect();
    const localX = event.clientX - rect.left;
    const localY = event.clientY - rect.top;
    onJump((localX - originX) / scale, (localY - originY) / scale);
  }

  return (
    <svg className="minimap" width={width} height={height} onPointerDown={jump} aria-label="Minimap" data-testid="minimap">
      <rect x="0" y="0" width={width} height={height} rx="10" fill="#fffef9" stroke="#1e1e1e" />
      {layout.frames.map((frame) => (
        <rect
          key={frame.id}
          x={originX + frame.x * scale}
          y={originY + frame.y * scale}
          width={Math.max(frame.w * scale, 2)}
          height={Math.max(frame.h * scale, 2)}
          fill={frame.overview ? "#d0d0f7" : "#ececee"}
          stroke="#6965db"
          strokeWidth="1"
        />
      ))}
      <rect x={view.x} y={view.y} width={Math.max(view.w, 4)} height={Math.max(view.h, 4)} fill="none" stroke="#6965db" strokeWidth="1.5" />
    </svg>
  );
}
