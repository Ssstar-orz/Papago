const FEELINGS = ["生气", "委屈", "失望", "害怕", "焦虑", "羞耻", "孤单", "疲惫", "困惑", "麻木"];
const BODY_SIGNALS = ["胸口发紧", "喉咙堵住", "胃里缩着", "脸或身体发热", "肩颈僵硬", "想哭", "呼吸变浅", "没特别感觉"];
const NEEDS = ["被认真听见", "尊重", "清楚的信息", "安全感", "信任", "连接", "空间", "自主", "边界", "公平", "可预期"];
const PROTECTIONS = ["立刻追问或要求确认", "攻击、讽刺或争输赢", "撤退、失联或假装不在乎", "先道歉、讨好或删掉自己的需要", "暂时说不清"];
const PROTECTION_MEANINGS = ["不想再被忽略或敷衍", "害怕再次失望", "不想失去这段关系", "想守住自己的尊严", "不想再被控制或越界", "暂时说不清"];
const RECEIVER_CUSTOM = "__custom__";
const CARE_OPTIONS = ["先离开手机十分钟", "找一位可信任的人陪我", "把还没说完的话继续写下", "休息后再决定", "做一件让身体舒服一点的事", "寻找专业支持"];
const DEMO = {
  story: "她答应九点给我回电话，到十一点还是没有消息。我很想发‘随便你，以后不用找我了’，但其实我一直在看手机。",
  fact: "她答应九点回电话，到十一点还没有消息。",
  interpretation: "她是不是根本不在意我。"
};

const STEPS = [
  { key: "fact", kicker: "先看看发生了什么", title: "如果只看聊天记录和已经发生的事，我们能确定什么？", description: "可以写下聊天里真实出现的文字、对方明确做过或没有做过的事，也可以写你亲眼看到、亲耳听到的内容。先不急着猜对方为什么这样。" },
  { key: "interpretation", kicker: "再听听脑中的声音", title: "除了已经发生的事，你脑中还冒出了哪些想法？", description: "比如“她不在意我”“是不是我又做错了”。这些想法也许有道理，也许还缺少信息。先写下来，看看哪一句最刺痛你。" },
  { key: "feelings", kicker: "给感受一个名字", title: "先不急着解释。此刻，你心里是什么感受？", description: "选 1–3 个最接近的词。没有标准答案，也不需要强迫自己立刻说清。" },
  { key: "body", kicker: "回到身体", title: "先停一会儿，感受你的身体。", description: "不用分析这些反应意味着什么，只留意呼吸、胸口、喉咙、胃和肩颈。没有明显感觉也很正常。" },
  { key: "needs", kicker: "听见自己的需要", title: "在这件事里，什么对你来说很重要？", description: "也许是被认真听见，也许是安全、尊重、空间或清楚的信息。选 1–2 个更接近你的词。" },
  { key: "protection", kicker: "看见自己的保护方式", title: "情绪最满的时候，你最想做什么？", description: "这股冲动也许是在保护你。我们只看此刻发生了什么，不用一次反应定义你是什么样的人。" }
];

const REFLECTION_STEPS = [
  { key: "meaning", kicker: "先理解，不急着改变", title: "刚才那股冲动，像是在替你守住什么？", description: "也许是不想再失望、不想被忽略，也可能是在努力留住一段关系。你不必马上确定，只选最接近的一项。" },
  { key: "selfTalk", kicker: "听见你怎样看待自己", title: "当这件事发生，你心里是怎样看待自己的？", description: "有时，我们会把关系里的失望变成对自己的怀疑，比如“是不是我太敏感”。先听见这句话，不急着相信它。" },
  { key: "care", kicker: "最后才来到行动", title: "听见这些以后，此刻的你更需要什么？", description: "这不是要求自己振作。只选 1–2 件现在做得到、能让你轻一点的小事。" }
];

function initial() {
  return {
    view: "input", guideIndex: 0, story: "", fact: "", factUnclear: false,
    interpretation: "", interpretationUnclear: false,
    feelings: [], feelingOther: "", showFeelingOther: false,
    bodySignals: [], bodyOther: "", showBodyOther: false,
    needs: [], needOther: "", showNeedOther: false,
    protection: "", decision: "", receiverPreferences: [], receiverCustom: "", communicationGoal: "", goalDetail: "", message: "",
    aiConsent: false, generationSource: "", generating: false,
    completionType: "", pendingAfterSafety: "", reflectionIndex: 0,
    protectionMeaning: "", selfTalk: "", selfTalkUnclear: false, careChoices: [], reflectionComplete: false
  };
}

let state = initial();
let toastTimer = null;
let modalOpener = null;
let breathTimer = null;
let breathElapsed = 0;
let recognition = null;
let isListening = false;
const $ = id => document.getElementById(id);
const joinWords = (list, other = "") => [...list, other.trim()].filter(Boolean).join("、");
const feelingsText = () => joinWords(state.feelings, state.feelingOther);
const bodyText = () => joinWords(state.bodySignals, state.bodyOther);
const needsText = () => joinWords(state.needs, state.needOther);
const interpretationText = () => state.interpretation.trim() || (state.interpretationUnclear ? "我暂时还说不清脑中冒出了哪些想法。" : "");
const hasContent = () => Boolean(state.story || state.fact || interpretationText() || feelingsText() || bodyText() || needsText() || state.protection || state.message || state.protectionMeaning || state.selfTalk || state.careChoices.length);

