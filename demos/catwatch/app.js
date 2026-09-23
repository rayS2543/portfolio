/* Scripted product walkthrough. No capture, inference, storage, or network calls. */
"use strict";

const $ = (id) => document.getElementById(id);
const results = window.CATWATCH_RESULTS;
const threshold = results.meow.abstention.margin_threshold;
const labels = results.meow.classes;
const stages = [
  {
    tab: "No cat", label: "no cat", visible: false, margin: null,
    title: "Detection gates the behavior model.",
    description: "With no cat present, the runtime clears its feature window. A three-second presence hold in the desktop app tolerates brief missed detections before returning to this state.",
    detail: "The preview is running; no cat is detected.",
  },
  {
    tab: "Warm-up", label: "warming up 2/4", visible: true, margin: null,
    title: "Build a short window before predicting.",
    description: "The desktop runtime samples whole-frame features every 0.40 seconds into a four-frame rolling window. These are visual embeddings, not movement thresholds.",
    detail: "Cat found. Building a short behavior window.",
  },
  {
    tab: "Uncertain", label: "uncertain", visible: true, margin: 0.08,
    title: "Close scores are a reason to abstain.",
    description: "This example margin is below the validation-selected threshold. The app displays uncertain instead of forcing a behavior label. This is not a guarantee that unknown behaviors will be rejected.",
    detail: "Cat found, but the model abstained.",
  },
  {
    tab: "Prediction", label: "walking", visible: true, margin: 0.28,
    title: "A trained label enters the session timeline.",
    description: "The ridge classifier selects from eight learned dataset labels. This example clears the margin threshold. Accepted means the gate passed; it does not mean the prediction is correct.",
    detail: "Accepted example label · walking.",
  },
  {
    tab: "Correction", label: "jumping", visible: true, margin: 0.24,
    title: "Even accepted predictions need correction.",
    description: "In this scripted example the cat is sitting, but the model says jumping. Choose sitting and save an exact correction, or use Wrong behavior to reject the label without supplying a replacement.",
    detail: "Example error: predicted jumping; illustrated behavior sitting.",
  },
];

let running = false;
let stageIndex = 0;
let timer = null;
let feedbackCount = 0;
let eventCount = 0;

function addHistory(message) {
  if (eventCount === 0) $("history").replaceChildren();
  eventCount += 1;
  const item = document.createElement("li");
  item.textContent = `${String(eventCount).padStart(2, "0")}  ${message}`;
  $("history").prepend(item);
  while ($("history").children.length > 30) $("history").lastElementChild.remove();
}

function pause() {
  clearInterval(timer);
  timer = null;
  $("play").textContent = "Play sequence";
}

function renderStage() {
  const stage = stages[stageIndex];
  const visible = running && stage.visible;
  const accepted = running && labels.includes(stage.label);
  const margin = running ? stage.margin : null;
  $("toggle").textContent = running ? "Stop demo" : "Start demo";
  $("play").disabled = !running;
  $("source-status").textContent = running ? "DEMO SESSION" : "PREVIEW OFF";
  $("status-dot").classList.toggle("on", running);
  $("off-screen").hidden = running;
  $("cat").toggleAttribute("hidden", !visible);
  $("box").toggleAttribute("hidden", !visible);
  $("cat").setAttribute("transform", stageIndex === 3 ? "translate(460 341)" : "translate(370 342)");
  $("privacy").textContent = running ? "● SCRIPTED INPUT · NOTHING UPLOADED" : "● DEMO OFF · NO CAMERA ACCESS";
  $("prediction").textContent = running ? stage.label : "Camera off";
  $("prediction").classList.toggle("uncertain", running && stage.label === "uncertain");
  $("detail").textContent = running ? stage.detail : "Start the walkthrough to inspect a prediction.";
  $("margin-value").textContent = margin === null ? "—" : margin.toFixed(3);
  $("margin-fill").style.width = `${margin === null ? 0 : (margin / 0.4) * 100}%`;
  $("threshold-marker").style.left = `${(threshold / 0.4) * 100}%`;
  $("margin-caption").textContent = `Threshold ${threshold.toFixed(3)} · example score, not probability`;
  $("scene-caption").textContent = running ? (stageIndex === 4 ? "Sitting cat / deliberately incorrect label" : stage.label) : "Waiting to start";
  $("step-count").textContent = running ? `STAGE ${stageIndex + 1} OF ${stages.length}` : "BEFORE CAPTURE";
  $("step-title").textContent = running ? stage.title : "You decide when observation starts.";
  $("step-description").textContent = running ? stage.description : "The native app processes frames locally. Saving a feedback example requires an explicit click.";
  $("save").disabled = !visible;
  $("reject").disabled = !accepted;
  $("save").textContent = `Save as ${$("correction").value}`;
  $("feedback-count").textContent = `${feedbackCount} feedback ${feedbackCount === 1 ? "entry" : "entries"}`;
  [...$("steps").children].forEach((button, index) => {
    button.disabled = !running;
    button.setAttribute("aria-pressed", String(running && stageIndex === index));
  });
}

function selectStage(index) {
  stageIndex = index;
  $("feedback-status").textContent = "";
  addHistory(stages[index].label);
  renderStage();
}

