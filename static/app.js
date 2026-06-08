const state = {
  products: [],
  reminders: [],
  inquiries: [],
  currentRecord: null,
};

const STAGES = ["新询盘", "待补充信息", "待报价", "已报价待跟进", "已寄样", "谈判中", "赢单", "丢单", "暂停"];

const sampleInquiry = `Dear Sales Team,

This is Michael from GreenWay Import GmbH, Germany.
We are interested in your solar garden light model SGL-200.
Please quote 5,000 pcs, FOB Shenzhen.
Required specs: warm white LED, IP65 waterproof, color box packing.
Target delivery time is within 35 days.
Payment can be T/T.

Please send us your best price and lead time.

Best regards,
Michael
michael@greenway-example.com`;

const el = (id) => document.getElementById(id);

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function api(path, options = {}) {
  const response = await fetch(path, options);
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "请求失败");
  }
  return data;
}

function settingsPayload() {
  return {
    margin: el("marginInput").value,
    incoterm: el("incotermInput").value,
    payment: el("paymentInput").value,
    validity: el("validityInput").value,
  };
}

function renderProductSummary() {
  if (!state.products.length) {
    el("productSummary").innerHTML = "尚未上传产品表。";
    return;
  }
  const preview = state.products
    .slice(0, 4)
    .map((p) => `${escapeHtml(p.product_name || "-")} / ${escapeHtml(p.model || "-")} / ${escapeHtml(p.currency || "USD")} ${escapeHtml(p.unit_price || "-")}`)
    .join("<br>");
  el("productSummary").innerHTML = `已载入 <strong>${state.products.length}</strong> 个产品。<br>${preview}`;
}

function stageOptions(selected) {
  return STAGES.map((stage) => `<option value="${escapeHtml(stage)}" ${stage === selected ? "selected" : ""}>${escapeHtml(stage)}</option>`).join("");
}

function stageOf(record) {
  return record?.stage || record?.result?.followup?.stage || "新询盘";
}

function recordInfo(record) {
  const result = record?.result || {};
  const analysis = result.analysis || {};
  const customer = analysis.customer || {};
  const request = analysis.request || {};
  const quality = result.quality || {};
  return {
    customer: customer.company || customer.email || "未命名客户",
    country: customer.country || "-",
    product: request.product || "-",
    quantity: request.quantity || "-",
    grade: quality.grade || "-",
    score: quality.score || "-",
    dueDate: result.followup?.due_date || "",
    email: customer.email || "",
  };
}

function renderWorkflowBoard() {
  const target = el("workflowBoard");
  const detail = el("workflowDetail");
  if (!target) return;
  const grouped = Object.fromEntries(STAGES.map((stage) => [stage, []]));
  state.inquiries.forEach((record) => {
    const stage = STAGES.includes(stageOf(record)) ? stageOf(record) : "新询盘";
    grouped[stage].push(record);
  });
  target.innerHTML = STAGES.map((stage) => {
    const cards = grouped[stage]
      .slice()
      .reverse()
      .map((record) => {
        const info = recordInfo(record);
        const selected = state.currentRecord?.id === record.id ? " selected" : "";
        return `
          <button class="workflow-card${selected}" data-open-record="${escapeHtml(record.id)}">
            <span class="card-top">
              <strong>${escapeHtml(info.customer)}</strong>
              <span class="grade mini">${escapeHtml(info.grade)}</span>
            </span>
            <span>${escapeHtml(info.product)} · ${escapeHtml(info.quantity)}</span>
            <span class="meta">${escapeHtml(info.country)}${info.dueDate ? ` · 跟进 ${escapeHtml(info.dueDate)}` : ""}</span>
          </button>
        `;
      })
      .join("");
    return `
      <div class="workflow-column">
        <div class="workflow-column-head">
          <strong>${escapeHtml(stage)}</strong>
          <span>${grouped[stage].length}</span>
        </div>
        <div class="workflow-cards">${cards || '<div class="empty compact">暂无客户</div>'}</div>
      </div>
    `;
  }).join("");
  if (detail) renderWorkflowDetail();
}

