<template>
  <section v-if="data" class="process-flow-section">
    <h2 class="flow-section-title">{{ titleText }}</h2>

    <!-- Legend -->
    <div v-if="legendEntries.length" class="flow-legend">
      <p class="legend-heading">{{ t("flow.legendTitle") }}</p>

      <div class="legend-items">
        <div
          v-for="entry in legendEntries"
          :key="entry.key"
          class="legend-item"
        >
          <span class="legend-swatch" :style="entry.swatchStyle"></span>
          <span class="legend-label">{{ td(entry.meaning) }}</span>
        </div>
      </div>
    </div>

    <!-- Flowchart -->
    <div class="flow-scroll">
      <div
        ref="diagramRef"
        class="flow-diagram"
        role="img"
        :aria-label="titleText"
      >
        <!-- SVG Connectors -->
        <svg
          class="flow-svg"
          :viewBox="`0 0 ${VIEWBOX.w} ${VIEWBOX.h}`"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <defs>
            <marker
              id="arrow-blue"
              markerWidth="22"
              markerHeight="22"
              refX="22"
              refY="11"
              orient="auto"
              markerUnits="userSpaceOnUse"
              overflow="visible"
            >
              <path d="M0,0 L22,11 L0,22 Z" fill="#4874CB" />
            </marker>
          </defs>

          <!-- Bus lines: 分类主干线 + Finish 收口线 -->
          <path
            v-for="bus in busLines"
            :key="bus.id"
            :d="bus.d"
            class="flow-bus-line"
          />

          <!-- Plain edges: 不带箭头，用于汇入 Finish 收口线 -->
          <path
            v-for="edge in flowPlainEdges"
            :key="edge.id"
            :d="edge.d"
            class="flow-connector flow-connector-plain"
          />

          <!-- Arrow edges: 带箭头的主要流程线 -->
          <path
            v-for="edge in flowEdges"
            :key="edge.id"
            :d="edge.d"
            class="flow-connector"
            marker-end="url(#arrow-blue)"
          />

          <!-- Yes / No labels -->
          <text
            v-for="edge in labeledEdges"
            :key="`${edge.id}-label`"
            :x="edge.labelX"
            :y="edge.labelY"
            class="flow-edge-label"
          >
            {{ edgeLabel(edge) }}
          </text>
        </svg>

        <!-- Nodes -->
        <div
          v-for="nodeId in renderNodeIds"
          :key="nodeId"
          :ref="el => setNodeRef(nodeId, el)"
          :class="['flow-node', nodeShapeClass(nodeId)]"
          :style="nodeStyle(nodeId)"
        >
          <span class="node-text">{{ tdNode(nodeId) }}</span>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import {
  ref,
  computed,
  onMounted,
  onBeforeUnmount,
  nextTick,
  watch
} from "vue";
import { useI18n } from "../composables/useI18n.js";

const { t, td } = useI18n();

const data = ref(null);
const baseUrl = import.meta.env.BASE_URL;

const diagramRef = ref(null);
const nodeEls = ref({});
const nodeBoxes = ref({});

let resizeObserver = null;
let measureRaf = 0;

/**
 * 画布尺寸：
 * 坐标体系仍保持与原 SVG 逻辑一致。
 */
const VIEWBOX = {
  w: 3100,
  h: 980
};

const CLASS_BUS_X = 950;
const FINISH_BUS_X = 2800;

/**
 * START_GAP：箭头从源节点边界出发时的额外间距。
 * END_GAP：箭头指向目标节点时，与目标节点边界保留的间距。
 */
const START_GAP = 0;
const END_GAP = 12;

/**
 * 节点布局：
 * x / y 是节点中心点坐标，保持不变。
 * w 是固定视觉宽度。
 * h 是最小高度，不再作为固定高度。
 *
 * 本版重点：
 * 1. 方框高度不固定，会随文字换行自动撑开。
 * 2. 节点中心位置不变。
 * 3. SVG 连线根据 DOM 实际宽高动态计算。
 */
