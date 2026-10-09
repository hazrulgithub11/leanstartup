import type { BoardPayload, Experiment, Learning } from "../../shared/types";
import type { LayoutCard } from "../../shared/layout";
import { CANVAS_FIELDS, formatDate, formatDayMonth, passLine, scoreBar } from "../../shared/text";
import { learningForExperiment, primaryExperiment, validationNote } from "../../shared/select";
import { EvidenceLadder, LockIcon, ScoreBar, StatusPill } from "./Marks";

export function Inspector({
  board,
  card,
  onClose,
}: {
  board: BoardPayload;
  card: LayoutCard;
  onClose: () => void;
}) {
  const idea = board.ideas.find((item) => item.id === card.ideaId);
  const experiment = experimentFor(board, card);
  const assumption = board.assumptions.find((item) => item.id === (card.kind === "assumption" ? card.entityId : experiment?.assumptionId));
  const learning = learningFor(board, card, experiment);
  const note = assumption ? validationNote(assumption, board.experiments) : undefined;

  return (
    <aside className="inspector" data-testid="inspector">
      <header className="inspector-head">
        <p>
          Selected {labelFor(card, board)}
          {idea ? ` · ${idea.name}` : ""}
        </p>
        <button type="button" onClick={onClose} aria-label="Close details">
          Esc
        </button>
      </header>
      {experiment && (card.kind === "assumption" || card.kind === "experiment" || card.kind === "measure") ? (
        <div className="inspector-grid">
          <TestCard experiment={experiment} believe={assumption?.statement} />
          <ResultCard experiment={experiment} note={note} />
          <LearningCard learning={learning} />
        </div>
      ) : card.kind === "canvas" ? (
        <CanvasDetail board={board} id={card.entityId} />
      ) : card.kind === "learning" || card.kind === "decision" ? (
        <div className="inspector-grid single">
          <LearningCard learning={learning} />
        </div>
      ) : (
        idea && (
          <div className="inspector-grid single">
            <article className="detail">
              <h3>{idea.name}</h3>
              <StatusPill status={idea.status} />
              <p>{idea.problem}</p>
              {idea.customerSegment && <p className="meta">Customer · {idea.customerSegment}</p>}
              {idea.url && (
                <a href={idea.url} target="_blank" rel="noreferrer">
                  Open in Notion
                </a>
              )}
            </article>
          </div>
        )
      )}
      <p className="legend">
        <i className="dot risk-high" /> High <i className="dot risk-medium" /> Medium <i className="dot risk-low" /> Low
        <span>? Untested · ◔ Testing · ✓ Validated · ✗ Invalidated</span>
        <span>Only “Did” can mark an assumption Validated.</span>
      </p>
    </aside>
  );
}

function TestCard({ experiment, believe }: { experiment: Experiment; believe?: string }) {
  const line = passLine(experiment);
  return (
    <article className="detail">
      <h3>
        Test card · {experiment.code} {experiment.name}
      </h3>
      {believe && (
        <p>
          <b>We believe</b> {believe}
        </p>
      )}
      {experiment.method && (
        <p>
          <b>To verify, we will</b> {experiment.method}
        </p>
      )}
      {experiment.successMetric && (
        <p>
          <b>And measure</b> {experiment.successMetric}
        </p>
      )}
      {line && (
        <p className="pass">
          <LockIcon /> {line}
          {experiment.lockedAt ? ` · locked ${formatDayMonth(experiment.lockedAt)}` : ""}
        </p>
      )}
    </article>
  );
}

function ResultCard({ experiment, note }: { experiment: Experiment; note?: string }) {
  const score = scoreBar(experiment.result, experiment.target);
  return (
    <article className="detail">
      <h3>
        Result <em className={`outcome outcome-${experiment.outcome.toLowerCase()}`}>{experiment.outcome}</em>
      </h3>
      {score ? (
        <>
          <ScoreBar value={score.value} total={score.total} target={score.target} />
          <strong className="result-line">{experiment.result}</strong>
        </>
      ) : (
        <p>{experiment.result || "Not measured yet"}</p>
      )}
      {experiment.evidence ? <EvidenceLadder level={experiment.evidence} /> : <p className="muted">No evidence level on this test.</p>}
      {note && <p className="note">{note}</p>}
    </article>
  );
}

function LearningCard({ learning }: { learning?: Learning }) {
  if (!learning) {
    return (
      <article className="detail">
        <h3>Learning card</h3>
        <p className="muted">No learning written for this test yet.</p>
      </article>
    );
  }
  return (
    <article className="detail">
      <h3>Learning card{learning.date ? ` · ${formatDate(learning.date)}` : ""}</h3>
      {learning.observed ? (
        <p>
          <b>We observed</b> {learning.observed}
        </p>
      ) : (
        <p>{learning.insight}</p>
      )}
      {learning.learned && (
        <p>
          <b>We learned</b> {learning.learned}
        </p>
      )}
      {(learning.therefore || learning.decision) && (
        <p>
          <b>Therefore we will</b> {learning.therefore || learning.decision}
          {learning.pivotType ? ` · ${learning.pivotType}` : ""}
        </p>
      )}
      {learning.decision && <p className={`decision-word decision-${learning.decision.toLowerCase()}`}>{learning.decision}</p>}
    </article>
  );
}

function CanvasDetail({ board, id }: { board: BoardPayload; id: string }) {
  const canvas = board.canvases.find((item) => item.id === id);
  if (!canvas) return null;
  return (
    <div className="inspector-canvas">
      <h3>
        {canvas.name} · {formatDate(canvas.date)} · Ash Maurya, Running Lean
      </h3>
      <dl>
        {CANVAS_FIELDS.map((field) => (
          <div key={field.key}>
            <dt>
              {field.n}. {field.title}
            </dt>
            <dd>{canvas.boxes[field.key] || "—"}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function experimentFor(board: BoardPayload, card: LayoutCard): Experiment | undefined {
  if (card.kind === "experiment" || card.kind === "measure") return board.experiments.find((item) => item.id === card.entityId);
  if (card.kind === "assumption") return primaryExperiment(board.experiments, card.entityId);
  if (card.kind === "learning") {
    const learning = board.learnings.find((item) => item.id === card.entityId);
    return board.experiments.find((item) => item.id === learning?.experimentId);
  }
  return undefined;
}

function learningFor(board: BoardPayload, card: LayoutCard, experiment?: Experiment): Learning | undefined {
  if (card.kind === "learning") return board.learnings.find((item) => item.id === card.entityId);
  if (card.kind === "decision") return board.learnings.find((item) => item.id === card.entityId);
  if (experiment) return learningForExperiment(board.learnings, experiment.id);
  return undefined;
}

function labelFor(card: LayoutCard, board: BoardPayload): string {
  if (card.kind === "assumption") return board.assumptions.find((item) => item.id === card.entityId)?.code ?? "Assumption";
  if (card.kind === "experiment" || card.kind === "measure") return board.experiments.find((item) => item.id === card.entityId)?.code ?? "Experiment";
  if (card.kind === "canvas") return "Canvas";
  if (card.kind === "learning") return "Learning";
  if (card.kind === "decision") return "Decision";
  return "Idea";
}