function setView(view) {
  state.view = view;
  if (view !== "input") { stopVoice(); stopBreathing(false); }
  document.querySelectorAll(".view").forEach(element => element.classList.toggle("is-active", element.dataset.view === view));
  renderProgress();
  renderCurrent();
  window.scrollTo({ top: 0, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  requestAnimationFrame(() => $("main-content").focus({ preventScroll: true }));
}

function renderProgress() {
  const order = ["input", "guide", "translation", "express", "completion"];
  const currentView = state.view === "reflection" ? "completion" : state.view;
  const now = order.indexOf(currentView);
  document.querySelectorAll("[data-progress]").forEach(element => {
    const index = order.indexOf(element.dataset.progress);
    element.classList.toggle("is-current", index === now);
    element.classList.toggle("is-complete", index < now);
  });
}

function renderCurrent() {
  if (state.view === "input") renderInput();
  if (state.view === "guide") renderGuide();
  if (state.view === "translation") renderTranslation();
  if (state.view === "express") renderExpress();
  if (state.view === "completion") renderCompletion();
  if (state.view === "reflection") renderReflection();
}

function renderInput() {
  $("story").value = state.story;
  $("story-count").textContent = `${state.story.length} / 1,000`;
}

function renderGuide() {
  const step = STEPS[state.guideIndex];
  $("guide-step-number").textContent = state.guideIndex + 1;
  $("guide-progress").style.width = `${((state.guideIndex + 1) / STEPS.length) * 100}%`;
  $("guide-kicker").textContent = step.kicker;
  $("guide-title").textContent = step.title;
  $("guide-description").textContent = step.description;
  $("guide-error").textContent = "";
  $("guide-continue").childNodes[0].textContent = state.guideIndex === STEPS.length - 1 ? "生成我的翻译卡 " : "继续 ";
  if (step.key === "fact") renderFact();
  if (step.key === "interpretation") renderInterpretation();
  if (["feelings", "body", "needs"].includes(step.key)) renderChips(step.key);
  if (step.key === "protection") renderProtection();
  renderConfirmed();
}

function renderFact() {
  const box = $("guide-content");
  box.innerHTML = `<label for="fact-input">能确认的内容</label><textarea id="fact-input" rows="5" maxlength="500" placeholder="例如：她答应九点回电话，到十一点还没有消息。"></textarea><div class="example-pair" aria-label="可确认内容与解释的示例"><p><strong>能确认</strong>聊天记录里，她说九点回电话；十一点时还没有消息。</p><p><strong>我的解释</strong>她根本不在乎我。</p></div><label class="check-row" for="fact-unclear"><input id="fact-unclear" type="checkbox"><span>我现在还分不清能确认的内容和自己的解释，先带着这个不确定继续。</span></label>`;
  $("fact-input").value = state.fact;
  $("fact-unclear").checked = state.factUnclear;
  $("fact-input").addEventListener("input", event => {
    state.fact = event.target.value.slice(0, 500);
    if (state.fact.trim()) { state.factUnclear = false; $("fact-unclear").checked = false; }
    renderConfirmed();
  });
  $("fact-unclear").addEventListener("change", event => {
    state.factUnclear = event.target.checked;
    if (state.factUnclear) { state.fact = ""; $("fact-input").value = ""; }
    renderConfirmed();
  });
}

function renderInterpretation() {
  const box = $("guide-content");
  box.innerHTML = `<label for="interpretation-input">我脑中最先冒出的想法</label><textarea id="interpretation-input" rows="5" maxlength="400" placeholder="例如：她是不是根本不在意我。"></textarea><p class="field-help">先把它写下来，不是为了证明它，而是看看它带来了什么感受。</p><label class="check-row" for="interpretation-unclear"><input id="interpretation-unclear" type="checkbox"><span>我现在说不清，先保留这个空白。</span></label>`;
  $("interpretation-input").value = state.interpretation;
  $("interpretation-unclear").checked = state.interpretationUnclear;
  $("interpretation-input").addEventListener("input", event => {
    state.interpretation = event.target.value.slice(0, 400);
    if (state.interpretation.trim()) { state.interpretationUnclear = false; $("interpretation-unclear").checked = false; }
    renderConfirmed();
  });
  $("interpretation-unclear").addEventListener("change", event => {
    state.interpretationUnclear = event.target.checked;
    if (state.interpretationUnclear) { state.interpretation = ""; $("interpretation-input").value = ""; }
    renderConfirmed();
  });
}

function chipConfig(type) {
  if (type === "feelings") return { values: FEELINGS, selected: state.feelings, otherKey: "feelingOther", showKey: "showFeelingOther", label: "感受", max: 3 };
  if (type === "body") return { values: BODY_SIGNALS, selected: state.bodySignals, otherKey: "bodyOther", showKey: "showBodyOther", label: "身体感受", max: 3 };
  return { values: NEEDS, selected: state.needs, otherKey: "needOther", showKey: "showNeedOther", label: "需要", max: 2 };
}

function renderChips(type) {
  const config = chipConfig(type);
  const box = $("guide-content");
  const showOther = state[config.showKey];
  box.innerHTML = `<div class="chip-grid" role="group" aria-label="选择${config.label}">${config.values.map(value => `<button class="choice-chip" type="button" data-chip="${value}" aria-pressed="${config.selected.includes(value)}">${value}</button>`).join("")}<button class="choice-chip" type="button" data-other-toggle="${type}" aria-pressed="${showOther}">都不对，我自己写</button></div><div class="other-field" ${showOther ? "" : "hidden"}><label for="${type}-other">写一个更接近你的词或短句</label><input id="${type}-other" class="text-input" maxlength="40" placeholder="不需要使用心理学词汇"></div>`;
  box.querySelectorAll("[data-chip]").forEach(button => button.addEventListener("click", () => {
    const value = button.dataset.chip;
    const index = config.selected.indexOf(value);
    if (type === "body" && value === "没特别感觉") {
      config.selected.splice(0, config.selected.length, ...(index >= 0 ? [] : [value]));
      state.bodyOther = "";
    } else if (index >= 0) {
      config.selected.splice(index, 1);
    } else {
      if (type === "body") {
        const noneIndex = config.selected.indexOf("没特别感觉");
        if (noneIndex >= 0) config.selected.splice(noneIndex, 1);
      }
      const count = config.selected.length + (state[config.otherKey].trim() ? 1 : 0);
      if (count >= config.max) return toast(`${config.label}最多选择 ${config.max} 项。`);
      config.selected.push(value);
    }
    renderGuide();
    box.querySelector(`[data-chip="${CSS.escape(value)}"]`)?.focus();
  }));
  box.querySelector("[data-other-toggle]").addEventListener("click", () => {
    state[config.showKey] = !state[config.showKey];
    if (!state[config.showKey]) state[config.otherKey] = "";
    if (type === "body" && state[config.showKey]) {
      const noneIndex = config.selected.indexOf("没特别感觉");
      if (noneIndex >= 0) config.selected.splice(noneIndex, 1);
    }
    renderGuide();
    $(`${type}-other`)?.focus();
  });
  const other = $(`${type}-other`);
  if (other) {
    other.value = state[config.otherKey];
    other.addEventListener("input", event => { state[config.otherKey] = event.target.value.slice(0, 40); renderConfirmed(); });
  }
}

function renderProtection() {
  const box = $("guide-content");
  box.innerHTML = `<div class="protection-list" role="group" aria-label="选择当前的保护动作">${PROTECTIONS.map(value => `<button class="protection-option" type="button" data-protection="${value}" aria-pressed="${state.protection === value}">${value}</button>`).join("")}</div>`;
  box.querySelectorAll("[data-protection]").forEach(button => button.addEventListener("click", () => {
    state.protection = button.dataset.protection;
    renderGuide();
    box.querySelector(`[data-protection="${CSS.escape(state.protection)}"]`)?.focus();
  }));
}

function definition(list, term, value) {
  const group = document.createElement("div");
  const dt = document.createElement("dt");
  const dd = document.createElement("dd");
  dt.textContent = term;
  dd.textContent = value || "还没有选择";
  group.append(dt, dd);
  list.append(group);
}

function renderConfirmed() {
  const list = $("confirmed-list");
  list.replaceChildren();
  definition(list, "能确认的内容", state.fact.trim() || (state.factUnclear ? "暂时还分不清" : "还没有填写"));
  definition(list, "脑中冒出的想法", interpretationText());
  definition(list, "感受", feelingsText());
  definition(list, "身体感受", bodyText());
  definition(list, "对我重要的是", needsText());
  definition(list, "我最想做的是", state.protection);
}

function guideError() {
  const key = STEPS[state.guideIndex].key;
  if (key === "fact" && !state.fact.trim() && !state.factUnclear) return "写下一条能确认的内容，或选择“我现在还分不清”。";
  if (key === "interpretation" && !state.interpretation.trim() && !state.interpretationUnclear) return "写下脑中最先冒出的想法，或选择“我现在说不清”。";
  if (key === "feelings" && (state.feelings.length + (state.feelingOther.trim() ? 1 : 0) < 1)) return "请选择 1–3 个感受。";
  if (key === "body" && (state.bodySignals.length + (state.bodyOther.trim() ? 1 : 0) < 1)) return "请选择 1–3 个接近的身体感受，也可以选择“没特别感觉”。";
  if (key === "needs" && (state.needs.length + (state.needOther.trim() ? 1 : 0) < 1)) return "请选择 1–2 个对你重要的需要。";
  if (key === "protection" && !state.protection) return "选择一个最接近你当下冲动的答案。";
  return "";
}

function renderTranslation() {
  if (!state.fact.trim() && state.factUnclear) state.fact = "我现在还分不清能确认的内容和自己的解释。";
  $("card-fact").value = state.fact;
  $("card-interpretation").value = interpretationText();
  $("card-feelings").value = feelingsText();
  $("card-body").value = bodyText();
  $("card-needs").value = needsText();
  $("card-protection").value = state.protection;
}

function validateCard() {
  const fields = [
    ["card-fact", state.fact, "先补上“能确认的是”。"],
    ["card-interpretation", interpretationText(), "先补上脑中冒出的解释。"],
    ["card-feelings", feelingsText(), "先补上“我现在感到”。"],
    ["card-body", bodyText(), "先补上你留意到的身体感受。"],
    ["card-needs", needsText(), "先补上对你来说重要的需要。"],
    ["card-protection", state.protection, "先补上你当时最想做的事。"]
  ];
  const missing = fields.find(([, value]) => !String(value).trim());
  if (!missing) return true;
  toast(missing[2]);
  $(missing[0]).focus();
  return false;
}

function renderExpress() {
  document.querySelectorAll("[data-receiver]").forEach(button => button.setAttribute("aria-pressed", String(state.receiverPreferences.includes(button.dataset.receiver))));
  const customSelected = state.receiverPreferences.includes(RECEIVER_CUSTOM);
  $("receiver-custom-field").hidden = !customSelected;
  $("receiver-custom").value = state.receiverCustom;
  document.querySelectorAll("[data-goal]").forEach(button => button.setAttribute("aria-pressed", String(button.dataset.goal === state.communicationGoal)));
  const config = {
    request: { label: "你希望对方具体做什么？", placeholder: "例如：如果今晚不能回复，请告诉我大概什么时候方便。", help: "请求应该是对方可以明确回应的动作，而不是“以后多在乎我”。" },
    boundary: { label: "如果这种情况继续发生，你会采取什么行动保护自己？", placeholder: "例如：我会先结束这次对话，等彼此都能认真听时再继续。", help: "边界描述的是你会做什么，不是控制对方必须怎么做。" }
  }[state.communicationGoal];
  $("detail-field").hidden = !config;
  if (config) {
    $("detail-label").textContent = config.label;
    $("goal-detail").placeholder = config.placeholder;
    $("goal-detail").value = state.goalDetail;
    $("detail-help").textContent = config.help;
  }
  $("ai-consent").checked = state.aiConsent;
  $("generate-button").disabled = !state.communicationGoal || !state.receiverPreferences.length || (customSelected && !state.receiverCustom.trim()) || state.generating;
  $("generate-button").childNodes[0].textContent = state.generating ? "正在生成 " : "生成这一份草稿 ";
  $("goal-error").textContent = "";
  const ready = Boolean(state.message);
  const card = $("message-card");
  card.classList.toggle("is-empty", !ready);
  card.querySelector(".message-empty").hidden = ready;
  card.querySelector(".message-ready").hidden = !ready;
  if (ready) {
    $("message-editor").value = state.message;
    $("generation-source").textContent = state.generationSource === "ai" ? "AI 生成 · 可编辑" : "本地演示模板 · 可编辑";
  }
}

const clause = text => String(text || "").trim().replace(/[。！？!?，,；;：:]+$/u, "");
function receiverPreferencesForGeneration() {
  return state.receiverPreferences.map(value => value === RECEIVER_CUSTOM ? state.receiverCustom.trim() : value).filter(Boolean);
}

function buildMessage() {
  const fact = clause(state.fact);
  const feel = clause(feelingsText());
  const need = clause(needsText());
  const detail = clause(state.goalDetail);
  const preferences = receiverPreferencesForGeneration();
  const hasPreferenceCue = (...cues) => preferences.some(preference => cues.some(cue => preference.includes(cue)));
  const leadWithConclusion = hasPreferenceCue("先说结论", "先讲结论", "重点先说");
  let text;
  if (leadWithConclusion && state.communicationGoal === "understand") text = `我想先说结论：这件事确实影响了我，我希望你能听见我的感受。具体来说，${fact}。那一刻我感到${feel}，因为${need}对我很重要。我不想替你判断动机。`;
  else if (leadWithConclusion && state.communicationGoal === "request") text = `我想先说清楚我的请求：${detail}。之所以这样说，是因为${fact}。那一刻我感到${feel}，而${need}对我很重要。`;
  else if (leadWithConclusion && state.communicationGoal === "boundary") text = `我想先说清楚我的边界：如果类似的情况继续发生，我会${detail}。这次发生的是${fact}，那一刻我感到${feel}。我需要照顾自己的${need}。`;
  else if (state.communicationGoal === "understand") text = `我想和你说一件对我很重要的事：${fact}。那一刻我感到${feel}。对我来说，${need}很重要。我不想替你判断动机，只是希望你知道这件事给我的感受。`;
  else if (state.communicationGoal === "request") text = `${fact}。那一刻我感到${feel}，对我来说，${need}很重要。我想和你商量一件具体的事：${detail}。`;
  else text = `${fact}。那一刻我感到${feel}。为了照顾自己的${need}，如果类似的情况继续发生，我会${detail}。`;
  if (hasPreferenceCue("不是指责", "不指责", "先肯定", "温和")) text = `我想和你聊一件事，不是为了指责你，也不需要我们马上得出结论。${text}`;
  if (hasPreferenceCue("留出时间", "不用立刻", "不要立刻", "不要求立刻", "稍后回复")) text += "你不需要现在回复，可以想一想，等你准备好我们再聊。";
  if (hasPreferenceCue("简短", "直接", "少说", "别太长") && text.length > 150) text = `${fact}。我感到${feel}，因为${need}对我很重要。${state.communicationGoal === "request" ? `我希望：${detail}。` : state.communicationGoal === "boundary" ? `如果再次发生，我会${detail}。` : "我想让你知道这件事对我的影响。"}`;
  return text;
}

async function generateDraft() {
  const fallback = { text: buildMessage(), source: "template" };
  if (!state.aiConsent) return fallback;
  if (location.protocol === "file:") return { ...fallback, reason: "file-mode" };
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch("/api/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        fact: state.fact,
        interpretation: interpretationText(),
        feelings: feelingsText(),
        body: bodyText(),
        needs: needsText(),
        protection: state.protection,
        goal: state.communicationGoal,
        goalDetail: state.goalDetail,
        receiverPreferences: receiverPreferencesForGeneration()
      })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.text) return { ...fallback, reason: data.code || `http-${response.status}` };
    return { text: data.text, source: "ai" };
  } catch (error) {
    return { ...fallback, reason: error.name === "AbortError" ? "timeout" : "network" };
  } finally {
    clearTimeout(timeout);
  }
}