const NODE_LAYOUT = {
  start_initiate: {
    x: 105,
    y: 180,
    w: 180,
    h: 58
  },

  recording_and_judgment: {
    x: 403,
    y: 180,
    w: 260,
    h: 66
  },

  first_location_problem: {
    x: 720,
    y: 180,
    w: 190,
    h: 110
  },

  second_location_problem: {
    x: 720,
    y: 465,
    w: 190,
    h: 110
  },

  category_model: {
    x: 1080,
    y: 180,
    w: 150,
    h: 56
  },

  category_software: {
    x: 1080,
    y: 465,
    w: 150,
    h: 56
  },

  category_hardware: {
    x: 1080,
    y: 760,
    w: 150,
    h: 56
  },

  model_needs_additional_data: {
    x: 1550,
    y: 70,
    w: 360,
    h: 105
  },

  obtain_data_expand_model: {
    x: 1970,
    y: 70,
    w: 280,
    h: 66
  },

  remote_upgrade: {
    x: 2400,
    y: 70,
    w: 320,
    h: 66
  },

  upgrade_model: {
    x: 1550,
    y: 180,
    w: 360,
    h: 82
  },

  model_calibration: {
    x: 1550,
    y: 290,
    w: 360,
    h: 60
  },

  software_version: {
    x: 1550,
    y: 405,
    w: 360,
    h: 88
  },

  software_bug: {
    x: 1550,
    y: 525,
    w: 360,
    h: 78
  },

  development: {
    x: 1970,
    y: 525,
    w: 220,
    h: 58
  },

  remote_update: {
    x: 2400,
    y: 465,
    w: 320,
    h: 66
  },

  replacement_and_repair: {
    x: 1550,
    y: 675,
    w: 360,
    h: 60
  },

  repair_decision: {
    x: 1970,
    y: 675,
    w: 190,
    h: 110
  },

  return_factory_repair: {
    x: 1550,
    y: 845,
    w: 410,
    h: 94
  },

  machine_returned: {
    x: 2400,
    y: 845,
    w: 320,
    h: 66
  },

  finish: {
    x: 2980,
    y: 570,
    w: 220,
    h: 58
  }
};

onMounted(async () => {
  try {
    const res = await fetch(`${baseUrl}content/flowchart/process-flow.json`);
    data.value = await res.json();

    await nextTick();
    setupResizeObserver();
    requestMeasureNodes();
  } catch (e) {
    console.error("Failed to load process flowchart:", e);
  }

  window.addEventListener("resize", requestMeasureNodes);
});

onBeforeUnmount(() => {
  window.removeEventListener("resize", requestMeasureNodes);

  if (resizeObserver) {
    resizeObserver.disconnect();
    resizeObserver = null;
  }

  if (measureRaf) {
    cancelAnimationFrame(measureRaf);
    measureRaf = 0;
  }
});

const nodeMap = computed(() => {
  const map = {};

  for (const node of data.value?.nodes ?? []) {
    map[node.node_id] = node;
  }

  return map;
});

const renderNodeIds = computed(() => {
  return Object.keys(NODE_LAYOUT).filter(id => nodeMap.value[id]);
});

watch(
  () => renderNodeIds.value.join("|"),
  async () => {
    await nextTick();
    setupResizeObserver();
    requestMeasureNodes();
  }
);

function setNodeRef(nodeId, el) {
  if (el) {
    nodeEls.value[nodeId] = el;
  } else {
    delete nodeEls.value[nodeId];
  }
}

function setupResizeObserver() {
  if (resizeObserver) {
    resizeObserver.disconnect();
  }

  if (typeof ResizeObserver === "undefined") return;

  resizeObserver = new ResizeObserver(() => {
    requestMeasureNodes();
  });

  if (diagramRef.value) {
    resizeObserver.observe(diagramRef.value);
  }

  for (const el of Object.values(nodeEls.value)) {
    if (el) resizeObserver.observe(el);
  }
}

function requestMeasureNodes() {
  if (measureRaf) {
    cancelAnimationFrame(measureRaf);
  }

  measureRaf = requestAnimationFrame(() => {
    measureRaf = 0;
    measureNodes();
  });
}

/**
 * 读取节点 DOM 的真实尺寸，并转换成 SVG viewBox 坐标。
 * 这样切换俄语后，方框高度自动变大，箭头也会自动重新贴合边界。
 */
