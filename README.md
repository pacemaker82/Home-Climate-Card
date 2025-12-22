# Home Climate Card

Custom Lovelace card that renders rooms on floors with current/target temperature,
heating state, and an optional top labels strip.

## Install

1) Place `home-climate-card.js` in your `www/` directory.
2) Add it as a resource in Lovelace:
   ```yaml
   resources:
     - url: /local/home-climate-card.js
       type: module
   ```

## Basic usage

```yaml
type: custom:home-climate-card
entities:
  - entity: climate.living_room
    floor: 1
    circuit: 1
    name: Living Room
  - entity: climate.bedroom
    floor: 2
    circuit: 2
    name: Bedroom
```

## Configuration

### Card-level options

- `entities` (required): list of room entries (see below).
- `labels`: list of label entries for the top strip (optional).
- `canvas_width`: number in px. If set, fixes card width.
- `canvas_height`: number in px. If set, fixes card height.
- `canvas_size`: number in px. If set, applies to both width and height.
- `minimum_threshold_temperature`: number, default `16`.
- `maximum_threshold_temperature`: number, default `20`.
- `minimum_threshold_color`: RGB array, default `[87, 113, 151]`.
- `maximum_threshold_color`: RGB array, default `[241, 157, 56]`.

### Room entry (`entities` list)

```yaml
entities:
  - entity: climate.living_room
    floor: 1
    circuit: 1
    name: Living Room
    no_heat_source: false
    is_heating_entity: binary_sensor.living_room_heat_call
```

- `entity` (required): climate or temperature entity.
- `floor`: number used for grouping (higher floors render first). Default `1`.
- `circuit`: number used to share heating state across non-climate sensors. Default `1`.
- `name`: label override. Falls back to entity friendly name.
- `no_heat_source`: if `true`, suppresses heating visuals for this room.
- `is_heating_entity`: optional binary_sensor used to detect heating.

### Label entry (`labels` list)

Each label renders an icon + name + state + optional secondary line.

```yaml
labels:
  - entity: binary_sensor.heating_on_off
    icon: mdi:radiator
    name: Heating
    secondary: last_updated
  - entity: sensor.outside_temperature
    icon: mdi:weather-partly-cloudy
    name: Outside
  - entity: binary_sensor.hot_water_on_off
    icon: mdi:water-boiler
    name: Hot Water
    secondary: sensor.hot_water_on_minutes
    secondary_name: Total Time
```

- `entity` (required): entity to display.
- `icon`: icon override (defaults to entity icon when available).
- `name`: label title (defaults to entity friendly name).
- `secondary`: `last_updated` or another entity id.
- `secondary_name`: prefix text for the secondary line (e.g., `Total Time`).

Notes:
- Numeric values are shown with up to 2 decimals (trailing zeros trimmed).
- The icon color changes to `var(--state-climate-heat-color)` when the entity state is `on`.
- Label layout:
  - 1 label: full-width center.
  - 2 labels: left and right slots.
  - 3 labels: left, center, right.

## Full example

```yaml
type: custom:home-climate-card
canvas_size: 480
minimum_threshold_temperature: 16
maximum_threshold_temperature: 20
minimum_threshold_color: [87, 113, 151]
maximum_threshold_color: [241, 157, 56]
entities:
  - entity: climate.living_room
    floor: 1
    circuit: 1
    name: Living Room
  - entity: sensor.kitchen_temperature
    floor: 1
    circuit: 1
    name: Kitchen
    is_heating_entity: binary_sensor.kitchen_heat_call
labels:
  - entity: binary_sensor.heating_on_off
    icon: mdi:radiator
    name: Heating
    secondary: last_updated
  - entity: sensor.outside_temperature
    icon: mdi:weather-partly-cloudy
    name: Outside
  - entity: binary_sensor.hot_water_on_off
    icon: mdi:water-boiler
    name: Hot Water
    secondary: sensor.hot_water_on_minutes
    secondary_name: Total Time
```