function summary() {
  return `已经发生的是：${state.fact}\n我脑中冒出的想法：${interpretationText()}\n我现在感到：${feelingsText()}\n我留意到的身体感受：${bodyText()}\n对我来说很重要的是：${needsText()}\n情绪最满时，我最想：${state.protection}`;
}

function renderCompletion() {
  const pause = state.completionType === "pause";
  $("completion-kicker").textContent = pause ? "PAUSE IS A CHOICE" : "NOT TALKING IS A CHOICE";
  $("completion-title").textContent = pause ? "先停下来，不是失败。" : "暂时不谈，也可以很清楚。";
  $("completion-copy").textContent = pause ? "你不需要在情绪最满的时候做决定。刚才被你看见的感受和需要，已经值得被认真对待。" : "你可以暂时不谈。这个决定不需要靠一段完美的话来证明，也没有一份草稿在等你发送。";
  $("completion-translation").textContent = summary();
}

function renderReflection() {
  if (state.reflectionComplete) return renderReflectionResult();
  const step = REFLECTION_STEPS[state.reflectionIndex];
  $("reflection-step-number").textContent = state.reflectionIndex + 1;
  $("reflection-progress").style.width = `${((state.reflectionIndex + 1) / REFLECTION_STEPS.length) * 100}%`;
  $("reflection-kicker").textContent = step.kicker;
  $("reflection-title").textContent = step.title;
  $("reflection-description").textContent = step.description;
  $("reflection-error").textContent = "";
  $("reflection-continue").hidden = false;
  $("reflection-continue").childNodes[0].textContent = state.reflectionIndex === REFLECTION_STEPS.length - 1 ? "生成给自己的便签 " : "继续 ";
  if (step.key === "meaning") renderReflectionChoices("meaning");
  if (step.key === "selfTalk") renderSelfTalk();
  if (step.key === "care") renderReflectionChoices("care");
  renderSelfNotePreview();
}