function measureNodes() {
  const diagram = diagramRef.value;
  if (!diagram) return;

  const diagramRect = diagram.getBoundingClientRect();
  if (!diagramRect.width || !diagramRect.height) return;

  const measured = {};

  for (const [nodeId, el] of Object.entries(nodeEls.value)) {
    if (!el) continue;

    const rect = el.getBoundingClientRect();

    const left =
      ((rect.left - diagramRect.left) / diagramRect.width) * VIEWBOX.w;
    const right =
      ((rect.right - diagramRect.left) / diagramRect.width) * VIEWBOX.w;
    const top =
      ((rect.top - diagramRect.top) / diagramRect.height) * VIEWBOX.h;
    const bottom =
      ((rect.bottom - diagramRect.top) / diagramRect.height) * VIEWBOX.h;

    measured[nodeId] = {
      left,
      right,
      top,
      bottom,
      cx: (left + right) / 2,
      cy: (top + bottom) / 2,
      w: right - left,
      h: bottom - top
    };
  }

  nodeBoxes.value = measured;
}

const titleText = computed(() => {
  const rawTitle = data.value?.title;

  if (!rawTitle) return "";

  if (typeof rawTitle === "string") {
    return td(rawTitle);
  }

  return td(rawTitle.text || "");
});

const legendEntries = computed(() => {
  if (!data.value?.style_legend) return [];

  const order = ["gray", "orange", "blue", "green", "white"];

  return order
    .filter(k => data.value.style_legend[k])
    .map(k => {
      const item = data.value.style_legend[k];

      const sw = {
        background: item.hex_from_rendering
      };

      if (item.outline_color) {
        sw.border = `1px solid ${item.outline_color}`;
      }

      return {
        key: k,
        meaning: item.meaning,
        swatchStyle: sw
      };
    });
});

/**
 * 没有完成 DOM 测量前，先用 NODE_LAYOUT 里的 w/h 作为兜底。
 */
function boxOf(nodeId) {
  const measured = nodeBoxes.value[nodeId];
  if (measured) return measured;

  const pos = NODE_LAYOUT[nodeId];

  if (!pos) {
    return {
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
      cx: 0,
      cy: 0,
      w: 0,
      h: 0
    };
  }

  return {
    left: pos.x - pos.w / 2,
    right: pos.x + pos.w / 2,
    top: pos.y - pos.h / 2,
    bottom: pos.y + pos.h / 2,
    cx: pos.x,
    cy: pos.y,
    w: pos.w,
    h: pos.h
  };
}

function centerY(nodeId) {
  return boxOf(nodeId).cy;
}

function anchor(nodeId, side, gap = 0) {
  const b = boxOf(nodeId);

  switch (side) {
    case "left":
      return { x: b.left - gap, y: b.cy };
    case "right":
      return { x: b.right + gap, y: b.cy };
    case "top":
      return { x: b.cx, y: b.top - gap };
    case "bottom":
      return { x: b.cx, y: b.bottom + gap };
    default:
      return { x: b.cx, y: b.cy };
  }
}

function round(n) {
  return Math.round(n * 10) / 10;
}

function toPath(points) {
  if (!points.length) return "";

  const [first, ...rest] = points;

  return [
    `M${round(first.x)} ${round(first.y)}`,
    ...rest.map(p => `L${round(p.x)} ${round(p.y)}`)
  ].join(" ");
}

function addEdge(list, edge) {
  list.push({
    ...edge,
    d: toPath(edge.points)
  });
}

/**
 * 主干线：
 * finish-merge-bus 会根据远程升级 / 远程更新 / 整机返回等节点高度动态取上下端。
 */
const busLines = computed(() => {
  const finishYValues = [
    centerY("remote_upgrade"),
    centerY("model_calibration"),
    centerY("remote_update"),
    centerY("repair_decision"),
    centerY("machine_returned")
  ];

  return [
    {
      id: "classification-bus",
      d: `M${CLASS_BUS_X} ${round(centerY("first_location_problem"))} L${CLASS_BUS_X} ${round(centerY("category_hardware"))}`
    },
    {
      id: "finish-merge-bus",
      d: `M${FINISH_BUS_X} ${round(Math.min(...finishYValues))} L${FINISH_BUS_X} ${round(Math.max(...finishYValues))}`
    }
  ];
});

