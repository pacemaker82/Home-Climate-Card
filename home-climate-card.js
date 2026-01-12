class HomeClimateCard extends HTMLElement {

  static getConfigForm() {
    return {
      schema: [    
        { name: "primary_accent_color",
          selector: { text: {} },
        },
        { name: "entities",
          selector: {
            object: {
              multiple: true,
              label_field: "entity",
              fields: {
                entity: { 
                  label: "Climate or Temperature Entity",
                  selector: { entity: {} },
                },                                               
                floor: { 
                  label: "Floor",
                  default: 1,
                  selector: { number: { step: "integer", } },
                },
                circuit: {
                  label: "Circuit Number",
                  default: 1,
                  selector: { number: { min: 1, step: "integer", } },            
                },
                name: { 
                  label: "Name",
                  selector: { text: {}},
                },      
                color: { 
                  label: "Colour",
                  selector: { text: {} },
                },    
                no_heat_source: { 
                  label: "This room doesn't have a heat source?",
                  selector: { boolean: {} },
                },   
                is_heating_entity: {
                  label: "Alternative heating signal",
                  selector: { entity: { domain: "binary_sensor", } },               
                },
                valve_entity: {
                  label: "Valve % Entity",
                  selector: { entity: {} },
                },                                                                                                   
              },
            },
          },
        },         
        { name: "labels",
          selector: {
            object: {
              multiple: true,
              fields: {
                entity: { label: "Entity", selector: { entity: {} } },
                icon: { label: "Icon override", selector: { icon: {} } },
                name: { label: "Name", selector: { text: {} } },
                color: { label: "Colour", selector: { text: {} } },
                secondary: { label: "Secondary (entity or last_updated)", selector: { text: {} } },
                secondary_name: { label: "Secondary name", selector: { text: {} } },
              },
            },
          },
        },
      ],
      computeLabel: (schema) => {
        return undefined;
      },
      computeHelper: (schema) => {
        return undefined;
      },
    };
  }    

  static getStubConfig() {
    return {
      entities: [
        {
          entity: "climate.living_room",
          floor: 1,
          circuit: 1,
          name: "Living Room",
        },
      ],
      primary_accent_color: "",
      labels: [
        {
          entity: "binary_sensor.heating_on_off",
          icon: "mdi:radiator",
          name: "Heating",
          secondary: "last_updated",
        },
        {
          entity: "sensor.outside_temperature",
          icon: "mdi:weather-partly-cloudy",
          name: "Outside",
        },
        {
          entity: "binary_sensor.hot_water_on_off",
          icon: "mdi:water-boiler",
          name: "Hot Water",
          secondary: "sensor.hot_water_on_minutes",
          secondary_name: "Total Time",
        },
      ],
    };
  }

  getGridOptions() {
    return {
      rows: 5,
      columns: 9,
    };
  }  

  setConfig(config) {
    if (!config || !Array.isArray(config.entities) || config.entities.length === 0) {
      throw new Error("home-climate-card: entities is required");
    }
    this._config = config;
    if (!this._lastTemps) {
      this._lastTemps = new Map();
    }
    if (!this._tempChangeDirections) {
      this._tempChangeDirections = new Map();
    }
    if (!this._tempChangeTimers) {
      this._tempChangeTimers = new Map();
    }
    if (!this.shadowRoot) {
      this.attachShadow({ mode: "open" });
      const style = document.createElement("style");
      style.textContent = `
        :host {
          display: block;
          width: 100%;
          height: 100%;
        }
        .card {
          position: relative;
          width: 100%;
          height: 100%;
          margin: 0 auto;
          overflow: hidden;
          min-height: var(--home-climate-card-min-height, 260px);
          min-width: 0;
        }
        .rooms {
          position: absolute;
          display: flex;
          flex-direction: column;
          gap: 6px;
          box-sizing: border-box;
        }
        .labels {
          position: absolute;
          left: 0;
          right: 0;
          top: 0;
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 6px;
          padding: 10px 10px 4px;
          pointer-events: auto;
        }
        .labels[data-count="1"] {
          grid-template-columns: 1fr;
        }
        .labels[data-count="1"] .label {
          grid-column: 1;
          width: 100%;
          justify-items: center;
        }
        .labels[data-count="1"] .label ha-icon {
          justify-self: center;
        }
        .labels[data-count="1"] .label .label-title,
        .labels[data-count="1"] .label .label-value,
        .labels[data-count="1"] .label .label-secondary {
          text-align: center;
        }
        .label {
          display: grid;
          grid-template-columns: auto 1fr;
          grid-template-rows: auto auto auto;
          align-items: center;
          column-gap: 10px;
          row-gap: 0;
          font-size: 11px;
          font-weight: 600;
          color: var(--secondary-text-color);
          text-transform: uppercase;
          letter-spacing: 0.4px;
          white-space: nowrap;
          width: 100%;
          justify-self: stretch;
          justify-items: start;
          background: color-mix(in srgb, var(--state-climate-heat-color) 10%, transparent);
          border-radius: 8px;
          padding: 6px 10px;
          box-sizing: border-box;
          cursor: pointer;
        }
        .label:focus-visible {
          outline: 2px solid var(--state-climate-heat-color);
          outline-offset: 2px;
        }
        .label:nth-child(3) {
          grid-template-columns: 1fr auto;
          justify-items: end;
        }
        .label:nth-child(3) ha-icon {
          grid-column: 2;
          grid-row: 1 / span 3;
        }
        .label:nth-child(3) .label-title,
        .label:nth-child(3) .label-value,
        .label:nth-child(3) .label-secondary {
          grid-column: 1;
          text-align: right;
        }
        .labels[data-count="3"] .label:nth-child(2) {
          grid-template-columns: 1fr 1fr;
          justify-items: center;
        }
        .labels[data-count="3"] .label:nth-child(2) ha-icon {
          justify-self: center;
        }
        .labels[data-count="3"] .label:nth-child(2) .label-title,
        .labels[data-count="3"] .label:nth-child(2) .label-value,
        .labels[data-count="3"] .label:nth-child(2) .label-secondary {
          text-align: center;
        }
        .labels[data-count="2"] .label:nth-child(2) {
          grid-column: 3;
          grid-template-columns: 1fr auto;
          justify-items: end;
        }
        .labels[data-count="2"] .label:nth-child(2) ha-icon {
          grid-column: 2;
          grid-row: 1 / span 3;
        }
        .labels[data-count="2"] .label:nth-child(2) .label-title,
        .labels[data-count="2"] .label:nth-child(2) .label-value,
        .labels[data-count="2"] .label:nth-child(2) .label-secondary {
          grid-column: 1;
          text-align: right;
        }
        .label ha-icon {
          --mdc-icon-size: 28px;
          grid-row: 1 / span 3;
        }
        .label.state-on ha-icon {
          color: var(--state-climate-heat-color);
        }
        .label-title {
          font-size: 10px;
          font-weight: 500;
          letter-spacing: 0.6px;
        }
        .label-value {
          font-size: 16px;
          font-weight: 800;
          letter-spacing: 0.2px;
          color: var(--primary-text-color);
          margin-top: -6px;
        }
        .label-secondary {
          grid-column: 2;
          font-size: 9px;
          font-weight: 600;
          color: var(--secondary-text-color);
          letter-spacing: 0.2px;
          margin-top: 0px;
          white-space: normal;
          overflow-wrap: anywhere;
          line-height: 1.05;
        }
        .label-secondary-value {
          font-weight: 700;
        }
        .label.state-on {
          color: var(--state-climate-heat-color);
        }
        .label.state-on .label-value {
          color: var(--state-climate-heat-color);
        }
        .floor {
          display: flex;
          gap: 6px;
          flex: 1 1 0;
          min-height: 0;
        }
        .room {
          flex: 1 1 0;
          min-width: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          text-align: center;
          border-left: 0;
          cursor: pointer;
          border-radius: 6px;
          background: transparent;
          border: 3px solid color-mix(in srgb, var(--state-climate-heat-color) 70%, transparent);
          position: relative;
          transition: opacity 0.25s ease, filter 0.25s ease;
        }
        .room.disabled {
          opacity: 0.5;
          border-color: var(--disabled-color);
        }
        .room.unavailable {
          opacity: 0.35;
          filter: grayscale(0.65);
        }
        .room.disabled .current,
        .room.disabled .target,
        .room.disabled .name {
          color: var(--disabled-text-color);
        }
        .room.disabled .current ha-icon {
          color: var(--disabled-text-color);
        }
        .room.no-transition {
          transition: none !important;
        }
        .room.no-transition .room-heat-overlay {
          transition: none !important;
        }
        .room-heat-overlay {
          position: absolute;
          left: 0;
          right: 0;
          bottom: 0;
          height: var(--heat-level, 0%);
          border-radius: 2px;
          background-color: var(--state-climate-heat-color);
          opacity: 0;
          transition: opacity 0.4s ease, height 0.35s ease;
          pointer-events: none;
        }
        .room-change-icon {
          position: absolute;
          top: var(--chevron-top, calc(var(--current-top, 0px) / 2));
          left: var(--chevron-left, 50%);
          transform: translate(-50%, -50%);
          --mdc-icon-size: var(--chevron-size, 24px);
          color: var(--state-climate-heat-color);
          opacity: 0;
          transition: opacity 0.35s ease-in-out;
          pointer-events: none;
        }
        .room-change-icon.active {
          opacity: 0.9;
        }
        .room.disabled .room-change-icon {
          color: var(--disabled-text-color);
        }
        .room.heating {
          background-color: transparent;
          filter: drop-shadow(0 2px 6px rgba(0, 0, 0, 0.25));
        }
        .room.heating .current,
        .room.heating .target,
        .room.heating .name {
          text-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
        }
        .room.heating .current ha-icon,
        .room.heating .target ha-icon {
          filter: drop-shadow(0 2px 6px rgba(0, 0, 0, 0.3));
        }
        .room.heating .room-heat-overlay {
          opacity: 0.3;
        }
        .room-content {
          height: 100%;
          display: grid;
          grid-template-rows: 1fr auto;
          align-items: center;
          justify-items: center;
          row-gap: 6px;
          padding-bottom: var(--room-padding-bottom, 10px);
          padding-left: clamp(4px, 3%, 10px);
          padding-right: clamp(4px, 3%, 10px);
        }
        .metrics {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          transform: translateY(10px);
        }
        .current {
          font-weight: 600;
          line-height: 1;
          display: flex;
          align-items: center;
          gap: 0;
          justify-content: center;
          letter-spacing: -0.5px;
        }
        .room.near-target .current {
          color: var(--state-climate-heat-cool-color);
        }
        .current-temp {
          display: inline-grid;
          grid-template-columns: auto auto;
          grid-template-rows: auto auto;
          column-gap: 0;
          row-gap: 0;
          align-items: end;
        }
        .current-int {
          grid-column: 1;
          grid-row: 1 / span 2;
          align-self: end;
          line-height: 1;
        }
        .current-unit {
          grid-column: 2;
          grid-row: 1;
          justify-self: end;
          font-size: 0.35em;
          line-height: 1;
          font-weight: 400;
          align-self: start;
          transform: translateY(0.2em);
        }
        .current-decimal {
          grid-column: 2;
          grid-row: 2;
          font-size: 0.45em;
          line-height: 1;
          font-weight: 400;
          justify-self: end;
          align-self: end;
          margin-left: calc(-0.12em + 3px);
          transform: translateY(-0.16em);
        }
        .target {
          display: flex;
          align-items: center;
          gap: 0;
          line-height: 1;
          letter-spacing: -1px;
          color: var(--secondary-text-color);
          margin-top: -4px;
        }
        .target.heating {
          color: var(--state-climate-heat-color);
        }
        @media (prefers-color-scheme: dark) {
          .target.heating {
            text-shadow: 0 1px 2px rgba(0, 0, 0, 0.45);
          }
        }
        .target ha-icon {
          --mdc-icon-size: 14px;
          margin-right: 0px;
        }
        .target-value,
        .target-unit {
          display: inline-block;
        }
        .target-unit {
          margin-left: 2px;
        }
        .name {
          white-space: normal;
          overflow: hidden;
          overflow-wrap: anywhere;
          line-height: 1.1;
          font-weight: 600;
          color: var(--primary-text-color);
        }
      `;
      const card = document.createElement("div");
      card.className = "card";
      const labels = document.createElement("div");
      labels.className = "labels";
      const rooms = document.createElement("div");
      rooms.className = "rooms";
      card.append(labels, rooms);
      this.shadowRoot.append(style, card);
      this._rooms = rooms;
      this._labels = labels;
      this._card = card;
      this._resizeObserver = new ResizeObserver(() => this._scheduleRender());
      this._resizeObserver.observe(this._card);
      this._resizeObserver.observe(this);
    }
    this._render(true);
  }

  connectedCallback() {
    this._suppressHeatingTransition = true;
    if (this._iconTimer) {
      clearTimeout(this._iconTimer);
      this._iconTimer = null;
    }
    this._scheduleRender();
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => this._scheduleRender());
    }
  }

  disconnectedCallback() {
    if (this._iconTimer) {
      clearTimeout(this._iconTimer);
      this._iconTimer = null;
    }
    if (this._tempChangeTimers) {
      this._tempChangeTimers.forEach((timer) => clearTimeout(timer));
      this._tempChangeTimers.clear();
    }
  }

  _scheduleHeatingIconTick() {
    if (!this._heatingSteps) {
      this._heatingSteps = [
        { mid: false, high: false, duration: 800 },
        { mid: true, high: false, duration: 300 },
        { mid: true, high: false, duration: 800 },
        { mid: true, high: true, duration: 300 },
        { mid: true, high: true, duration: 800 },
        { mid: false, high: true, duration: 100 },
        { mid: false, high: false, duration: 200 },
      ];
    }
    if (typeof this._heatingStepIndex !== "number") {
      this._heatingStepIndex = 0;
    }
    const step = this._heatingSteps[this._heatingStepIndex];
    this._tickHeatingIcons(step);
    this._heatingStepIndex = (this._heatingStepIndex + 1) % this._heatingSteps.length;
    this._iconTimer = setTimeout(() => {
      this._scheduleHeatingIconTick();
    }, step.duration);
  }

  set hass(hass) {
    this._hass = hass;
    if (this._shouldRender()) {
      this._render(true);
    }
    this._updateHeatingUI();
  }

  _tickHeatingIcons(step) {
    if (!this._rooms) return;
    const iconStacks = this._rooms.querySelectorAll('.current-icon-stack[data-heating="1"]');
    if (!iconStacks.length) return;
    iconStacks.forEach((iconStack) => {
      const midIcon = iconStack.querySelector(".current-icon.mid");
      const highIcon = iconStack.querySelector(".current-icon.high");
      if (!midIcon || !highIcon) return;
      midIcon.classList.toggle("active", step && step.mid);
      highIcon.classList.toggle("active", step && step.high);
    });
  }

  getCardSize() {
    return 4;
  }

  _render(force = false) {

    console.log("render");

    if (!this._config || !this._rooms) return;
    if (!force && !this._shouldRender()) return;
    const configWidth = Number(this._config.canvas_width) || Number(this._config.canvas_size) || 0;
    const configHeight = Number(this._config.canvas_height) || Number(this._config.canvas_size) || 0;
    if (this._card) {
      if (this._config.primary_accent_color) {
        this._card.style.setProperty("--state-climate-heat-color", this._config.primary_accent_color);
      } else {
        this._card.style.removeProperty("--state-climate-heat-color");
      }
    }
    if (configWidth) {
      this._card.style.width = `${configWidth}px`;
    } else {
      this._card.style.width = "100%";
    }
    if (configHeight) {
      this._card.style.height = `${configHeight}px`;
    } else {
      this._card.style.height = "100%";
    }
    const rect = this._card.getBoundingClientRect();
    const width = rect.width || configWidth || 0;
    const height = rect.height || configHeight || 0;
    if (!width || !height) {

      this._renderRetryCount = (this._renderRetryCount || 0) + 1;
      if (this._renderRetryCount <= 30) {
        this._scheduleRender(120);
      }
      return;
    }
    this._renderRetryCount = 0;
    const roomsPaddingX = 4;
    const roomsPaddingBottom = 4;
    const labelsConfig = Array.isArray(this._config.labels) ? this._config.labels : [];
    const hasLabels = labelsConfig.length > 0;
    const entities = this._config.entities || [];

    const grouped = new Map();
    entities.forEach((item, order) => {
      if (!item || !item.entity) return;
      const floor = Number.isInteger(item.floor) ? item.floor : parseInt(item.floor, 10) || 1;
      const circuit = Number.isInteger(item.circuit) ? item.circuit : parseInt(item.circuit, 10) || 1;
      if (!grouped.has(floor)) grouped.set(floor, []);
      grouped.get(floor).push({ item, order, circuit });
    });
    const floorNumbers = Array.from(grouped.keys()).sort((a, b) => b - a);
    if (!configHeight) {
      const floorCount = floorNumbers.length || 1;
      const minHeight = floorCount * 74 + (hasLabels ? 86 : 0);
      this._card.style.minHeight = `${minHeight}px`;
    } else {
      this._card.style.minHeight = "";
    }
    this._rooms.innerHTML = "";

    if (this._labels) {
      this._labels.style.display = hasLabels ? "" : "none";
      this._labels.dataset.count = hasLabels ? String(labelsConfig.length) : "0";
      this._labels.innerHTML = "";
      const formatNumber = (value) => {
        const num = typeof value === "number" ? value : parseFloat(value);
        if (!Number.isFinite(num)) return `${value}`;
        const fixed = num.toFixed(2);
        return fixed.replace(/\.?0+$/, "");
      };
      const formatSecondary = (value, unit) => {
        if (value == null) return "";
        const formatted = formatNumber(value);
        return unit ? `${formatted}${unit}` : formatted;
      };
      const buildLabel = (configItem) => {
        if (!configItem || !configItem.entity || !this._hass) return;
        const stateObj = this._hass.states[configItem.entity];
        if (!stateObj) return;
        const iconName = configItem.icon || stateObj.attributes && stateObj.attributes.icon || "";
        const label = document.createElement("div");
        label.className = "label";
        if (typeof configItem.color === "string" && configItem.color.trim()) {
          label.style.setProperty("--state-climate-heat-color", configItem.color.trim());
        }
        label.setAttribute("role", "button");
        label.setAttribute("tabindex", "0");
        label.setAttribute(
          "aria-label",
          configItem.name
            || (stateObj.attributes && stateObj.attributes.friendly_name)
            || configItem.entity
        );
        const openMoreInfo = () => {
          this.dispatchEvent(new CustomEvent("hass-more-info", {
            detail: { entityId: configItem.entity },
            bubbles: true,
            composed: true,
          }));
        };
        label.addEventListener("click", openMoreInfo);
        label.addEventListener("keydown", (event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            openMoreInfo();
          }
        });
        const icon = document.createElement("ha-icon");
        if (iconName) {
          icon.setAttribute("icon", iconName);
        }
        const title = document.createElement("div");
        title.className = "label-title";
        title.textContent = configItem.name
          || (stateObj.attributes && stateObj.attributes.friendly_name)
          || configItem.entity;
        const value = document.createElement("div");
        value.className = "label-value";
        const unit = stateObj.attributes && stateObj.attributes.unit_of_measurement
          ? stateObj.attributes.unit_of_measurement
          : "";
        const formattedState = formatNumber(stateObj.state);
        value.textContent = unit ? `${formattedState}${unit}` : formattedState;
        if (stateObj.state === "on") {
          label.classList.add("state-on");
        }
        label.append(icon, title, value);
        if (configItem.secondary) {
          const secondary = document.createElement("div");
          secondary.className = "label-secondary";
          const secondaryLabelText = configItem.secondary_name
            ? `${configItem.secondary_name}: `
            : "";
          const secondaryLabel = document.createElement("span");
          secondaryLabel.textContent = secondaryLabelText;
          const secondaryValue = document.createElement("span");
          secondaryValue.className = "label-secondary-value";
          if (configItem.secondary === "last_updated") {
            const lastUpdated = stateObj.last_updated || stateObj.last_changed;
            const date = lastUpdated ? new Date(lastUpdated) : null;
            const timeText = date && !Number.isNaN(date.getTime())
              ? date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
              : "";
            secondaryValue.textContent = timeText;
          } else {
            const secondaryState = this._hass.states[configItem.secondary];
            if (secondaryState) {
              const secUnit = secondaryState.attributes && secondaryState.attributes.unit_of_measurement
                ? secondaryState.attributes.unit_of_measurement
                : "";
              secondaryValue.textContent = formatSecondary(secondaryState.state, secUnit);
            }
          }
          if (secondaryValue.textContent) {
            if (secondaryLabelText) {
              secondary.append(secondaryLabel);
            }
            secondary.append(secondaryValue);
            label.append(secondary);
          }
        }
        this._labels.append(label);
      };
      labelsConfig.forEach((item) => buildLabel(item));
    }

    const labelsHeight = hasLabels && this._labels
      ? Math.ceil(this._labels.getBoundingClientRect().height)
      : 0;
    const roomsTop = hasLabels ? labelsHeight : roomsPaddingBottom;
    this._rooms.style.left = `${roomsPaddingX}px`;
    this._rooms.style.top = `${roomsTop}px`;
    this._rooms.style.width = `${width - roomsPaddingX * 2}px`;
    this._rooms.style.height = `${height - roomsTop - roomsPaddingBottom}px`;
    this._rooms.style.padding = `${roomsPaddingBottom}px ${roomsPaddingX}px ${roomsPaddingBottom}px`;

    floorNumbers.forEach((floorNum, floorIndex) => {
      const list = grouped.get(floorNum) || [];
      list.sort((a, b) => (a.circuit - b.circuit) || (a.order - b.order));
      if (list.length === 0) return;
      const floorEl = document.createElement("div");
      floorEl.className = "floor";
      list.forEach((entry, idx) => {
        const item = entry.item;
        const stateObj = this._hass && this._hass.states[item.entity];
        const name = item.name || (stateObj && stateObj.attributes && stateObj.attributes.friendly_name) || item.entity;
        const circuit = entry.circuit;
        const noHeatSource = item.no_heat_source === true;
        const heatingEntity = item && (item.is_heating_entity || item.is_heating);
        const valveEntity = item && item.valve_entity;
        const tempAttr = stateObj && stateObj.attributes && stateObj.attributes.current_temperature;
        const target = stateObj && stateObj.attributes && stateObj.attributes.temperature;
        const unitAttr = stateObj && stateObj.attributes && stateObj.attributes.unit_of_measurement;
        const unitFallback = this._hass && this._hass.config && this._hass.config.unit_system
          ? this._hass.config.unit_system.temperature
          : "";
        const unit = unitAttr || unitFallback;
        const isUnavailable = !stateObj
          || stateObj.state === "unavailable"
          || stateObj.state === "unknown";
        const temp = tempAttr != null ? tempAttr : (stateObj ? stateObj.state : undefined);
        const hasTemp = !isUnavailable && (typeof temp === "number" || typeof temp === "string");
        const formatTemp = (value) => {
          const num = typeof value === "number" ? value : parseFloat(value);
          return Number.isFinite(num) ? num.toFixed(1) : `${value}`;
        };
        const currentValueText = hasTemp ? formatTemp(temp) : "N/A";
        const currentUnitText = hasTemp ? unit : "";
        const hasTarget = !isUnavailable && (typeof target === "number" || typeof target === "string");
        const targetValueText = hasTarget ? formatTemp(target) : "";
        const targetUnitText = hasTarget ? unit : "";

        const tempValue = typeof temp === "number" ? temp : parseFloat(temp);
        const room = document.createElement("div");
        room.className = "room";
        room.classList.toggle("unavailable", isUnavailable);
        if (typeof item.color === "string" && item.color.trim()) {
          room.style.setProperty("--state-climate-heat-color", item.color.trim());
        }
        if (Number.isFinite(tempValue)) {
          room.dataset.currentTemp = String(tempValue);
        }
        room.dataset.circuit = String(circuit);
        room.dataset.entity = item.entity;
        if (noHeatSource) {
          room.dataset.noHeatSource = "1";
        }
        if (heatingEntity) {
          room.dataset.heatingEntity = heatingEntity;
        }
        if (valveEntity) {
          room.dataset.valveEntity = valveEntity;
        }
        const heatOverlay = document.createElement("div");
        heatOverlay.className = "room-heat-overlay";
        room.appendChild(heatOverlay);
        const changeIcon = document.createElement("ha-icon");
        changeIcon.className = "room-change-icon";
        changeIcon.setAttribute("icon", "mdi:chevron-up");
        room.appendChild(changeIcon);
        const isClimate = item.entity.startsWith("climate.");
        if (isClimate) {
          room.dataset.isClimate = "1";
        }
        room.setAttribute("role", "button");
        room.setAttribute("tabindex", "0");
        room.setAttribute("aria-label", name);
        room.addEventListener("click", () => {
          this.dispatchEvent(new CustomEvent("hass-more-info", {
            detail: { entityId: item.entity },
            bubbles: true,
            composed: true,
          }));
        });
        const content = document.createElement("div");
        content.className = "room-content";
        content.dataset.roomCount = String(list.length);

        const currentEl = document.createElement("div");
        currentEl.className = "current";
        const currentWrap = document.createElement("span");
        currentWrap.className = "current-temp";
        const split = currentValueText.includes(".")
          ? currentValueText.split(".")
          : [currentValueText, ""];
        const currentIntEl = document.createElement("span");
        currentIntEl.className = "current-int";
        currentIntEl.textContent = split[0] || currentValueText;
        const currentUnitEl = document.createElement("span");
        currentUnitEl.className = "current-unit";
        currentUnitEl.textContent = currentUnitText;
        const currentDecEl = document.createElement("span");
        currentDecEl.className = "current-decimal";
        currentDecEl.textContent = split[1] ? `.${split[1]}` : "";
        currentWrap.append(currentIntEl, currentUnitEl, currentDecEl);
        currentEl.append(currentWrap);

        let targetEl = null;
        let targetUnitEl = null;
        let icon = null;
        if (hasTarget) {
          targetEl = document.createElement("div");
          targetEl.className = "target";
          targetEl.classList.toggle("heating", false);
          icon = document.createElement("ha-icon");
          icon.setAttribute("icon", "mdi:thermostat");
          const targetValueEl = document.createElement("span");
          targetValueEl.className = "target-value";
          targetValueEl.textContent = targetValueText;
          targetUnitEl = document.createElement("span");
          targetUnitEl.className = "target-unit";
          targetUnitEl.textContent = targetUnitText;
          targetEl.append(icon, targetValueEl, targetUnitEl);
        }

        const nameEl = document.createElement("div");
        nameEl.className = "name";
        nameEl.textContent = name;

        const metrics = document.createElement("div");
        metrics.className = "metrics";
        metrics.append(currentEl);
        if (targetEl) {
          metrics.append(targetEl);
        }
        content.append(metrics, nameEl);
        room.appendChild(content);
        room.dataset.roomCount = String(list.length);
        floorEl.appendChild(room);
      });
      this._rooms.appendChild(floorEl);
    });

    requestAnimationFrame(() => {
      this._applyFontScales();
      this._fitRoomNames();
    });
  }

  _scheduleRender(delayMs = 0) {
    if (this._renderScheduled) return;
    this._renderScheduled = true;
    const run = () => {
      requestAnimationFrame(() => {
        this._renderScheduled = false;
        this._render(true);
      });
    };
    if (delayMs > 0) {
      setTimeout(run, delayMs);
    } else {
      run();
    }
  }

  _computeRenderKey() {
    if (!this._hass || !this._config) return "";
    const entities = this._config.entities || [];
    const labels = Array.isArray(this._config.labels) ? this._config.labels : [];
    const parts = [];
    entities.forEach((item) => {
      if (!item || !item.entity) return;
      const stateObj = this._hass.states[item.entity];
      const state = stateObj ? stateObj.state : "";
      const attrs = stateObj ? stateObj.attributes : {};
      const currentTemp = attrs ? attrs.current_temperature : "";
      const targetTemp = attrs ? attrs.temperature : "";
      parts.push(
        item.entity,
        state,
        currentTemp,
        targetTemp
      );
      if (item.valve_entity) {
        const valveObj = this._hass.states[item.valve_entity];
        const valveState = valveObj ? valveObj.state : "";
        parts.push("valve", item.valve_entity, valveState);
      }
    });
    labels.forEach((item) => {
      if (!item || !item.entity) return;
      const stateObj = this._hass.states[item.entity];
      const state = stateObj ? stateObj.state : "";
      const attrs = stateObj ? stateObj.attributes : {};
      const unit = attrs ? attrs.unit_of_measurement : "";
      const icon = attrs ? attrs.icon : "";
      const name = attrs ? attrs.friendly_name : "";
      parts.push(
        "label",
        item.entity,
        state,
        unit,
        icon,
        name
      );
      if (item.secondary) {
        if (item.secondary === "last_updated") {
          const updated = stateObj ? (stateObj.last_updated || stateObj.last_changed || "") : "";
          parts.push("label_last_updated", updated);
        } else {
          const secondaryObj = this._hass.states[item.secondary];
          const secondaryState = secondaryObj ? secondaryObj.state : "";
          const secondaryAttrs = secondaryObj ? secondaryObj.attributes : {};
          const secondaryUnit = secondaryAttrs ? secondaryAttrs.unit_of_measurement : "";
          parts.push(
            "label_secondary",
            item.secondary,
            secondaryState,
            secondaryUnit
          );
        }
      }
    });
    const key = parts.join("|");
    return key;
  }

  _shouldRender() {
    const key = this._computeRenderKey();
    if (!key) return true;
    if (key === this._lastRenderKey) return false;
    this._lastRenderKey = key;
    return true;
  }

  _applyFontScales() {
    if (!this._rooms) return;
    const rooms = this._rooms.querySelectorAll(".room");
    rooms.forEach((room) => {
      const rect = room.getBoundingClientRect();
      const roomWidth = rect.width;
      const roomHeight = rect.height;
      const baseSize = Math.min(roomWidth, roomHeight);
      const count = Number(room.dataset.roomCount) || 1;
      const sizeScale = baseSize ? Math.pow(baseSize / 170, 0.9) : 1;
      const countScale = Math.max(0.6, Math.min(1.6, 3 / Math.sqrt(count)));
      const fontScale = Math.max(0.45, Math.min(2.0, sizeScale * countScale));
      const currentEl = room.querySelector(".current");
      const currentUnitEl = room.querySelector(".current-unit");
      const targetEl = room.querySelector(".target");
      const targetUnitEl = room.querySelector(".target-unit");
      const targetIcon = room.querySelector(".target ha-icon");
      const nameEl = room.querySelector(".name");
      const contentEl = room.querySelector(".room-content");
      if (!currentEl || !currentUnitEl || !nameEl) return;
      if (contentEl) {
        if (count <= 2) {
          const pad = Math.min(16, Math.max(10, roomWidth * 0.08));
          contentEl.style.paddingLeft = `${pad}px`;
          contentEl.style.paddingRight = `${pad}px`;
        } else {
          contentEl.style.paddingLeft = "";
          contentEl.style.paddingRight = "";
        }
        const bottomPad = Math.min(18, Math.max(8, 10 * fontScale));
        contentEl.style.setProperty("--room-padding-bottom", `${bottomPad}px`);
      }
      currentEl.style.fontSize = `${46 * fontScale}px`;
      currentEl.style.transform = `translateX(${(-2 * fontScale).toFixed(2)}px)`;
      if (targetEl && targetUnitEl) {
        const targetScale = fontScale;
        targetEl.style.fontSize = `${18 * targetScale}px`;
        targetUnitEl.style.fontSize = `${12 * targetScale}px`;
        if (targetIcon) {
          targetIcon.style.setProperty("--mdc-icon-size", `${19 * targetScale}px`);
        }
      }
      nameEl.style.fontSize = `${17 * fontScale}px`;

      const roomRect = room.getBoundingClientRect();
      const currentRect = currentEl.getBoundingClientRect();
      const currentTop = Math.max(0, currentRect.top - roomRect.top);
      room.style.setProperty("--current-top", `${currentTop}px`);

      if (contentEl && roomWidth > roomHeight) {
        const contentRect = contentEl.getBoundingClientRect();
        const contentLeft = Math.max(0, contentRect.left - roomRect.left);
        const chevronLeft = Math.max(0, contentLeft / 2);
        const aspectDelta = Math.max(0, roomWidth - roomHeight);
        const chevronSize = Math.min(38, Math.max(16, 18 + aspectDelta * 0.16));
        const chevronTop = Math.max(0, roomHeight / 2);
        room.style.setProperty("--chevron-left", `${chevronLeft}px`);
        room.style.setProperty("--chevron-top", `${chevronTop}px`);
        room.style.setProperty("--chevron-size", `${chevronSize}px`);
      } else {
        room.style.removeProperty("--chevron-left");
        room.style.removeProperty("--chevron-top");
        room.style.removeProperty("--chevron-size");
      }
    });
  }

  _updateHeatingUI() {
    if (!this._rooms || !this._config) return;
    const entities = this._config.entities || [];
    const heatingCircuits = new Set();
    const tempChangeTimeoutMs = 30000;
    const isHeatingEntityOn = (item) => {
      const heatingEntity = item && (item.is_heating_entity || item.is_heating);
      if (!heatingEntity || !this._hass) return false;
      const heatingState = this._hass.states[heatingEntity];
      return heatingState && heatingState.state === "on";
    };
    let hasHeating = false;
    entities.forEach((item) => {
      if (!item || !item.entity) return;
      const stateObj = this._hass && this._hass.states[item.entity];
      const isHeating = (stateObj && stateObj.attributes && stateObj.attributes.hvac_action === "heating")
        || item.debug_heating === true
        || isHeatingEntityOn(item);
      const circuit = Number.isInteger(item.circuit) ? item.circuit : parseInt(item.circuit, 10) || 1;
      if (isHeating && item.entity.startsWith("climate.")) {
        heatingCircuits.add(circuit);
      }
      if (isHeating) {
        hasHeating = true;
      }
    });
    const roomElements = this._rooms.querySelectorAll(".room");
    const suppressTransition = this._suppressHeatingTransition;
    if (suppressTransition) {
      roomElements.forEach((room) => room.classList.add("no-transition"));
    }
    if (!hasHeating) {
      this._heatingStepIndex = 0;
    }
    roomElements.forEach((room) => {
      const entityId = room.dataset.entity;
      const item = entities.find((entry) => entry && entry.entity === entityId);
      if (!item) return;
      const stateObj = this._hass && this._hass.states[item.entity];
      const valveEntity = item.valve_entity;
      const circuit = Number.isInteger(item.circuit) ? item.circuit : parseInt(item.circuit, 10) || 1;
      const noHeatSource = item.no_heat_source === true;
      const isClimate = item.entity.startsWith("climate.");
      const hasHeatingEntity = Boolean(item.is_heating_entity || item.is_heating);
      const isClimateOff = isClimate && stateObj && stateObj.state === "off";
      const isUnavailable = !stateObj
        || stateObj.state === "unavailable"
        || stateObj.state === "unknown";
      const rawTemp = stateObj && stateObj.attributes
        ? stateObj.attributes.current_temperature
        : (stateObj ? stateObj.state : undefined);
      const currentTemp = typeof rawTemp === "number" ? rawTemp : parseFloat(rawTemp);
      const previousTemp = this._lastTemps && this._lastTemps.get(entityId);
      if (Number.isFinite(currentTemp)) {
        if (Number.isFinite(previousTemp) && currentTemp !== previousTemp) {
          const direction = currentTemp > previousTemp ? "up" : "down";
          this._tempChangeDirections.set(entityId, direction);
          if (this._tempChangeTimers.has(entityId)) {
            clearTimeout(this._tempChangeTimers.get(entityId));
          }
          const timer = setTimeout(() => {
            this._tempChangeDirections.delete(entityId);
            this._tempChangeTimers.delete(entityId);
            this._updateHeatingUI();
          }, tempChangeTimeoutMs);
          this._tempChangeTimers.set(entityId, timer);
        }
        this._lastTemps.set(entityId, currentTemp);
      }
      const isHeating = (stateObj && stateObj.attributes && stateObj.attributes.hvac_action === "heating")
        || item.debug_heating === true
        || isHeatingEntityOn(item);
      const shouldHeat = !isClimateOff && !noHeatSource && (
        isHeating ||
        (!isClimate && !hasHeatingEntity && heatingCircuits.has(circuit))
      );
      let valvePercent = 100;
      if (valveEntity) {
        const valveObj = this._hass && this._hass.states[valveEntity];
        const valveState = valveObj ? valveObj.state : "";
        const parsedValve = typeof valveState === "number" ? valveState : parseFloat(valveState);
        valvePercent = Number.isFinite(parsedValve) ? parsedValve : 0;
      }
      valvePercent = this._clamp(valvePercent, 0, 100);
      const targetTemp = stateObj && stateObj.attributes ? stateObj.attributes.temperature : undefined;
      const parsedTarget = typeof targetTemp === "number" ? targetTemp : parseFloat(targetTemp);
      const nearTarget = Number.isFinite(currentTemp)
        && Number.isFinite(parsedTarget)
        && Math.abs(currentTemp - parsedTarget) <= 0.3
        && !shouldHeat;
      const tempChangeDirection = this._tempChangeDirections.get(entityId);
      room.classList.toggle("disabled", isClimateOff);
      room.classList.toggle("unavailable", isUnavailable);
      room.classList.toggle("heating", shouldHeat);
      room.classList.toggle("near-target", nearTarget);
      if (shouldHeat) {
        room.style.setProperty("--heat-level", `${valvePercent}%`);
      } else {
        room.style.setProperty("--heat-level", "0%");
      }
      const targetEl = room.querySelector(".target");
      if (targetEl) {
        targetEl.classList.toggle("heating", shouldHeat);
      }
      const changeIcon = room.querySelector(".room-change-icon");
      if (changeIcon) {
        if (tempChangeDirection) {
          changeIcon.setAttribute(
            "icon",
            tempChangeDirection === "up" ? "mdi:chevron-up" : "mdi:chevron-down"
          );
          changeIcon.classList.add("active");
        } else {
          changeIcon.classList.remove("active");
        }
      }
    });
    if (suppressTransition) {
      requestAnimationFrame(() => {
        roomElements.forEach((room) => room.classList.remove("no-transition"));
        this._suppressHeatingTransition = false;
      });
    }
  }

  _fitRoomNames() {
    const names = this._rooms ? this._rooms.querySelectorAll(".name") : [];
    names.forEach((nameEl) => {
      const roomEl = nameEl.closest(".room");
      if (!roomEl) return;
      const maxWidth = roomEl.clientWidth * 0.9;
      if (!maxWidth) return;
      let size = parseFloat(getComputedStyle(nameEl).fontSize) || 12;
      while (size > 10 && nameEl.scrollWidth > maxWidth) {
        size -= 1;
        nameEl.style.fontSize = `${size}px`;
      }
    });
  }

  _clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }
}

customElements.define("home-climate-card", HomeClimateCard);

// Register card metadata for the Lovelace card picker
if (window?.customCards) {
  const exists = window.customCards.some((c) => c.type === "compact-power-card");
  if (!exists) {
    window.customCards.push({
      type: "home-climate-card",
      name: "Home Climate Card",
      preview: true,
      description: "Show your room temperatures / TRVs heating and hot water in a beautiful looking card.",
      documentationURL: "https://github.com/pacemaker82/Home-Climate-Card/blob/main/README.md",
    });
  }
} else if (window) {
  window.customCards = [
    {
      type: "home-climate-card",
      name: "Home Climate Card",
      preview: true,
      description: "Show your room temperatures / TRVs heating and hot water in a beautiful looking card.",
      documentationURL: "https://github.com/pacemaker82/Home-Climate-Card/blob/main/README.md",
    },
  ];
}
