# Home Climate Card

![GitHub Downloads (all assets, all releases)](https://img.shields.io/github/downloads/pacemaker82/home-climate-card/total?label=Total%20Downloads) ![GitHub Downloads (all assets, latest release)](https://img.shields.io/github/downloads/pacemaker82/home-climate-card/latest/total?label=Latest%20Version)

<img width="999" height="310" alt="Screenshot 2025-12-22 at 13 07 14" src="https://github.com/user-attachments/assets/40aff459-068e-4410-9c78-d3f2a02a4a66" />

Custom Lovelace card that renders rooms on floors with current/target temperature,
heating state, and an optional top labels strip. Built to complement home assistant's climate entities.

## Key Functionality

- Each room can show a climate or temperature entity
- When the heating is on for any room, rooms on the same circuit will also show heating (unless climate entity is off). E.g. you have a room that has a temperature sensor, a radiator, but not smart heating.
- You can set a room to have no heating source if you just want to show the temperature (like attic).
- You can add rooms to different heating circuits.
- Rooms are spread over floors, and show up in the UI as such. 
- Rooms are organised on floors by circuits, then by the order you add in the config.

## Install

1. Goto HACS (if you dont have that installed, install HACS)
2. Add a custom repository
3. Add the URL to this repo: `https://github.com/pacemaker82/Home-Climate-Card` using the category `Dashboard` (used to be `Lovelace` pre HACS 2.0.0)
4. Go back to HACS and search for "compact power card" in the HACS store
5. Download and refresh
6. Goto dashboard, edit dashboard, select 'add card' button, and add the new custom Compact Power Card. Use the configuration below to setup.

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

# Configuration

## Card-level options

- `entities` (required): list of room entries (see below).
- `labels`: list of label entries for the top strip (optional).

## Room entry (`entities` list)

```yaml
entities:
  - entity: climate.living_room
    floor: 1
    circuit: 1
    name: Living Room
    no_heat_source: false
    is_heating_entity: binary_sensor.living_room_heat_call
```

- `entity` (required): climate or temperature entity that represents "a room".
- `floor`: Which floor is the entity on. Default `1` for ground.
- `circuit`: Default `1`. If you have heating on different circuits make sure to set this appropriately.
- `name`: Label override for the room. Falls back to entity friendly name.
- `no_heat_source`: if `true`, suppresses heating visuals for this room.
- `is_heating_entity`: optional binary_sensor used to detect heating when not using a climate sensor.

### Understanding Floors

By default, a floor of "1" is set on entity's that don't configure it. This means all rooms will render on the same floor (row) in the UI. Setting a floor number will render the room in different rows in the UI, lowest to highest. This allows you to create a visual representation of your rooms on floors from basement to attic and anything in between. There is no limit on floors.

### Understanding Circuits

Heating is not always on the same circuit, a good example can be underfloor heating in a certain room/s. The card lets you add climate and temperature entities on the same circuit to further group heating entities together. This allows you to see if rooms are heating that dont have a climate entity, because that circuit is being heated elsewhere. 

E.g. Room 1 has smart TRV with climate entity, Room 2 has radiator with simple temperature sensor. If both are on the same circuit, Room 2 will show as "heating" if Room 1 climate entity triggers the heating. 

To override this functionality, either set the room to a random circuit number e.g. `999` or set `no_heat_source: true` on the entity.

## Label entry (`labels` list)

Each label renders an icon + name + state + optional secondary line. You can show a max of 3 labels.

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