function renderWorkflowDetail() {
  const detail = el("workflowDetail");
  if (!detail) return;
  const record = state.currentRecord;
  if (!record) {
    detail.className = "workflow-detail empty";
    detail.textContent = "暂无选中客户";
    return;
  }
  const info = recordInfo(record);
  const stage = stageOf(record);
  detail.className = "workflow-detail";
  detail.innerHTML = `
    <div>
      <strong>${escapeHtml(info.customer)}</strong>
      <span class="meta">${escapeHtml(info.email)} · ${escapeHtml(info.country)}</span>
    </div>
    <div class="workflow-detail-actions">
      <select id="workflowStageInput">${stageOptions(stage)}</select>
      <button class="secondary" id="workflowSaveStageBtn">保存阶段</button>
      <button class="ghost" id="workflowExportBtn">报价单</button>
    </div>
  `;
  el("workflowSaveStageBtn").addEventListener("click", () => updateStage({ inquiry_id: record.id, stage: el("workflowStageInput").value }));
  el("workflowExportBtn").addEventListener("click", () => exportQuote(record.id));
}

function openRecord(recordId) {
  const record = state.inquiries.find((item) => item.id === recordId);
  if (!record) return;
  state.currentRecord = record;
  el("inquiryText").value = record.inquiry || "";
  const result = record.result || {};
  renderAnalysis(result);
  renderQuote(result);
  el("emailView").classList.remove("empty");
  el("emailView").textContent = result.email_draft || "";
  renderFollowup(result);
  renderWorkflowBoard();
}

function renderReminders() {
  const target = el("remindersList");
  if (!state.reminders.length) {
    target.innerHTML = '<div class="empty">暂无跟进任务</div>';
    return;
  }
  target.innerHTML = state.reminders
    .slice()
    .reverse()
    .map((task) => {
      const customer = task.customer || {};
      return `
        <div class="task">
          <div><strong>${escapeHtml(task.due_date)}</strong><br><span class="meta">${escapeHtml(task.stage)}</span></div>
          <div>
            <div>${escapeHtml(customer.company || customer.email || "未命名客户")}</div>
            <div class="meta">${escapeHtml(task.message)}</div>
            <div class="task-actions">
              <select data-stage-reminder="${escapeHtml(task.id)}" data-inquiry-id="${escapeHtml(task.inquiry_id)}">${stageOptions(task.stage)}</select>
              <button class="ghost" data-save-stage="${escapeHtml(task.id)}">保存阶段</button>
              <button class="ghost" data-export-id="${escapeHtml(task.inquiry_id)}">报价单</button>
            </div>
          </div>
        </div>
      `;
    })
    .join("");
}

function renderAnalysis(result) {
  const analysis = result.analysis || {};
  const customer = analysis.customer || {};
  const request = analysis.request || {};
  const quality = result.quality || {};
  const missing = analysis.missing_info || [];
  const matches = analysis.matched_products || [];
  el("analysisView").classList.remove("empty");
  el("analysisView").innerHTML = `
    <div class="kv"><span>质量等级</span><span><span class="grade">${escapeHtml(quality.grade || "-")}</span> ${escapeHtml(quality.score || "")} 分</span></div>
    <div class="kv"><span>判断原因</span><span>${escapeHtml(quality.reason || "-")}</span></div>
    <div class="kv"><span>客户</span><span>${escapeHtml(customer.company || "-")} ${customer.email ? `(${escapeHtml(customer.email)})` : ""}</span></div>
    <div class="kv"><span>国家</span><span>${escapeHtml(customer.country || "-")}</span></div>
    <div class="kv"><span>产品</span><span>${escapeHtml(request.product || "-")}</span></div>
    <div class="kv"><span>数量</span><span>${escapeHtml(request.quantity || "-")}</span></div>
    <div class="kv"><span>贸易术语</span><span>${escapeHtml(request.incoterm || "-")}</span></div>
    <div class="kv"><span>付款方式</span><span>${escapeHtml(request.payment_terms || "-")}</span></div>
    <div class="kv"><span>缺失信息</span><span>${missing.length ? missing.map(escapeHtml).join("、") : "无"}</span></div>
    <div class="kv"><span>产品匹配</span><span>${matches.length ? matches.map((p) => `${escapeHtml(p.product_name)} / ${escapeHtml(p.model)}`).join("<br>") : "未找到匹配产品"}</span></div>
    <div class="kv"><span>引擎</span><span>${escapeHtml(result.source || "-")}</span></div>
  `;
}

