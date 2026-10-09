import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { BoardPayload } from "../shared/types";
import { exampleBoard } from "../shared/example-data";
import { layoutBoard, type LayoutCard, type Offsets } from "../shared/layout";
import { Board, type BoardHandle, type BoardView } from "./components/Board";
import { ErrorBanner, Hint, MobileSheet, PinchHint, ToolBar, TopBar, ZoomBar } from "./components/Chrome";
import { Inspector } from "./components/Inspector";
import { loadOffsets, saveOffsets } from "./lib/storage";

export function App() {
  const [board, setBoard] = useState<BoardPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState<LayoutCard | null>(null);
  const [offsets, setOffsets] = useState<Offsets>({});
  const [mobile, setMobile] = useState(false);
  const [pinchHint, setPinchHint] = useState(false);
  const [view, setView] = useState<BoardView>({ zoom: 0.4 });
  const boardRef = useRef<BoardHandle>(null);

  useEffect(() => {
    setOffsets(loadOffsets());
    const media = window.matchMedia("(max-width: 760px)");
    const apply = () => setMobile(media.matches);
    apply();
    media.addEventListener("change", apply);
    setPinchHint(media.matches && !sessionStorage.getItem("leanlab-pinch"));
    return () => media.removeEventListener("change", apply);
  }, []);

  const refresh = useCallback(async (force: boolean) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/board${force ? "?refresh=1" : ""}`);
      const body = (await response.json()) as BoardPayload & { error?: string };
      if (!response.ok || body.error) {
        setError(body.error || `Could not read Notion (${response.status}).`);
        return;
      }
      setError(null);
      setBoard(body);
    } catch {
      setError(null);
      setBoard(exampleBoard());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh(false);
  }, [refresh]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelected(null);
      if (event.key === "+" || event.key === "=") boardRef.current?.zoomBy(1.12);
      if (event.key === "-" || event.key === "_") boardRef.current?.zoomBy(1 / 1.12);
      if (event.key === "0") boardRef.current?.fit();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const layout = useMemo(() => (board ? layoutBoard(board, { status: filter }) : null), [board, filter]);
  const selectedCard = layout?.cards.find((card) => card.id === selected?.id) ?? null;

  const onView = useCallback((next: BoardView) => setView(next), []);

  const dock = mobile ? "min(46vh, 420px)" : selectedCard ? "252px" : "0px";

  function commitOffset(id: string, dx: number, dy: number) {
    setOffsets((current) => {
      const next = { ...current, [id]: { dx, dy } };
      saveOffsets(next);
      return next;
    });
  }

  function resetOffsets() {
    setOffsets({});
    saveOffsets({});
  }

  return (
    <div className={`app${mobile ? " is-mobile" : ""}`} style={{ ["--dock" as string]: dock }}>
      {board && (
        <TopBar
          board={board}
          filter={filter}
          onFilter={(status) => {
            setFilter(status);
            setSelected(null);
            window.setTimeout(() => boardRef.current?.fit(), 0);
          }}
          loading={loading}
          onRefresh={() => void refresh(true)}
          zoom={view.zoom}
          ideaId={view.ideaId}
          section={view.section}
          onCrumb={(target) => {
            if (target === "board") boardRef.current?.fit();
            else if (view.ideaId) boardRef.current?.focusIdea(view.ideaId);
          }}
        />
      )}
      {!mobile && board && <ToolBar onZoom={(factor) => boardRef.current?.zoomBy(factor)} onFit={() => boardRef.current?.fit()} readOnly />}
      {error && (
        <ErrorBanner
          message={error}
          onExample={() => {
            setBoard(exampleBoard());
            setError(null);
          }}
        />
      )}
      {board && layout && (
        <Board
          ref={boardRef}
          board={board}
          layout={layout}
          offsets={offsets}
          selectedId={selectedCard?.id}
          mobile={mobile}
          onSelect={setSelected}
          onCommitOffset={commitOffset}
          onView={onView}
        />
      )}
      {!board && !error && <p className="opening">Opening the lab…</p>}
      {!mobile && board && (
        <>
          <ZoomBar zoom={view.zoom} onZoom={(factor) => boardRef.current?.zoomBy(factor)} onFit={() => boardRef.current?.fit()} dirty={Object.keys(offsets).length > 0} onReset={resetOffsets} />
          <Hint />
        </>
      )}
      {!mobile && board && selectedCard && <Inspector board={board} card={selectedCard} onClose={() => setSelected(null)} />}
      {mobile && board && <MobileSheet board={board} filter={filter} onOpen={(ideaId) => boardRef.current?.focusIdea(ideaId)} />}
      {mobile && pinchHint && (
        <PinchHint
          onDone={() => {
            sessionStorage.setItem("leanlab-pinch", "1");
            setPinchHint(false);
          }}
        />
      )}
    </div>
  );
}