/**
 * 不带箭头的汇入线。
 * 这些线接入 finish-merge-bus，不单独画箭头，避免多个箭头重叠。
 */
const flowPlainEdges = computed(() => {
  const edges = [];

  addEdge(edges, {
    id: "P01",
    from: "remote_upgrade",
    to: "finish_merge_bus",
    points: [
      anchor("remote_upgrade", "right", START_GAP),
      { x: FINISH_BUS_X, y: centerY("remote_upgrade") }
    ]
  });

  addEdge(edges, {
    id: "P02",
    from: "model_calibration",
    to: "finish_merge_bus",
    points: [
      anchor("model_calibration", "right", START_GAP),
      { x: FINISH_BUS_X, y: centerY("model_calibration") }
    ]
  });

  addEdge(edges, {
    id: "P03",
    from: "remote_update",
    to: "finish_merge_bus",
    points: [
      anchor("remote_update", "right", START_GAP),
      { x: FINISH_BUS_X, y: centerY("remote_update") }
    ]
  });

  const repairYesStart = anchor("repair_decision", "right", START_GAP);

  addEdge(edges, {
    id: "P04",
    from: "repair_decision",
    to: "finish_merge_bus",
    label: "yes",
    labelX: (repairYesStart.x + FINISH_BUS_X) / 2,
    labelY: repairYesStart.y - 18,
    points: [
      repairYesStart,
      { x: FINISH_BUS_X, y: centerY("repair_decision") }
    ]
  });

  addEdge(edges, {
    id: "P05",
    from: "machine_returned",
    to: "finish_merge_bus",
    points: [
      anchor("machine_returned", "right", START_GAP),
      { x: FINISH_BUS_X, y: centerY("machine_returned") }
    ]
  });

  addEdge(edges, {
    id: "P06",
    from: "first_location_problem",
    to: "classification_bus",
    label: "yes",
    labelX: 840,
    labelY: centerY("first_location_problem") - 15,
    points: [
      anchor("first_location_problem", "right", START_GAP),
      { x: CLASS_BUS_X, y: centerY("first_location_problem") }
    ]
  });

  addEdge(edges, {
    id: "P07",
    from: "second_location_problem",
    to: "classification_bus",
    label: "yes",
    labelX: 840,
    labelY: centerY("second_location_problem") - 15,
    points: [
      anchor("second_location_problem", "right", START_GAP),
      { x: CLASS_BUS_X, y: centerY("second_location_problem") }
    ]
  });

  return edges;
});

/**
 * 带箭头的流程线。
 * 所有目标节点的终点都用 anchor() 动态计算。
 */
