"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import type { RepoAnalysis, StudyDepth, StudyGoal } from "../lib/types";
import { samDemo as demo } from "../lib/demo-report";

const goals: Array<{ value: StudyGoal; label: string; detail: string }> = [
  { value: "overview", label: "Understand architecture", detail: "Build a code and module map" },
  { value: "reproduce", label: "Reproduce an experiment", detail: "Trace environment, commands, and deviations" },
  { value: "contribute", label: "Continue development", detail: "Locate a change and its verification path" },
];

const depths: Array<{ value: StudyDepth; label: string }> = [
  { value: "quick", label: "30-minute scan" },
  { value: "standard", label: "Standard review" },
  { value: "deep", label: "Deep research" },
];

const formatStars = (count: number) => count === 0 ? "Live" : count >= 1000 ? `${(count / 1000).toFixed(1)}k` : String(count);
const confidenceLabels = { high: "Strong evidence", medium: "Moderate evidence", exploratory: "Exploratory" };
const importanceLabels = { foundation: "Foundation", core: "Core", advanced: "Advanced" };
const benchmarkRows = [
  { repository: "karpathy/nanoGPT", readmeOnly: "60.0%", repoLens: "100.0%", difference: "+40.0 pp" },
  { repository: "openai/whisper", readmeOnly: "28.6%", repoLens: "71.4%", difference: "+42.8 pp" },
  { repository: "facebookresearch/segment-anything", readmeOnly: "16.7%", repoLens: "50.0%", difference: "+33.3 pp" },
];