function renderSelfTalk() {
  const box = $("reflection-content");
  box.innerHTML = `<label for="self-talk-input">我心里对自己说</label><textarea id="self-talk-input" rows="5" maxlength="400" placeholder="例如：是不是我太敏感了。"></textarea><label class="check-row" for="self-talk-unclear"><input id="self-talk-unclear" type="checkbox"><span>我没有这样怀疑自己，或者暂时说不清。</span></label>`;
  $("self-talk-input").value = state.selfTalk;
  $("self-talk-unclear").checked = state.selfTalkUnclear;
  $("self-talk-input").addEventListener("input", event => {
    state.selfTalk = event.target.value.slice(0, 400);
    if (state.selfTalk.trim()) { state.selfTalkUnclear = false; $("self-talk-unclear").checked = false; }
    renderSelfNotePreview();
  });
  $("self-talk-unclear").addEventListener("change", event => {
    state.selfTalkUnclear = event.target.checked;
    if (state.selfTalkUnclear) { state.selfTalk = ""; $("self-talk-input").value = ""; }
    renderSelfNotePreview();
  });
}

function renderReflectionChoices(type) {
  const isCare = type === "care";
  const values = isCare ? CARE_OPTIONS : PROTECTION_MEANINGS;
  const box = $("reflection-content");
  box.innerHTML = `<div class="protection-list" role="group" aria-label="${isCare ? "选择此刻需要的照顾" : "选择这股冲动可能想守住的东西"}">${values.map(value => `<button class="protection-option" type="button" data-reflection-choice="${value}" aria-pressed="${isCare ? state.careChoices.includes(value) : state.protectionMeaning === value}">${value}</button>`).join("")}</div>`;
  box.querySelectorAll("[data-reflection-choice]").forEach(button => button.addEventListener("click", () => {
    const value = button.dataset.reflectionChoice;
    if (isCare) {
      const index = state.careChoices.indexOf(value);
      if (index >= 0) state.careChoices.splice(index, 1);
      else if (state.careChoices.length >= 2) return toast("最多选择两项，让这一步保持轻一点。");
      else state.careChoices.push(value);
    } else state.protectionMeaning = value;
    renderReflection();
    $("reflection-content").querySelector(`[data-reflection-choice="${CSS.escape(value)}"]`)?.focus();
  }));
}