const flowEdges = computed(() => {
  const edges = [];

  addEdge(edges, {
    id: "C01",
    from: "start_initiate",
    to: "recording_and_judgment",
    points: [
      anchor("start_initiate", "right", START_GAP),
      anchor("recording_and_judgment", "left", END_GAP)
    ]
  });

  addEdge(edges, {
    id: "C02",
    from: "recording_and_judgment",
    to: "first_location_problem",
    points: [
      anchor("recording_and_judgment", "right", START_GAP),
      anchor("first_location_problem", "left", END_GAP)
    ]
  });

  addEdge(edges, {
    id: "C04",
    from: "first_location_problem",
    to: "second_location_problem",
    label: "no",
    labelX: boxOf("first_location_problem").cx + 15,
    labelY:
      (anchor("first_location_problem", "bottom").y +
        anchor("second_location_problem", "top").y) /
      2,
    points: [
      anchor("first_location_problem", "bottom", START_GAP),
      anchor("second_location_problem", "top", END_GAP)
    ]
  });

  addEdge(edges, {
    id: "C06",
    from: "second_location_problem",
    to: "return_factory_repair",
    label: "no",
    labelX: boxOf("second_location_problem").cx + 20,
    labelY: 745,
    points: [
      anchor("second_location_problem", "bottom", START_GAP),
      {
        x: boxOf("second_location_problem").cx,
        y: centerY("return_factory_repair")
      },
      anchor("return_factory_repair", "left", END_GAP)
    ]
  });

  addEdge(edges, {
    id: "C07",
    from: "classification_bus",
    to: "category_model",
    points: [
      { x: CLASS_BUS_X, y: centerY("category_model") },
      anchor("category_model", "left", END_GAP)
    ]
  });

  addEdge(edges, {
    id: "C08",
    from: "classification_bus",
    to: "category_software",
    points: [
      { x: CLASS_BUS_X, y: centerY("category_software") },
      anchor("category_software", "left", END_GAP)
    ]
  });

  addEdge(edges, {
    id: "C09",
    from: "classification_bus",
    to: "category_hardware",
    points: [
      { x: CLASS_BUS_X, y: centerY("category_hardware") },
      anchor("category_hardware", "left", END_GAP)
    ]
  });

  const modelJunctionX = 1240;

  addEdge(edges, {
    id: "C10",
    from: "category_model",
    to: "model_needs_additional_data",
    points: [
      anchor("category_model", "right", START_GAP),
      { x: modelJunctionX, y: centerY("category_model") },
      { x: modelJunctionX, y: centerY("model_needs_additional_data") },
      anchor("model_needs_additional_data", "left", END_GAP)
    ]
  });

  addEdge(edges, {
    id: "C11",
    from: "model_needs_additional_data",
    to: "obtain_data_expand_model",
    points: [
      anchor("model_needs_additional_data", "right", START_GAP),
      anchor("obtain_data_expand_model", "left", END_GAP)
    ]
  });

  addEdge(edges, {
    id: "C12",
    from: "obtain_data_expand_model",
    to: "remote_upgrade",
    points: [
      anchor("obtain_data_expand_model", "right", START_GAP),
      anchor("remote_upgrade", "left", END_GAP)
    ]
  });

  addEdge(edges, {
    id: "C13",
    from: "category_model",
    to: "upgrade_model",
    points: [
      anchor("category_model", "right", START_GAP),
      anchor("upgrade_model", "left", END_GAP)
    ]
  });

  const upgradeStart = anchor("upgrade_model", "right", START_GAP);
  const remoteUpgradeEnd = anchor("remote_upgrade", "left", END_GAP);
  const upgradeElbowX = Math.min(2190, remoteUpgradeEnd.x - 60);

  addEdge(edges, {
    id: "C14",
    from: "upgrade_model",
    to: "remote_upgrade",
    points: [
      upgradeStart,
      { x: upgradeElbowX, y: upgradeStart.y },
      { x: upgradeElbowX, y: remoteUpgradeEnd.y },
      remoteUpgradeEnd
    ]
  });

  addEdge(edges, {
    id: "C15",
    from: "category_model",
    to: "model_calibration",
    points: [
      anchor("category_model", "right", START_GAP),
      { x: modelJunctionX, y: centerY("category_model") },
      { x: modelJunctionX, y: centerY("model_calibration") },
      anchor("model_calibration", "left", END_GAP)
    ]
  });

  const softwareJunctionX = 1240;

  addEdge(edges, {
    id: "C18",
    from: "category_software",
    to: "software_version",
    points: [
      anchor("category_software", "right", START_GAP),
      { x: softwareJunctionX, y: centerY("category_software") },
      { x: softwareJunctionX, y: centerY("software_version") },
      anchor("software_version", "left", END_GAP)
    ]
  });

  addEdge(edges, {
    id: "C19",
    from: "category_software",
    to: "software_bug",
    points: [
      anchor("category_software", "right", START_GAP),
      { x: softwareJunctionX, y: centerY("category_software") },
      { x: softwareJunctionX, y: centerY("software_bug") },
      anchor("software_bug", "left", END_GAP)
    ]
  });

  const softwareVersionStart = anchor("software_version", "right", START_GAP);
  const remoteUpdateEnd = anchor("remote_update", "left", END_GAP);
  const updateElbowX = Math.min(2190, remoteUpdateEnd.x - 60);

  addEdge(edges, {
    id: "C20",
    from: "software_version",
    to: "remote_update",
    points: [
      softwareVersionStart,
      { x: updateElbowX, y: softwareVersionStart.y },
      { x: updateElbowX, y: remoteUpdateEnd.y },
      remoteUpdateEnd
    ]
  });

  addEdge(edges, {
    id: "C21",
    from: "software_bug",
    to: "development",
    points: [
      anchor("software_bug", "right", START_GAP),
      anchor("development", "left", END_GAP)
    ]
  });

  const developmentStart = anchor("development", "right", START_GAP);
  const developmentElbowX = Math.min(2190, remoteUpdateEnd.x - 60);

  addEdge(edges, {
    id: "C22",
    from: "development",
    to: "remote_update",
    points: [
      developmentStart,
      { x: developmentElbowX, y: developmentStart.y },
      { x: developmentElbowX, y: remoteUpdateEnd.y },
      remoteUpdateEnd
    ]
  });

  const hardwareJunctionX = 1240;

  addEdge(edges, {
    id: "C24",
    from: "category_hardware",
    to: "replacement_and_repair",
    points: [
      anchor("category_hardware", "right", START_GAP),
      { x: hardwareJunctionX, y: centerY("category_hardware") },
      { x: hardwareJunctionX, y: centerY("replacement_and_repair") },
      anchor("replacement_and_repair", "left", END_GAP)
    ]
  });

  addEdge(edges, {
    id: "C25",
    from: "category_hardware",
    to: "return_factory_repair",
    points: [
      anchor("category_hardware", "right", START_GAP),
      { x: hardwareJunctionX, y: centerY("category_hardware") },
      { x: hardwareJunctionX, y: centerY("return_factory_repair") },
      anchor("return_factory_repair", "left", END_GAP)
    ]
  });

  addEdge(edges, {
    id: "C26",
    from: "replacement_and_repair",
    to: "repair_decision",
    points: [
      anchor("replacement_and_repair", "right", START_GAP),
      anchor("repair_decision", "left", END_GAP)
    ]
  });

  const repairNoStart = anchor("repair_decision", "bottom", START_GAP);
  const returnTop = anchor("return_factory_repair", "top", END_GAP);

  addEdge(edges, {
    id: "C28",
    from: "repair_decision",
    to: "return_factory_repair",
    label: "no",
    labelX: boxOf("repair_decision").cx - 90,
    labelY: (repairNoStart.y + returnTop.y) / 2,
    points: [
      repairNoStart,
      {
        x: returnTop.x,
        y: repairNoStart.y
      },
      returnTop
    ]
  });

  addEdge(edges, {
    id: "C29",
    from: "return_factory_repair",
    to: "machine_returned",
    points: [
      anchor("return_factory_repair", "right", START_GAP),
      anchor("machine_returned", "left", END_GAP)
    ]
  });

  addEdge(edges, {
    id: "C31",
    from: "finish_merge_bus",
    to: "finish",
    points: [
      { x: FINISH_BUS_X, y: centerY("finish") },
      anchor("finish", "left", END_GAP)
    ]
  });

  return edges;
});