export default function Home() {
  const [repository, setRepository] = useState("facebookresearch/segment-anything");
  const [focus, setFocus] = useState("");
  const [goal, setGoal] = useState<StudyGoal>("reproduce");
  const [depth, setDepth] = useState<StudyDepth>("standard");
  const [agentMode, setAgentMode] = useState(false);
  const [analysis, setAnalysis] = useState<RepoAnalysis>(demo);
  const [status, setStatus] = useState<"demo" | "loading" | "live">("demo");
  const [error, setError] = useState("");
  const [activeStep, setActiveStep] = useState(0);
  const [completed, setCompleted] = useState<string[]>([]);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [copied, setCopied] = useState("");

  const storageKey = `repolens-progress:${analysis.repo.fullName}:${analysis.goal}:${analysis.scope.focus || "root"}`;

  useEffect(() => {
    if (status === "live") localStorage.setItem(storageKey, JSON.stringify(completed));
  }, [completed, status, storageKey]);

  const progress = Math.round((completed.length / Math.max(1, analysis.learningPath.length)) * 100);
  const score = Object.entries(answers).filter(([index, answer]) => analysis.quiz[Number(index)]?.answer === answer).length;
  const evidenceById = useMemo(() => new Map(analysis.keyFiles.map((file) => [file.id, file])), [analysis.keyFiles]);

  async function analyze(event: FormEvent) {
    event.preventDefault();
    if (!repository.trim()) return;
    setStatus("loading");
    setError("");
    setAnswers({});
    setCompleted([]);
    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repository: repository.trim(), focus: focus.trim(), goal, depth, agent: agentMode }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Repository analysis failed");
      setAnalysis(payload);
      try {
        const nextStorageKey = `repolens-progress:${payload.repo.fullName}:${payload.goal}:${payload.scope?.focus || "root"}`;
        const saved = localStorage.getItem(nextStorageKey);
        setCompleted(saved ? JSON.parse(saved) : []);
      } catch {
        setCompleted([]);
      }
      setStatus("live");
      setActiveStep(0);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Repository analysis failed. Please try again later.");
      setStatus("demo");
    }
  }

  function toggleComplete(number: string) {
    setCompleted((current) => current.includes(number) ? current.filter((item) => item !== number) : [...current, number]);
  }

  async function copyCommand(command: string, title: string) {
    if (!command) return;
    await navigator.clipboard.writeText(command);
    setCopied(title);
    window.setTimeout(() => setCopied(""), 1600);
  }

  function exportReport() {
    const evidenceName = (ids: string[]) => ids.map((id) => `${id} ${evidenceById.get(id)?.path || ""}`).join(", ");
    const markdown = [
      `# RepoLens Research Report: ${analysis.repo.fullName}`,
      "",
      `- Research goal: ${goals.find((item) => item.value === analysis.goal)?.label}`,
      `- Research scope: ${analysis.scope.focus || "Whole repository"}`,
      `- Analysis revision: ${analysis.repo.revision}`,
      `- Analysis engine: ${analysis.engine.label}`,
      `- Evidence exploration: ${analysis.exploration.mode === "agent" ? `Read-only Agent (${analysis.exploration.rounds} rounds, ${analysis.exploration.addedFiles.length} added files)` : "Deterministic retrieval"}`,
      `- Model usage: ${analysis.usage.modelCalls} calls, ${analysis.usage.totalTokens} tokens`,
      `- Confidence: ${confidenceLabels[analysis.confidence]}`,
      "",
      "## Research brief", analysis.summary, `Evidence: ${evidenceName(analysis.summaryEvidenceIds)}`, "",
      "## Architecture", analysis.architecture, `Evidence: ${evidenceName(analysis.architectureEvidenceIds)}`, "",
      "## Next research action", analysis.firstContribution, `Evidence: ${evidenceName(analysis.firstContributionEvidenceIds)}`, "",
      "## Key concepts",
      ...analysis.concepts.flatMap((item) => [`### ${item.title}`, item.explanation, `Evidence: ${evidenceName(item.evidenceIds)}`, ""]),
      "## Review path",
      ...analysis.learningPath.flatMap((step) => [`### ${step.number} ${step.title}`, step.description, `Task: ${step.task}`, `Completion criterion: ${step.outcome}`, `Evidence: ${evidenceName(step.evidenceIds)}`, ""]),
      "## Reproduction plan", analysis.reproduction.summary, `Evidence: ${evidenceName(analysis.reproduction.evidenceIds)}`,
      ...analysis.reproduction.steps.flatMap((step, index) => [
        `${index + 1}. ${step.title}${step.command ? ` — \`${step.command}\`` : ""}`,
        `   - Reason: ${step.reason}`,
        `   - Evidence: ${evidenceName(step.evidenceIds)}`,
      ]),
      "", "### Safety notes",
      ...analysis.reproduction.warnings.map((warning) => `- ${warning.text}${warning.evidenceIds.length ? ` (Evidence: ${evidenceName(warning.evidenceIds)})` : " (General safety guidance)"}`),
      "", "## Evidence index",
      ...analysis.keyFiles.map((file) => `- ${file.id}: [${file.path}](${file.url}) — ${file.reason}`),
      "", "> RepoLens generated this report from public repository evidence. Review commands manually and use an isolated environment before execution.",
    ].join("\n");
    const url = URL.createObjectURL(new Blob([markdown], { type: "text/markdown;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${analysis.repo.fullName.replace("/", "-")}-repolens.md`;
    link.click();
    URL.revokeObjectURL(url);
  }

  const currentStep = analysis.learningPath[activeStep] || analysis.learningPath[0];

  return (
    <main>
      <header className="topbar">
        <a className="brand" href="#top" aria-label="RepoLens home"><span className="brand-mark">RL</span><span>RepoLens</span></a>
        <nav aria-label="Primary navigation"><a href="#benchmark">Evaluation</a><a href="#brief">Brief</a><a href="#evidence">Evidence</a><a href="#reproduce">Reproduce</a><a href="#verify">Verify</a></nav>
        <span className="build-pill"><i /> Public research workspace</span>
      </header>

      <section className="hero" id="top">
        <div className="hero-copy">
          <span className="eyebrow">EVIDENCE-GROUNDED REPOSITORY INTELLIGENCE</span>
          <h1>From a research repository to<br /><span>auditable, reproducible understanding</span></h1>
          <p>RepoLens gives researchers and R&amp;D teams a source map, key mechanisms, a reproduction path, and an evidence index. Models connect concepts; repository evidence constrains facts.</p>
          <form className="research-form" onSubmit={analyze}>
            <label htmlFor="repository">Public GitHub repository</label>
            <div className="repo-input-row">
              <span className="repo-prefix">github.com/</span>
              <input id="repository" value={repository} onChange={(event) => setRepository(event.target.value)} placeholder="owner/repository" autoComplete="off" />
              <button type="submit" disabled={status === "loading"}>{status === "loading" ? (agentMode ? "Agent is closing evidence gaps…" : "Reading source evidence…") : "Generate research report"}</button>
            </div>
            <div className="scope-input-row">
              <label htmlFor="focus">Research scope (optional)</label>
              <input id="focus" value={focus} onChange={(event) => setFocus(event.target.value)} placeholder="For example: lora, trl/trainer, or mnist" autoComplete="off" />
            </div>
            <fieldset>
              <legend>Research goal</legend>
              <div className="goal-grid">
                {goals.map((item) => <button type="button" key={item.value} className={goal === item.value ? "selected" : ""} aria-pressed={goal === item.value} onClick={() => setGoal(item.value)}><b>{item.label}</b><small>{item.detail}</small></button>)}
              </div>
            </fieldset>
            <div className="form-foot">
              <div className="analysis-controls">
                <div className="depth-picker" aria-label="Analysis depth">{depths.map((item) => <button type="button" key={item.value} className={depth === item.value ? "selected" : ""} aria-pressed={depth === item.value} onClick={() => setDepth(item.value)}>{item.label}</button>)}</div>
                <button type="button" className={`agent-toggle ${agentMode ? "selected" : ""}`} aria-pressed={agentMode} onClick={() => setAgentMode((current) => !current)}><i /> Agent exploration <small>Up to 2 rounds · uses DeepSeek credits</small></button>
              </div>
              <span>Public repositories only · source is not stored</span>
            </div>
          </form>
          <div className="status-slot" aria-live="polite">{error ? <span className="error-banner">{error}</span> : status === "loading" ? <span className="loading-message">{agentMode ? "Checking evidence gaps, reading additional files, and generating the report. Agent mode takes longer." : "Selecting key files and building an evidence chain. This usually takes a few seconds."}</span> : null}</div>
          {status === "live" && analysis.scope.multiProject && <div className="scope-suggestions"><b>{analysis.scope.focus ? `Current focus: ${analysis.scope.focus}` : "Multiple subprojects detected. Select a research scope."}</b><div>{analysis.scope.suggestions.map((item) => <button type="button" key={item} onClick={() => setFocus(item)}>{item}</button>)}</div></div>}
        </div>

        <aside className="hero-board" aria-label="RepoLens workflow">
          <div className="board-head"><span>research-trace.rl</span><b>{status === "live" ? "LIVE" : "EXAMPLE"}</b></div>
          <div className="trace-root"><span>REPOSITORY</span><strong>{analysis.repo.fullName}</strong></div>
          <div className="trace-line" />
          <div className="trace-stage"><span>01</span><div><b>READ</b><small>Source and configuration</small></div><em>{analysis.stats.evidence} sources</em></div>
          <div className="trace-stage"><span>02</span><div><b>{analysis.exploration.mode === "agent" ? "EXPLORE" : "REASON"}</b><small>{analysis.exploration.mode === "agent" ? "Close evidence gaps" : "Mechanisms and architecture"}</small></div><em>{analysis.exploration.mode === "agent" ? `${analysis.exploration.rounds} rounds` : `${analysis.concepts.length} concepts`}</em></div>
          <div className="trace-stage"><span>03</span><div><b>REPRODUCE</b><small>Commands and deviations</small></div><em>{analysis.reproduction.steps.length} steps</em></div>
          <div className="trace-stage"><span>04</span><div><b>VERIFY</b><small>Questions and evidence</small></div><em>{analysis.quiz.length} checks</em></div>
          <p>The Agent reads repository evidence only. Every claim must still return a server-issued E-series identifier.</p>
        </aside>
      </section>

      <section className="signal-strip" aria-label="Product principles">
        <span><b>Source-grounded</b> claims link to source evidence</span>
        <span><b>Reproducible</b> records preserve commands and deviations</span>
        <span><b>Bounded agent</b> read-only evidence exploration</span>
      </section>

      <section className="benchmark-section" id="benchmark">
        <div className="benchmark-intro">
          <span className="section-kicker">MEASURED, NOT CLAIMED</span>
          <h2>Retrieval quality measured on real research repositories</h2>
          <p>The fixed benchmark compares README-only retrieval with RepoLens evidence-aware retrieval on the same public Python AI repositories. The metric is exact-path recall against human-labeled key files; it is not semantic accuracy or reproduction success.</p>
          <div className="benchmark-metrics">
            <div><strong>35.1% → 73.8%</strong><small>Mean Python key-file recall</small></div>
            <div><strong>+38.7 pp</strong><small>Deterministic retrieval gain</small></div>
            <div><strong>0.0%</strong><small>Invalid evidence ID rate</small></div>
            <div><strong>0 calls · 0 tokens</strong><small>Model usage in this retrieval test</small></div>
          </div>
        </div>
        <div className="benchmark-table" role="table" aria-label="Python research repository retrieval results">
          <div className="benchmark-row benchmark-head" role="row"><span>Repository</span><span>README-only</span><span>RepoLens</span><span>Difference</span></div>
          {benchmarkRows.map((row) => <div className="benchmark-row" role="row" key={row.repository}><b>{row.repository}</b><span>{row.readmeOnly}</span><span>{row.repoLens}</span><em>{row.difference}</em></div>)}
          <p>Multi-project repositories were tested separately: the fixed `lora` and `mnist` scopes both reached 100% exact-path recall. Scoped reports should not be compared directly with whole-repository results.</p>
        </div>
      </section>

      <section className="report-shell" id="brief">
        <div className="report-header">
          <div><span className="section-kicker">RESEARCH BRIEF</span><h2>{analysis.repo.fullName}</h2><p>{analysis.repo.description}</p></div>
          <div className="report-actions">
            <span className={`engine-badge ${analysis.engine.mode}`}><i /> {analysis.engine.label}</span>
            <button onClick={exportReport}>Export research report ↓</button>
            <a href={analysis.repo.url} target="_blank" rel="noreferrer">Open repository ↗</a>
          </div>
        </div>
        <p className="engine-note">{analysis.engine.note}</p>
        {analysis.usage.modelCalls > 0 && <p className="usage-line">Model usage · {analysis.usage.modelCalls} calls · {analysis.usage.inputTokens.toLocaleString()} input tokens · {analysis.usage.outputTokens.toLocaleString()} output tokens</p>}
        {analysis.exploration.mode === "agent" && analysis.exploration.addedFiles.length > 0 && <div className="exploration-trace"><b>Evidence candidates added by the Agent</b>{analysis.exploration.addedFiles.map((path) => <span key={path}>{path}</span>)}</div>}

        <div className="fact-grid">
          <div><small>Primary language</small><strong>{analysis.repo.language}</strong></div>
          <div><small>Stars</small><strong>{formatStars(analysis.repo.stars)}</strong></div>
          <div><small>Files analyzed</small><strong>{analysis.stats.files}</strong></div>
          <div><small>Evidence files</small><strong>{analysis.stats.evidence}</strong></div>
          <div><small>Review time</small><strong>{analysis.stats.minutes} min</strong></div>
          <div><small>Claim confidence</small><strong>{confidenceLabels[analysis.confidence]}</strong></div>
          <div><small>Analysis revision</small><strong title={analysis.repo.revision}>{analysis.repo.revision.slice(0, 8)}</strong></div>
        </div>

        <div className="brief-grid">
          <article className="brief-card primary"><span>01 · Research brief</span><p>{analysis.summary}</p><div className="citation-row">{analysis.summaryEvidenceIds.map((id) => <a key={id} href={`#evidence-${id}`}>{id} · {evidenceById.get(id)?.path}</a>)}</div></article>
          <article className="brief-card"><span>02 · Architecture</span><p>{analysis.architecture}</p><div className="citation-row">{analysis.architectureEvidenceIds.map((id) => <a key={id} href={`#evidence-${id}`}>{id} · {evidenceById.get(id)?.path}</a>)}</div></article>
          <article className="brief-card"><span>03 · Next research action</span><p>{analysis.firstContribution}</p><div className="citation-row">{analysis.firstContributionEvidenceIds.map((id) => <a key={id} href={`#evidence-${id}`}>{id} · {evidenceById.get(id)?.path}</a>)}</div></article>
        </div>

        <div className="concept-head"><div><span className="section-kicker">MECHANISM MAP</span><h3>Key mechanisms, not a generic summary</h3></div><div className="tech-list">{analysis.technologies.map((tech) => <span key={tech}>{tech}</span>)}</div></div>
        <div className="concept-grid">
          {analysis.concepts.map((concept, index) => <article key={`${concept.title}-${index}`}><div className="concept-index">0{index + 1}</div><span className={`importance ${concept.importance}`}>{importanceLabels[concept.importance]}</span><h4>{concept.title}</h4><p>{concept.explanation}</p><div className="citation-row">{concept.evidenceIds.map((id) => <a key={id} href={`#evidence-${id}`}>{id} · {evidenceById.get(id)?.path}</a>)}</div></article>)}
        </div>
      </section>

      <section className="evidence-section" id="evidence">
        <div className="section-title-row"><div><span className="section-kicker">AUDITABLE EVIDENCE</span><h2>Trace claims back to source</h2><p>Repository text is treated as data, not instructions. The model can cite only server-issued evidence identifiers.</p></div><span className="evidence-count">{analysis.keyFiles.length} key evidence windows</span></div>
        <div className="evidence-layout">
          <div className="evidence-index">
            {analysis.keyFiles.map((file) => <a href={`#evidence-${file.id}`} key={file.id}><b>{file.id}</b><span><strong>{file.path}</strong><small>{file.role}</small></span></a>)}
          </div>
          <div className="evidence-stack">
            {analysis.keyFiles.map((file) => <details id={`evidence-${file.id}`} key={file.id} open={file.id === "E4"}>
              <summary><span className="evidence-id">{file.id}</span><div><b>{file.path}</b><small>{file.reason}</small></div><em>{file.locationLabel || `Lines ${file.lineStart}–${file.lineEnd}`}</em></summary>
              <div className="code-window"><div className="code-toolbar"><span>{file.role}</span><a href={file.url} target="_blank" rel="noreferrer">View original file ↗</a></div><pre>{file.excerpt || "Source content is temporarily unavailable; the path and repository metadata remain low-confidence evidence."}</pre></div>
            </details>)}
          </div>
        </div>
      </section>

      <section className="review-section" id="review">
        <div className="section-title-row dark-title"><div><span className="section-kicker">RESEARCH PATH</span><h2>Turn reading into verifiable research tasks</h2></div><div className="progress-block"><span>{progress}%</span><div><i style={{ width: `${progress}%` }} /></div><small>{completed.length}/{analysis.learningPath.length} stages complete · stored on this device only</small></div></div>
        <div className="review-layout">
          <div className="step-nav">
            {analysis.learningPath.map((step, index) => <button key={step.number} className={activeStep === index ? "active" : ""} onClick={() => setActiveStep(index)}><span>{step.number}</span><div><b>{step.title}</b><small>{step.minutes} minutes</small></div><i className={completed.includes(step.number) ? "done" : ""}>{completed.includes(step.number) ? "✓" : ""}</i></button>)}
          </div>
          <article className="step-workspace">
            <div className="step-meta"><span>STAGE {currentStep.number}</span><em>{currentStep.minutes} min</em></div>
            <h3>{currentStep.title}</h3><p>{currentStep.description}</p>
            <div className="task-box"><small>Research task</small><strong>{currentStep.task}</strong></div>
            <div className="outcome-box"><small>Completion criterion</small><p>{currentStep.outcome}</p></div>
            <div className="step-evidence"><span>Evidence used</span>{currentStep.evidenceIds.map((id) => <a key={id} href={`#evidence-${id}`}>{id} {evidenceById.get(id)?.path}</a>)}</div>
            <button className={`complete-button ${completed.includes(currentStep.number) ? "completed" : ""}`} onClick={() => toggleComplete(currentStep.number)}>{completed.includes(currentStep.number) ? "✓ Stage complete" : "Mark stage complete"}</button>
          </article>
        </div>
      </section>

      <section className="reproduce-section" id="reproduce">
        <div className="section-title-row"><div><span className="section-kicker">REPRODUCTION LAB</span><h2>Reproduction means preserving evidence, not merely running code</h2><p>{analysis.reproduction.summary}</p><div className="citation-row">{analysis.reproduction.evidenceIds.map((id) => <a key={id} href={`#evidence-${id}`}>{id} · {evidenceById.get(id)?.path}</a>)}</div></div><span className={`readiness ${analysis.reproduction.readiness}`}>{analysis.reproduction.readiness === "ready" ? "Conditions documented" : analysis.reproduction.readiness === "partial" ? "Conditions incomplete" : "Insufficient evidence"}</span></div>
        <div className="repro-grid">
          <div className="repro-steps">
            {analysis.reproduction.steps.map((step, index) => <article key={`${step.title}-${index}`}><span>{String(index + 1).padStart(2, "0")}</span><div><h3>{step.title}</h3><p>{step.reason}</p>{step.command ? <div className="command"><code>{step.command}</code><button onClick={() => copyCommand(step.command, step.title)}>{copied === step.title ? "Copied" : "Copy"}</button></div> : <div className="no-command">Repository evidence does not provide a verified command. Review the cited file first.</div>}<div className="citation-row">{step.evidenceIds.map((id) => <a key={id} href={`#evidence-${id}`}>{id} · {evidenceById.get(id)?.path}</a>)}</div></div></article>)}
          </div>
          <aside className="safety-card"><span>SAFE EXECUTION</span><h3>Check before running</h3>{analysis.reproduction.warnings.map((warning, index) => <div key={`${warning.text}-${index}`}><p><i>!</i>{warning.text}</p>{warning.evidenceIds.length > 0 && <div className="citation-row">{warning.evidenceIds.map((id) => <a key={id} href={`#evidence-${id}`}>{id} · {evidenceById.get(id)?.path}</a>)}</div>}</div>)}<div><b>Record</b><small>Operating system · hardware · dependency lock · random seed · data version · actual output · deviations from the paper or documentation</small></div></aside>
        </div>
      </section>

      <section className="verify-section" id="verify">
        <div className="verify-intro"><span className="section-kicker">UNDERSTANDING CHECK</span><h2>Make research judgments answerable to evidence</h2><p>Use repository-specific questions to test whether you understand the mechanism and reproduction conditions instead of merely browsing files.</p><div className="score-card"><strong>{score}/{analysis.quiz.length}</strong><span>correct now</span></div></div>
        <div className="quiz-list">
          {analysis.quiz.map((quiz, quizIndex) => {
            const selected = answers[quizIndex];
            return <article key={`${quiz.question}-${quizIndex}`}><div className="quiz-number">Q{quizIndex + 1}</div><h3>{quiz.question}</h3><div className="choice-grid">{quiz.choices.map((choice, choiceIndex) => {
              const revealed = selected !== undefined;
              const correct = choiceIndex === quiz.answer;
              const picked = selected === choiceIndex;
              return <button key={choice} onClick={() => setAnswers((current) => ({ ...current, [quizIndex]: choiceIndex }))} className={`${picked ? "picked" : ""} ${revealed && correct ? "correct" : ""}`}><span>{String.fromCharCode(65 + choiceIndex)}</span>{choice}</button>;
            })}</div>{selected !== undefined && <div className={`quiz-feedback ${selected === quiz.answer ? "success" : "retry"}`}><b>{selected === quiz.answer ? "Supported" : "Recheck the evidence"}</b><p>{quiz.explanation}</p><div className="citation-row">{quiz.evidenceIds.map((id) => <a key={id} href={`#evidence-${id}`}>{id} · {evidenceById.get(id)?.path}</a>)}</div></div>}</article>;
          })}
        </div>
      </section>

      <footer><div className="brand"><span className="brand-mark">RL</span><span>RepoLens</span></div><p>Open-source intelligence for reproducible research.</p><span>Evidence-grounded · Research-first · Open source</span></footer>
    </main>
  );
}