function selfNoteText() {
  const lines = [];
  if (needsText()) lines.push(`在这件事里，对我来说很重要的是：${needsText()}。`);
  if (state.protectionMeaning) lines.push(`刚才那股冲动，也许是在替我守住：${state.protectionMeaning}。这只是一个可能，我可以慢慢确认。`);
  if (state.selfTalk.trim()) lines.push(`那一刻，我心里这样看待自己：“${clause(state.selfTalk)}。”这句话值得被听见，但不等于事实。`);
  else if (state.selfTalkUnclear) lines.push("我暂时说不清那一刻是怎样看待自己的。这个空白可以保留。");
  if (bodyText()) lines.push(`当我停下来，我留意到身体有这些反应：${bodyText()}。我不必马上解释它们。`);
  if (state.careChoices.length) lines.push(`听见这些以后，我想先给自己：${state.careChoices.join("，")}。`);
  return lines.join("\n\n") || "这里会慢慢长出一张只写给你的便签。";
}

function renderSelfNotePreview() {
  $("self-note-preview").textContent = selfNoteText();
}

function reflectionError() {
  const key = REFLECTION_STEPS[state.reflectionIndex].key;
  if (key === "meaning" && !state.protectionMeaning) return "先选择一个最接近的答案；不确定时可以选择“暂时说不清”。";
  if (key === "selfTalk" && !state.selfTalk.trim() && !state.selfTalkUnclear) return "写下那一刻你怎样看待自己，或选择“暂时说不清”。";
  if (key === "care" && !state.careChoices.length) return "先选择 1–2 件现在做得到的照顾。";
  return "";
}

function renderReflectionResult() {
  $("reflection-step-number").textContent = "3";
  $("reflection-progress").style.width = "100%";
  $("reflection-kicker").textContent = "A NOTE TO YOURSELF";
  $("reflection-title").textContent = "这是一张给自己的便签。";
  $("reflection-description").textContent = "它不要求你原谅谁、理解谁，也不要求你今天变得更好。它只保存你刚才亲自确认的线索。";
  $("reflection-content").innerHTML = `<article class="self-note-result"><p class="card-label">此刻的我想记住</p><p id="self-note-result-text"></p><div class="reflection-result-actions"><button class="secondary-button" type="button" data-action="reflection-edit">返回修改</button><button class="secondary-button" type="button" data-action="copy-self-note">复制这张便签</button><button class="primary-button" type="button" data-action="reset">结束并清空</button></div></article>`;
  $("self-note-result-text").textContent = selfNoteText();
  $("reflection-continue").hidden = true;
  renderSelfNotePreview();
}