stages.forEach((stage, index) => {
  const button = document.createElement("button");
  button.textContent = stage.tab;
  button.addEventListener("click", () => {
    pause();
    selectStage(index);
  });
  $("steps").append(button);
});

labels.forEach((label) => {
  const option = document.createElement("option");
  option.value = label;
  option.textContent = label;
  $("correction").append(option);
});
$("correction").value = "sitting";
$("correction").addEventListener("change", renderStage);

$("toggle").addEventListener("click", () => {
  pause();
  running = !running;
  if (running) selectStage(0);
  else {
    addHistory("Preview stopped");
    $("feedback-status").textContent = "";
    renderStage();
  }
});

$("play").addEventListener("click", () => {
  if (timer !== null) {
    pause();
    return;
  }
  if (stageIndex === stages.length - 1) selectStage(0);
  $("play").textContent = "Pause sequence";
  timer = setInterval(() => {
    selectStage(stageIndex + 1);
    if (stageIndex === stages.length - 1) pause();
  }, 3500);
});

$("reset").addEventListener("click", () => {
  pause();
  running = false;
  stageIndex = 0;
  feedbackCount = 0;
  eventCount = 0;
  $("history").replaceChildren();
  const item = document.createElement("li");
  item.textContent = "Waiting to start";
  $("history").append(item);
  $("feedback-status").textContent = "Session cleared. No demo entries were saved to disk.";
  $("correction").value = "sitting";
  renderStage();
});

function recordFeedback(rejectionOnly) {
  pause();
  const predicted = stages[stageIndex].label;
  const corrected = $("correction").value;
  const message = rejectionOnly ? `Rejected ${predicted} · replacement unspecified` : `${predicted} → ${corrected}`;
  feedbackCount += 1;
  addHistory(`Demo feedback: ${message}`);
  $("feedback-status").textContent = "Example feedback added to this page only. No image saved or model updated.";
  renderStage();
}
$("save").addEventListener("click", () => recordFeedback(false));
$("reject").addEventListener("click", () => recordFeedback(true));

const percent = (value) => `${(value * 100).toFixed(1)}%`;
function renderResults(name) {
  const report = results[name];
  $("meow").setAttribute("aria-pressed", String(name === "meow"));
  $("a2d").setAttribute("aria-pressed", String(name === "a2d"));
  const testCount = Object.values(report.split_counts.test).reduce((sum, count) => sum + count, 0);
  $("dataset-description").textContent = name === "meow"
    ? "MEOW-10K · Eight merged visual labels, 3,575 unique clips, grouped by inferred source video. This is the checkpoint used by the desktop app; the label mapping is a project-specific task."
    : "A2D · Six cat-action labels, 620 clips, with official test sources preserved. A separate research experiment; these results do not describe the desktop checkpoint.";
  $("metrics").replaceChildren();
  [
    [percent(report.test.accuracy), "Held-out accuracy"],
    [report.test.macro_f1.toFixed(3), "Macro-F1 · all classes"],
    [percent(report.majority_baseline_test.accuracy), "Training-majority baseline"],
    [String(testCount), "Held-out test clips"],
  ].forEach(([value, label]) => {
    const metric = document.createElement("div");
    metric.className = "metric";
    const strong = document.createElement("strong");
    strong.textContent = value;
    const caption = document.createElement("span");
    caption.textContent = label;
    metric.append(strong, caption);
    $("metrics").append(metric);
  });
  $("class-results").replaceChildren();
  Object.entries(report.test.per_class).sort((a, b) => b[1].f1 - a[1].f1).forEach(([label, scores]) => {
    const row = document.createElement("div");
    row.className = "class-row";
    const caption = document.createElement("span");
    caption.textContent = label;
    const track = document.createElement("div");
    track.className = "class-track";
    track.setAttribute("aria-hidden", "true");
    const bar = document.createElement("span");
    bar.style.width = `${scores.f1 * 100}%`;
    track.append(bar);
    const value = document.createElement("strong");
    value.textContent = scores.f1.toFixed(3);
    row.append(caption, track, value);
    $("class-results").append(row);
  });
  $("result-title").textContent = name === "meow" ? "Uncertainty is part of the product." : "A narrower task, evaluated separately.";
  $("result-note").textContent = name === "meow"
    ? "The broader model improves on its majority baseline, but still confuses everyday poses. The desktop UI exposes uncertainty and corrections because dataset performance does not establish reliability in a home."
    : "The six-action experiment uses a frozen MobileNetV3 Small encoder and a class-balanced ridge head. Hyperparameters were selected on validation macro-F1. A2D data is restricted to noncommercial scientific research.";
  $("selective").textContent = name === "meow"
    ? `At the validation-selected threshold: ${percent(report.abstention.test_coverage)} test coverage (${report.abstention.test_accepted}/${testCount} clips), with ${percent(report.abstention.test_selective_accuracy)} accuracy among accepted clips. Most clips are rejected; this does not establish open-set detection.`
    : "The two datasets have different labels and splits. Their headline accuracies are not a controlled comparison of model quality.";
}
$("meow").addEventListener("click", () => renderResults("meow"));
$("a2d").addEventListener("click", () => renderResults("a2d"));
renderStage();
renderResults("meow");
