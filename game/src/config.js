// Sunport Chase — shared tuning constants for the whole game.
// World geometry, movement speeds, wanted-level thresholds and colours live here so the
// other modules (world, traffic, police, missions, render) all agree on the same numbers.

export const WORLD_W = 2600;
export const WORLD_H = 1800;

// Road centrelines. Vertical roads run north-south, horizontal roads east-west; the grid
// they form is the road network traffic and police drive on.
export const V_ROADS = [260, 700, 1140, 1580, 2020];
export const H_ROADS = [260, 700, 1140, 1540];
export const ROAD_W = 96;
export const ROAD_HALF = ROAD_W / 2;

// The sea sits along the east edge: sand first, then water the player cannot enter.
export const SAND_X = 2280;
export const WATER_X = 2380;
export const HARBOUR = { x: 2330, y: 1140 };

export const STEP = 1 / 60;

export const WALK_SPEED = 138;
export const SPRINT_SPEED = 218;
export const PLAYER_RADIUS = 11;

export const CAR_LENGTH = 46;
export const CAR_WIDTH = 22;
export const CAR_ACCEL = 300;
export const CAR_MAX_SPEED = 430;
export const CAR_MAX_REVERSE = 130;
export const CAR_TURN = 2.6;

// Wanted heat: crimes add heat, stars are read off the thresholds, hiding drains it.
export const HEAT_THRESHOLDS = [1, 26, 56, 96, 146];
export const HEAT_STEAL = 14;
export const HEAT_HIT_PED = 22;
export const HEAT_HIT_CAR = 9;
export const HEAT_DECAY = 4.2;
export const BUST_PIN_TIME = 1.6;

export const SAVE_KEY = 'sunport-chase-save-v1';

export const COLORS = {
  ground: '#a8a294',
  sidewalk: '#c9c2ae',
  road: '#3a3f46',
  roadLine: '#e8e4d2',
  sand: '#eed9a0',
  water: '#2e9bc6',
  waterDeep: '#2382ab',
  player: '#ffb52e',
  cash: '#39d353',
};

export const CAR_COLORS = ['#d94f3d', '#3d7bd9', '#f2f0e6', '#39b56a', '#e8b13c', '#8a63d2', '#e2703a', '#4fb8b0'];
export const BUILDING_COLORS = ['#e8d8b0', '#dfa08a', '#a8c8e0', '#f0e6cc', '#d8b4c8', '#b5d6a0', '#eac9a0', '#c0d4e8'];
