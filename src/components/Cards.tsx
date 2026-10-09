import type { BoardPayload } from "../../shared/types";
import type { LayoutCard } from "../../shared/layout";
import { CANVAS_FIELDS, formatDate, passLine, scoreBar, seedFrom } from "../../shared/text";
import { learningForExperiment, summaryLine } from "../../shared/select";
import { DECISION_STYLE, OUTCOME_INK, RISK_STYLE } from "../theme";
import { EvidenceLadder, LockIcon, ScoreBar, StatusPill } from "./Marks";
import { Sketch } from "./Sketch";

function clampClass(zoom: number): string {
  if (zoom < 0.5) return "clamp-3";
  if (zoom < 0.85) return "clamp-6";
  return "clamp-12";
}

export function CardFace({
  card,
  board,
  zoom,
  selected,
  onPointerDown,
}: {
  card: LayoutCard;
  board: BoardPayload;
  zoom: number;
  selected: boolean;
  onPointerDown: (event: React.PointerEvent) => void;
}) {
  const clamp = clampClass(zoom);
  const showMore = zoom >= 0.72;
  const idea = board.ideas.find((item) => item.id === card.ideaId);
  const tilt = card.kind === "assumption" ? ((seedFrom(card.id) % 5) - 2) * 0.4 : 0;

  let fill = "#fffef9";
  let stroke = "#1e1e1e";
  let shape: "rect" | "diamond" = "rect";
  let fillStyle: "solid" | "hachure" = "solid";
  let roughness = 1.15;

  if (card.kind === "canvas") {
    fill = "#f3f1ff";
    stroke = "#5b57c2";
  } else if (card.kind === "assumption") {
    const assumption = board.assumptions.find((item) => item.id === card.entityId);
    const tone = RISK_STYLE[assumption?.risk ?? "Medium"];
    fill = tone.fill;
    stroke = tone.stroke;
    roughness = 1.45;
  } else if (card.kind === "decision") {
    shape = "diamond";
    fillStyle = "hachure";
    const learning = board.learnings.find((item) => item.id === card.entityId);
    const tone = learning?.decision ? DECISION_STYLE[learning.decision] : { fill: "#f1f3f5", stroke: "#868e96" };
    fill = tone.fill;
    stroke = tone.stroke;
    roughness = 1.3;
  } else if (card.kind === "learning") {
    fill = "#e9f8ec";
    stroke = "#2b8a3e";
  } else if (card.kind === "measure") {
    fill = "#f7fbf7";
  } else if (card.kind === "empty") {
    fill = "#f8f7f4";
    stroke = "#adb5bd";
  }

  return (
    <div
      className={`card card-${card.kind}${selected ? " is-selected" : ""}`}
      style={{ left: card.x, top: card.y, width: card.w, height: card.h, transform: tilt ? `rotate(${tilt}deg)` : undefined }}
      data-card={card.id}
      data-testid={`card-${card.id}`}
      onPointerDown={onPointerDown}
    >
      <Sketch width={card.w} height={card.h} seed={seedFrom(card.id)} fill={fill} stroke={stroke} shape={shape} fillStyle={fillStyle} roughness={roughness} />
      <div className="card-body">{renderBody()}</div>
    </div>
  );

  function renderBody() {
    if (card.kind === "empty") return <p className="empty-label">{card.label}</p>;

    if (card.kind === "summary" && idea) {
      return (
        <div className="summary-body">
          <StatusPill status={idea.status} />
          <h3>{idea.name}</h3>
          <p className="clamp-3">{summaryLine(board, idea)}</p>
        </div>
      );
    }

    if (card.kind === "idea" && idea) {
      return (
        <>
          <h3>{idea.name}</h3>
          <p className={clamp}>{idea.problem}</p>
          {idea.customerSegment && <p className="meta">Customer · {idea.customerSegment}</p>}
          <StatusPill status={idea.status} />
        </>
      );
    }

    if (card.kind === "canvas") {
      const canvas = board.canvases.find((item) => item.id === card.entityId);
      if (!canvas) return null;
      return (
        <div className="canvas-body">
          <header className="canvas-head">
            <strong>{canvas.name}</strong>
            <span>
              {formatDate(canvas.date)} · 9-box format by Ash Maurya (Running Lean)
            </span>
          </header>
          <div className="canvas-grid">
            {CANVAS_FIELDS.map((field) => {
              const text = canvas.boxes[field.key];
              return (
                <section key={field.key} style={{ gridArea: field.area }}>
                  <h4>
                    <span className="num">{field.n}</span>
                    {field.title}
                  </h4>
                  <p className={clamp}>{text || "—"}</p>
                  {showMore && text.length > 140 && <span className="more">more</span>}
                </section>
              );
            })}
          </div>
        </div>
      );
    }

    if (card.kind === "assumption") {
      const assumption = board.assumptions.find((item) => item.id === card.entityId);
      if (!assumption) return null;
      return (
        <div className="sticky-body">
          <div className="sticky-top">
            <b>{assumption.code}</b>
            {assumption.type && <span>{assumption.type}</span>}
          </div>
          <p className={clamp}>{assumption.statement}</p>
          <div className="sticky-foot">
            <i className={`dot risk-${assumption.risk.toLowerCase()}`} />
            <span>
              {mark(assumption.status)} {assumption.status}
            </span>
          </div>
        </div>
      );
    }

    if (card.kind === "experiment" || card.kind === "measure") {
      const experiment = board.experiments.find((item) => item.id === card.entityId);
      if (!experiment) return null;
      const line = passLine(experiment);
      const assumption = board.assumptions.find((item) => item.id === experiment.assumptionId);
      const ink = OUTCOME_INK[experiment.outcome] ?? "#495057";
      if (card.kind === "measure") {
        const score = scoreBar(experiment.result, experiment.target);
        return (
          <>
            <div className="kicker">
              <span>Result</span>
              <em style={{ color: ink }}>{experiment.outcome}</em>
            </div>
            {score ? (
              <>
                <ScoreBar value={score.value} total={score.total} target={score.target} />
                <strong className="result-line">{experiment.result}</strong>
              </>
            ) : (
              <p className="muted">{experiment.result || "Not measured yet"}</p>
            )}
            {experiment.evidence && <EvidenceLadder level={experiment.evidence} />}
          </>
        );
      }
      return (
        <>
          <div className="kicker">
            <span>
              {experiment.code} · Test card
            </span>
            <em style={{ color: ink }}>{experiment.outcome}</em>
          </div>
          <h3>{experiment.name}</h3>
          {line && (
            <p className="pass">
              <LockIcon /> {line}
            </p>
          )}
          <p className="meta">
            we believe {assumption?.code ?? "—"}
            {experiment.method ? ` · ${experiment.method}` : ""}
          </p>
        </>
      );
    }

    if (card.kind === "learning") {
      const learning = board.learnings.find((item) => item.id === card.entityId);
      if (!learning) return null;
      return (
        <>
          <div className="kicker">
            <span>Learning</span>
            <em>{formatDate(learning.date)}</em>
          </div>
          <p className={clamp}>{learning.insight}</p>
          {learning.decision && <p className="therefore">therefore {learning.decision}</p>}
        </>
      );
    }

    if (card.kind === "decision") {
      const learning = board.learnings.find((item) => item.id === card.entityId);
      const linked = learning?.experimentId ? learningForExperiment(board.learnings, learning.experimentId) : learning;
      return (
        <div className="diamond-label">
          <strong>{linked?.decision ?? card.label ?? "No decision yet"}</strong>
          {linked?.pivotType && <span>{linked.pivotType}</span>}
          {linked?.date && <span>{formatDate(linked.date)}</span>}
        </div>
      );
    }

    return null;
  }
}

function mark(status: string): string {
  if (status === "Validated") return "✓";
  if (status === "Invalidated") return "✗";
  if (status === "Testing") return "◔";
  return "?";
}