function startBreathing() {
  if (breathTimer) return stopBreathing(false);
  breathElapsed = 0;
  $("breath-button").textContent = "暂停练习";
  updateBreathing();
  breathTimer = setInterval(() => {
    breathElapsed += 1;
    if (breathElapsed >= 30) return stopBreathing(true);
    updateBreathing();
  }, 1000);
}

function updateBreathing() {
  const inhale = breathElapsed % 10 < 4;
  $("breath-orbit").classList.toggle("is-inhaling", inhale);
  $("breath-orbit").classList.toggle("is-exhaling", !inhale);
  $("breath-phase").textContent = inhale ? "自然吸气" : "慢慢呼气";
  $("breath-time").textContent = `还剩 ${30 - breathElapsed} 秒 · 不需要憋气`;
}

function stopBreathing(completed = false) {
  clearInterval(breathTimer);
  breathTimer = null;
  $("breath-orbit").classList.remove("is-inhaling", "is-exhaling");
  $("breath-button").textContent = completed ? "再来三轮" : "开始三轮呼吸";
  $("breath-phase").textContent = completed ? "完成。留意一下此刻的身体。" : "按自己的节奏准备";
  $("breath-time").textContent = completed ? "你可以继续书写，也可以再停一会儿。" : "约 30 秒 · 不需要憋气";
}

function initVoice() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    $("voice-button").disabled = true;
    $("voice-label").textContent = "此浏览器不支持语音";
    $("voice-status").textContent = "仍然可以使用键盘输入";
    return;
  }
  recognition = new SpeechRecognition();
  recognition.lang = "zh-CN";
  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.onstart = () => {
    isListening = true;
    $("voice-button").classList.add("is-listening");
    $("voice-button").setAttribute("aria-pressed", "true");
    $("voice-label").textContent = "结束语音";
    $("voice-status").textContent = "正在听你说……";
  };
  recognition.onresult = event => {
    let interim = "";
    let finalText = "";
    for (let index = event.resultIndex; index < event.results.length; index += 1) {
      if (event.results[index].isFinal) finalText += event.results[index][0].transcript;
      else interim += event.results[index][0].transcript;
    }
    if (finalText) {
      const separator = state.story && !/[，。！？\s]$/u.test(state.story) ? "，" : "";
      state.story = `${state.story}${separator}${finalText}`.slice(0, 1000);
      renderInput();
    }
    $("voice-status").textContent = interim ? `正在听：${interim}` : "正在听你说……";
  };
  recognition.onerror = event => {
    const messages = {
      "not-allowed": "没有获得麦克风权限，可以检查浏览器设置或直接打字。",
      "audio-capture": "没有找到可用的麦克风。",
      "network": "语音服务暂时无法连接，请直接打字。",
      "no-speech": "没有听到清楚的语音，可以再试一次。"
    };
    $("voice-status").textContent = messages[event.error] || "语音识别没有完成，请直接打字。";
  };
  recognition.onend = () => finishVoiceUI();
}

function toggleVoice() {
  if (!recognition) return;
  if (isListening) return stopVoice();
  try {
    recognition.start();
    $("voice-status").textContent = "正在等待麦克风权限……";
  } catch {
    $("voice-status").textContent = "语音暂时无法启动，请直接打字。";
  }
}

function finishVoiceUI() {
  isListening = false;
  $("voice-button").classList.remove("is-listening");
  $("voice-button").setAttribute("aria-pressed", "false");
  $("voice-label").textContent = "语音输入";
  if (!$("voice-status").textContent.includes("权限") && !$("voice-status").textContent.includes("无法") && !$("voice-status").textContent.includes("没有")) {
    $("voice-status").textContent = "语音已结束，可以继续补充";
  }
}

function stopVoice() {
  if (!recognition || !isListening) return;
  try { recognition.stop(); } catch { finishVoiceUI(); }
}

function toast(text) {
  clearTimeout(toastTimer);
  $("toast").textContent = text;
  $("toast").classList.add("is-visible");
  toastTimer = setTimeout(() => $("toast").classList.remove("is-visible"), 2800);
}

async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; }
  catch {
    const helper = document.createElement("textarea");
    helper.value = text;
    helper.setAttribute("readonly", "");
    helper.style.position = "fixed";
    helper.style.opacity = "0";
    document.body.append(helper);
    helper.select();
    const copied = document.execCommand("copy");
    helper.remove();
    return copied;
  }
}

function openSafety(pending = "") {
  stopVoice();
  stopBreathing(false);
  modalOpener = document.activeElement;
  state.pendingAfterSafety = pending;
  $("safety-question").hidden = false;
  $("safety-support").hidden = true;
  const dialog = document.querySelector(".safety-modal");
  dialog.setAttribute("aria-labelledby", "safety-title");
  dialog.setAttribute("aria-describedby", "safety-description");
  $("safety-overlay").hidden = false;
  document.querySelector(".app-shell").inert = true;
  document.body.style.overflow = "hidden";
  requestAnimationFrame(() => $("safety-overlay").querySelector(".icon-button").focus());
}

function closeSafety() {
  $("safety-overlay").hidden = true;
  document.querySelector(".app-shell").inert = false;
  document.body.style.overflow = "";
  if (modalOpener && document.contains(modalOpener)) modalOpener.focus();
}