const labeledEdges = computed(() => {
  return [...flowEdges.value, ...flowPlainEdges.value].filter(
    edge => edge.label && edge.labelX && edge.labelY
  );
});

function tdNode(nodeId) {
  const node = nodeMap.value[nodeId];
  return node ? td(node.text) : nodeId;
}

function nodeStyle(nodeId) {
  const node = nodeMap.value[nodeId];
  const pos = NODE_LAYOUT[nodeId];

  if (!node || !pos) return {};

  const style = {
    left: `${(pos.x / VIEWBOX.w) * 100}%`,
    top: `${(pos.y / VIEWBOX.h) * 100}%`,
    width: `${(pos.w / VIEWBOX.w) * 100}%`,
    minHeight: `${(pos.h / VIEWBOX.h) * 100}%`,
    background: node.fill_color,
    color: "#fff"
  };

  if (node.fill_color === "#FFFFFF") {
    style.color = "#000";
    style.border = `1px solid ${node.outline_color || "#000"}`;
  }

  if (node.fill_color === "#BFBFBF") {
    style.color = "#000";
  }

  return style;
}

function nodeShapeClass(nodeId) {
  const node = nodeMap.value[nodeId];

  if (!node) return "flow-node-rect";

  if (node.shape?.includes("diamond")) {
    return "flow-node-diamond";
  }

  if (node.shape?.includes("terminator")) {
    return "flow-node-terminator";
  }

  if (node.fill_color === "#FFFFFF") {
    return "flow-node-rect flow-node-white";
  }

  return "flow-node-rect";
}