function renderQuote(result) {
  const quote = result.quote || {};
  const fields = quote.pi_fields || {};
  const lines = quote.line_items || [];
  const tiers = quote.pricing_tiers || [];
  const notes = quote.product_notes || {};
  const warning = quote.warning ? `<div class="warning">${escapeHtml(quote.warning)}</div>` : "";
  const exportButton = state.currentRecord
    ? `<button class="secondary small-action" id="exportQuoteBtn">打开报价单</button>`
    : "";
  const table = lines.length
    ? `<table>
        <thead><tr><th>产品</th><th>型号</th><th>数量</th><th>单价</th><th>小计</th><th>价格来源</th></tr></thead>
        <tbody>
          ${lines
            .map(
              (line) => `<tr>
                <td>${escapeHtml(line.product_name)}</td>
                <td>${escapeHtml(line.model)}</td>
                <td>${escapeHtml(line.quantity)}</td>
                <td>${escapeHtml(line.currency || "USD")} ${escapeHtml(line.unit_price)}</td>
                <td>${escapeHtml(line.currency || "USD")} ${escapeHtml(line.subtotal)}</td>
                <td>${escapeHtml(line.price_source || "unit_price")}</td>
              </tr>`
            )
            .join("")}
        </tbody>
      </table>`
    : "";
  const tierTable = tiers.length
    ? `<table>
        <thead><tr><th>数量阶梯</th><th>报价单价</th></tr></thead>
        <tbody>${tiers.map((tier) => `<tr><td>${escapeHtml(tier.quantity)}+ pcs</td><td>${escapeHtml(tier.currency || "USD")} ${escapeHtml(tier.price)}</td></tr>`).join("")}</tbody>
      </table>`
    : '<div class="meta">产品表未提供阶梯价。</div>';
  el("quoteView").classList.remove("empty");
  el("quoteView").innerHTML = `
    <div class="panel-actions">${exportButton}</div>
    ${warning}
    <div class="kv"><span>草稿状态</span><span>${quote.available ? "可生成报价草稿" : "等待人工补充"}</span></div>
    <div class="kv"><span>买方</span><span>${escapeHtml(fields.buyer || "-")}</span></div>
    <div class="kv"><span>贸易术语</span><span>${escapeHtml(fields.incoterm || "-")}</span></div>
    <div class="kv"><span>付款方式</span><span>${escapeHtml(fields.payment_terms || "-")}</span></div>
    <div class="kv"><span>包装</span><span>${escapeHtml(fields.packaging || "-")}</span></div>
    <div class="kv"><span>交期</span><span>${escapeHtml(fields.lead_time || "-")}</span></div>
    <div class="kv"><span>有效期</span><span>${escapeHtml(fields.validity || "-")}</span></div>
    <div class="kv"><span>HS Code</span><span>${escapeHtml(notes.hs_code || "-")}</span></div>
    <div class="kv"><span>认证</span><span>${escapeHtml(notes.certification || "-")}</span></div>
    ${table}
    <h3>阶梯价格</h3>
    ${tierTable}
  `;
  const btn = el("exportQuoteBtn");
  if (btn) btn.addEventListener("click", () => exportQuote(state.currentRecord.id));
}

function renderFollowup(result) {
  const followup = result.followup || {};
  const safety = result.safety || [];
  const recordId = state.currentRecord?.id || "";
  const selectedStage = state.currentRecord ? stageOf(state.currentRecord) : followup.stage;
  el("followupView").classList.remove("empty");
  el("followupView").innerHTML = `
    <div class="kv"><span>状态</span><span>${escapeHtml(selectedStage || "-")}</span></div>
    <div class="kv"><span>跟进日期</span><span>${escapeHtml(followup.due_date || "无需优先跟进")}</span></div>
    <div class="kv"><span>跟进话术</span><span>${escapeHtml(followup.message || "-")}</span></div>
    <div class="stage-editor">
      <label>
        客户阶段
        <select id="stageInput">${stageOptions(selectedStage)}</select>
      </label>
      <button class="secondary" id="saveCurrentStageBtn" ${recordId ? "" : "disabled"}>保存阶段</button>
    </div>
    <div class="warning">${safety.map(escapeHtml).join("<br>")}</div>
  `;
  const saveBtn = el("saveCurrentStageBtn");
  if (saveBtn) saveBtn.addEventListener("click", () => updateStage({ inquiry_id: recordId, stage: el("stageInput").value }));
}