function safetySupport(type) {
  $("safety-question").hidden = true;
  $("safety-support").hidden = false;
  const dialog = document.querySelector(".safety-modal");
  dialog.setAttribute("aria-labelledby", "support-title");
  dialog.setAttribute("aria-describedby", "support-copy support-note");
  state.pendingAfterSafety = "";
  if (type === "self-harm") {
    $("support-title").textContent = "谢谢你说出来。现在先不处理这段关系。";
    $("support-copy").textContent = "如果你可能马上伤害自己，请不要独处；联系一位现在能陪伴你的人，并拨打 120 或 110 寻求紧急帮助。此刻的安全比完成这次整理更重要。";
    $("support-primary-call").href = "tel:120";
    $("support-primary-call").textContent = "拨打 120";
    $("support-secondary-call").href = "tel:110";
    $("support-secondary-call").textContent = "拨打 110";
  } else {
    $("support-title").textContent = "现在不是需要你把话说得更好的时候。";
    $("support-copy").textContent = "如果能够安全行动，请先去一个更安全、有人在的地方，并联系一位可信任的人。若有立即危险，在中国大陆请拨打 110；需要紧急医疗救助请拨打 120。非紧急的妇女权益咨询可尝试联系当地 12338，服务时间可能因地区不同。";
    $("support-primary-call").href = "tel:110";
    $("support-primary-call").textContent = "拨打 110";
    $("support-secondary-call").href = "tel:120";
    $("support-secondary-call").textContent = "拨打 120";
  }
  requestAnimationFrame(() => $("support-title").focus());
}

function reset(force = false) {
  if (!force && hasContent() && !confirm("清除本轮内容并重新开始？刷新页面后也无法恢复。")) return;
  stopBreathing(false);
  stopVoice();
  state = initial();
  closeSafety();
  $("grounding-practice").hidden = true;
  $("grounding-toggle").setAttribute("aria-expanded", "false");
  $("story-error").textContent = "";
  $("goal-error").textContent = "";
  setView("input");
}

$("story").addEventListener("input", event => {
  state.story = event.target.value.slice(0, 1000);
  $("story-count").textContent = `${state.story.length} / 1,000`;
  $("story-error").textContent = "";
});
$("demo-button").addEventListener("click", () => {
  state.story = DEMO.story;
  state.fact = DEMO.fact;
  state.interpretation = DEMO.interpretation;
  state.factUnclear = false;
  state.interpretationUnclear = false;
  renderInput();
  toast("已填入固定演示案例；后续内容仍由你的选择生成。");
});
$("start-button").addEventListener("click", () => {
  if (!state.story.trim()) {
    $("story-error").textContent = "先写下一点正在发生的事，或填入演示案例。";
    return $("story").focus();
  }
  state.guideIndex = 0;
  setView("guide");
});
$("guide-continue").addEventListener("click", () => {
  const error = guideError();
  if (error) { $("guide-error").textContent = error; return; }
  if (state.guideIndex < STEPS.length - 1) {
    state.guideIndex += 1;
    renderGuide();
    window.scrollTo({ top: 0, behavior: "smooth" });
    $("guide-title").focus({ preventScroll: true });
  } else setView("translation");
});
$("receiver-options").addEventListener("click", event => {
  const button = event.target.closest("[data-receiver]");
  if (!button) return;
  const value = button.dataset.receiver;
  const uncertain = "我不确定，不替 TA 下结论";
  const index = state.receiverPreferences.indexOf(value);
  if (index >= 0) state.receiverPreferences.splice(index, 1);
  else if (value === uncertain) state.receiverPreferences = [value];
  else {
    state.receiverPreferences = state.receiverPreferences.filter(item => item !== uncertain);
    if (state.receiverPreferences.length >= 2) return toast("最多选择两种表达方式。");
    state.receiverPreferences.push(value);
  }
  state.message = "";
  state.generationSource = "";
  renderExpress();
  if (value === RECEIVER_CUSTOM && state.receiverPreferences.includes(RECEIVER_CUSTOM)) $("receiver-custom").focus();
  else button.focus();
});
$("receiver-custom").addEventListener("input", event => {
  state.receiverCustom = event.target.value;
  state.message = "";
  state.generationSource = "";
  $("goal-error").textContent = "";
  renderExpress();
  $("receiver-custom").focus();
});
$("goal-options").addEventListener("click", event => {
  const button = event.target.closest("[data-goal]");
  if (!button) return;
  if (state.communicationGoal !== button.dataset.goal) {
    state.communicationGoal = button.dataset.goal;
    state.goalDetail = "";
    state.message = "";
    state.generationSource = "";
  }
  renderExpress();
});
$("goal-detail").addEventListener("input", event => { state.goalDetail = event.target.value; state.message = ""; state.generationSource = ""; $("goal-error").textContent = ""; renderExpress(); });
$("ai-consent").addEventListener("change", event => { state.aiConsent = event.target.checked; state.message = ""; state.generationSource = ""; renderExpress(); });
$("generate-button").addEventListener("click", async () => {
  if (!state.receiverPreferences.length) {
    $("goal-error").textContent = "先选择 1–2 种 TA 更容易接住的表达方式；不确定也可以如实选择。";
    return $("receiver-options").querySelector("button").focus();
  }
  if (state.receiverPreferences.includes(RECEIVER_CUSTOM) && !state.receiverCustom.trim()) {
    $("goal-error").textContent = "写下 TA 更容易接住的表达方式，或者取消“其他，我自己写”。";
    return $("receiver-custom").focus();
  }
  if (["request", "boundary"].includes(state.communicationGoal) && !state.goalDetail.trim()) {
    $("goal-error").textContent = state.communicationGoal === "request" ? "先写下一个对方可以明确回应的具体请求。" : "先写下如果情况继续，你会采取的保护行动。";
    return $("goal-detail").focus();
  }
  state.generating = true;
  renderExpress();
  const result = await generateDraft();
  state.message = result.text;
  state.generationSource = result.source;
  state.generating = false;
  renderExpress();
  $("message-editor").focus();
  if (result.reason === "file-mode") toast("当前是本地文件模式，已使用演示模板。运行 node server.js 后才能连接 AI。");
  else if (result.reason) toast("AI 暂时不可用，已自动改用本地演示模板。");
});
$("message-editor").addEventListener("input", event => { state.message = event.target.value; });
$("copy-button").addEventListener("click", async () => {
  const copied = await copyText($("message-editor").value);
  toast(copied ? "已复制。你仍然可以决定现在不发送。" : "浏览器没有允许复制，请长按文字手动复制。");
});
$("grounding-toggle").addEventListener("click", () => {
  const willOpen = $("grounding-practice").hidden;
  $("grounding-practice").hidden = !willOpen;
  $("grounding-toggle").setAttribute("aria-expanded", String(willOpen));
  $("grounding-toggle").textContent = willOpen ? "收起练习" : "先停一下";
  if (willOpen) requestAnimationFrame(() => $("breath-button").focus());
  else stopBreathing(false);
});
$("breath-button").addEventListener("click", startBreathing);
$("voice-button").addEventListener("click", toggleVoice);
$("reflection-continue").addEventListener("click", () => {
  const error = reflectionError();
  if (error) { $("reflection-error").textContent = error; return; }
  if (state.reflectionIndex < REFLECTION_STEPS.length - 1) {
    state.reflectionIndex += 1;
    renderReflection();
    $("reflection-title").focus({ preventScroll: true });
  } else {
    state.reflectionComplete = true;
    renderReflection();
    $("reflection-title").focus({ preventScroll: true });
  }
});