function edgeLabel(edge) {
  if (edge.label === "yes") return t("flow.yes");
  if (edge.label === "no") return t("flow.no");
  return edge.label;
}
</script>

<style scoped>
.process-flow-section {
  width: 100%;
  color: #111827;
}

.flow-section-title {
  margin: 0 0 16px;
  font-size: clamp(20px, 2vw, 30px);
  line-height: 1.2;
  font-weight: 700;
  text-align: center;
}

/* Legend */
.flow-legend {
  margin: 0 auto 18px;
  max-width: 1360px;
  padding: 12px 16px;
  border: 1px solid #d9e2ef;
  border-radius: 12px;
  background: #f8fafc;
}

.legend-heading {
  margin: 0 0 10px;
  font-size: 14px;
  font-weight: 700;
}

.legend-items {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 18px;
}

.legend-item {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-width: 190px;
  font-size: 13px;
  line-height: 1.3;
}

.legend-swatch {
  width: 18px;
  height: 18px;
  display: inline-block;
  flex: 0 0 auto;
  border-radius: 4px;
  box-shadow: inset 0 0 0 1px rgb(0 0 0 / 0.08);
}

.legend-label {
  overflow-wrap: anywhere;
}

/* Flow diagram */
.flow-scroll {
  width: 100%;
  overflow-x: auto;
  padding-bottom: 10px;
}

.flow-diagram {
  position: relative;
  width: 100%;
  min-width: 2200px;
  aspect-ratio: 3100 / 980;
  margin: 0 auto;
  border: 1px solid #d9e2ef;
  border-radius: 16px;
  background: linear-gradient(180deg, #ffffff 0%, #f9fbff 100%);
  overflow: hidden;
}

.flow-svg {
  position: absolute;
  inset: 0;
  z-index: 1;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.flow-connector {
  fill: none;
  stroke: #4874CB;
  stroke-width: 2.5;
  stroke-linecap: butt;
  stroke-linejoin: round;
  vector-effect: non-scaling-stroke;
}

.flow-connector-plain {
  marker-end: none;
}

.flow-bus-line {
  fill: none;
  stroke: #4874CB;
  stroke-width: 2.5;
  stroke-linecap: butt;
  stroke-linejoin: round;
  vector-effect: non-scaling-stroke;
}

.flow-edge-label {
  fill: #1f2937;
  font-size: 20px;
  font-weight: 700;
  paint-order: stroke;
  stroke: #ffffff;
  stroke-width: 5px;
  stroke-linejoin: round;
}

/* Nodes */
.flow-node {
  position: absolute;
  z-index: 2;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px 10px;
  text-align: center;
  font-size: clamp(12px, 0.78vw, 16px);
  line-height: 1.25;
  font-weight: 700;
  box-shadow:
    0 8px 18px rgb(15 23 42 / 0.10),
    inset 0 0 0 1px rgb(255 255 255 / 0.18);
  overflow: visible;
  white-space: normal;
  overflow-wrap: anywhere;
  word-break: normal;
  hyphens: auto;
}

.flow-node-rect {
  transform: translate(-50%, -50%);
  height: auto;
  border-radius: 8px;
}

.flow-node-terminator {
  transform: translate(-50%, -50%);
  height: auto;
  border-radius: 999px;
}

.flow-node-white {
  box-shadow:
    0 8px 18px rgb(15 23 42 / 0.08),
    inset 0 0 0 1px rgb(0 0 0 / 0.12);
}

/**
 * 横向菱形：
 * 不使用 rotate(45deg)，避免文字被旋转。
 * min-height 会保留基础高度；内容变长时高度自动增加。
 */
.flow-node-diamond {
  transform: translate(-50%, -50%);
  height: auto;
  border-radius: 0;
  clip-path: polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%);
  padding: 10px 36px;
}

.flow-node-diamond .node-text {
  width: 100%;
  max-width: 100%;
  display: block;
  text-align: center;
  line-height: 1.16;
}

.node-text {
  display: block;
  max-width: 100%;
}

/* Responsive */
@media (max-width: 900px) {
  .flow-diagram {
    min-width: 2200px;
  }

  .legend-items {
    display: grid;
    grid-template-columns: 1fr;
  }
}
</style>