async function loadState() {
  const data = await api("/api/state");
  state.products = data.products || [];
  state.inquiries = data.inquiries || [];
  state.reminders = data.reminders || [];
  if (state.currentRecord) {
    state.currentRecord = state.inquiries.find((record) => record.id === state.currentRecord.id) || state.currentRecord;
  }
  el("apiStatus").textContent = data.openai_enabled ? "OpenAI 已启用" : "规则引擎模式";
  el("apiStatus").className = `pill ${data.openai_enabled ? "good" : "warn"}`;
  renderProductSummary();
  renderReminders();
  renderWorkflowBoard();
}

async function uploadProducts() {
  const file = el("productFile").files[0];
  if (!file) {
    alert("请先选择 CSV 或 XLSX 产品表。");
    return;
  }
  const button = el("uploadBtn");
  button.disabled = true;
  button.textContent = "上传中...";
  try {
    const form = new FormData();
    form.append("file", file);
    const data = await api("/api/upload-products", { method: "POST", body: form });
    state.products = data.products || [];
    renderProductSummary();
  } catch (error) {
    alert(error.message);
  } finally {
    button.disabled = false;
    button.textContent = "上传产品表";
  }
}

async function analyzeInquiry() {
  const inquiry = el("inquiryText").value.trim();
  if (!inquiry) {
    alert("请先粘贴询盘内容。");
    return;
  }
  const button = el("analyzeBtn");
  button.disabled = true;
  button.textContent = "分析中...";
  try {
    const data = await api("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inquiry, settings: settingsPayload() }),
    });
    state.currentRecord = data.record;
    const result = data.record.result;
    renderAnalysis(result);
    renderQuote(result);
    el("emailView").classList.remove("empty");
    el("emailView").textContent = result.email_draft || "";
    renderFollowup(result);
    await loadState();
  } catch (error) {
    alert(error.message);
  } finally {
    button.disabled = false;
    button.textContent = "分析询盘并生成草稿";
  }
}

function exportQuote(inquiryId) {
  if (!inquiryId) {
    alert("请先生成一个报价草稿。");
    return;
  }
  window.open(`/api/export?inquiry_id=${encodeURIComponent(inquiryId)}`, "_blank");
}

async function updateStage(payload) {
  try {
    await api("/api/stage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    await loadState();
    if (state.currentRecord && payload.inquiry_id === state.currentRecord.id) {
      renderFollowup(state.currentRecord.result || {});
      renderWorkflowDetail();
    }
  } catch (error) {
    alert(error.message);
  }
}

async function resetData() {
  if (!confirm("确认清空本地产品、询盘和跟进数据？")) return;
  await api("/api/reset", { method: "POST" });
  await loadState();
}

el("sampleInquiryBtn").addEventListener("click", () => {
  el("inquiryText").value = sampleInquiry;
});
el("uploadBtn").addEventListener("click", uploadProducts);
el("analyzeBtn").addEventListener("click", analyzeInquiry);
el("resetBtn").addEventListener("click", resetData);
el("refreshWorkflowBtn").addEventListener("click", loadState);
el("workflowBoard").addEventListener("click", (event) => {
  const card = event.target.closest("[data-open-record]");
  if (card) openRecord(card.dataset.openRecord);
});
el("remindersList").addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;
  const exportId = button.dataset.exportId;
  if (exportId) {
    exportQuote(exportId);
    return;
  }
  const reminderId = button.dataset.saveStage;
  if (reminderId) {
    const select = document.querySelector(`[data-stage-reminder="${CSS.escape(reminderId)}"]`);
    updateStage({ reminder_id: reminderId, inquiry_id: select?.dataset.inquiryId, stage: select?.value });
  }
});

loadState().catch((error) => {
  el("apiStatus").textContent = "服务异常";
  el("apiStatus").className = "pill warn";
  console.error(error);
});