$("card-fact").addEventListener("input", event => { state.fact = event.target.value; state.factUnclear = false; state.message = ""; state.generationSource = ""; });
$("card-interpretation").addEventListener("input", event => { state.interpretation = event.target.value; state.interpretationUnclear = false; state.message = ""; state.generationSource = ""; });
$("card-protection").addEventListener("input", event => { state.protection = event.target.value; state.message = ""; state.generationSource = ""; });
$("card-feelings").addEventListener("input", event => { state.feelings = []; state.feelingOther = event.target.value; state.showFeelingOther = true; state.message = ""; state.generationSource = ""; });
$("card-body").addEventListener("input", event => { state.bodySignals = []; state.bodyOther = event.target.value; state.showBodyOther = true; state.message = ""; state.generationSource = ""; });
$("card-needs").addEventListener("input", event => { state.needs = []; state.needOther = event.target.value; state.showNeedOther = true; state.message = ""; state.generationSource = ""; });

document.addEventListener("click", event => {
  const action = event.target.closest("[data-action]")?.dataset.action;
  if (action === "reset") reset();
  if (action === "clear-and-exit") reset(true);
  if (action === "safety-open") openSafety();
  if (action === "safety-close") closeSafety();
  if (action === "grounding-close") {
    $("grounding-practice").hidden = true;
    $("grounding-toggle").setAttribute("aria-expanded", "false");
    $("grounding-toggle").textContent = "先停一下";
    stopBreathing(false);
    $("story").focus();
  }
  if (action === "guide-back") {
    if (state.guideIndex === 0) setView("input");
    else { state.guideIndex -= 1; renderGuide(); $("guide-title").focus({ preventScroll: true }); }
  }
  if (action === "edit-guide") { state.guideIndex = 0; setView("guide"); }
  if (action === "back-translation") setView("translation");
  if (action === "reflection-start") openSafety("reflection");
  if (action === "reflection-back") {
    if (state.reflectionComplete) { state.reflectionComplete = false; state.reflectionIndex = REFLECTION_STEPS.length - 1; renderReflection(); }
    else if (state.reflectionIndex === 0) setView("completion");
    else { state.reflectionIndex -= 1; renderReflection(); $("reflection-title").focus({ preventScroll: true }); }
  }
  if (action === "reflection-edit") { state.reflectionComplete = false; state.reflectionIndex = REFLECTION_STEPS.length - 1; renderReflection(); $("reflection-title").focus({ preventScroll: true }); }
  if (action === "copy-self-note") {
    copyText(selfNoteText()).then(copied => toast(copied ? "已复制给自己的便签。" : "浏览器没有允许复制，请长按文字手动复制。"));
  }

  const decision = event.target.closest("[data-decision]");
  if (decision) {
    if (!validateCard()) return;
    state.decision = decision.dataset.decision;
    if (state.decision === "express") openSafety("express");
    else {
      state.message = "";
      state.communicationGoal = "";
      state.goalDetail = "";
      state.completionType = state.decision;
      setView("completion");
    }
  }
  const safe = event.target.closest("[data-safety]")?.dataset.safety;
  if (safe === "safe") {
    const pending = state.pendingAfterSafety;
    state.pendingAfterSafety = "";
    closeSafety();
    if (pending === "express") setView("express");
    if (pending === "reflection") { state.reflectionIndex = 0; state.reflectionComplete = false; setView("reflection"); }
  } else if (safe) safetySupport(safe);
});

document.addEventListener("keydown", event => {
  if (event.key === "Escape" && !$("safety-overlay").hidden && !$("safety-question").hidden) closeSafety();
});

initVoice();
renderProgress();
renderInput();
