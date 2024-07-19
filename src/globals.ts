import { signal } from '@preact/signals-core';
import { effect, Signal } from '@preact/signals-react';
import { Feature, FeatureCollection, LineString, Polygon } from 'geojson';

// TODO: remove debugGeoJSON global for production
export const debugGeoJSON: Signal<any | null> = signal<any | null>(null);

type UserSettings = {
    laneWidth: number;
    obstacleMargin: number; // The margin around obstacles. (TODO: implement this)
    circleTargetSegmentLength: number;
    circleMinSegmentCount: number;
    units: 'imperial' | 'metric';
    showBoundary: boolean;
    showObstacles: boolean;
    showConvexHull: boolean;
    showMinBoundingBox: boolean;
    showCoverageGrid: boolean;
    showVoronoiRoadmap: boolean;
    showMowPath: boolean;
};

/**
 * Default user settings.
 * @type {UserSettings}
 */
export const DEFAULT_USER_SETTINGS: UserSettings = {
    laneWidth: 1,
    obstacleMargin: 0,
    circleTargetSegmentLength: 2.5,
    circleMinSegmentCount: 8,
    units: 'imperial',
    showBoundary: true,
    showObstacles: true,
    showConvexHull: false,
    showMinBoundingBox: false,
    showCoverageGrid: false,
    showVoronoiRoadmap: false,
    showMowPath: true,
};

/**
 * Converts a value to user units (either metric or imperial).
 * @param {number} value The value to convert.
 * @returns {number} The converted value.
 */
export const toUserUnits = (value: number): number =>
    userSettings.value.units === 'metric' ? value : value * 3.28084;

/**
 * Converts a value from user units (either metric or imperial).
 * @param {number} value The value to convert.
 * @returns {number} The converted value.
 */
export const fromUserUnits = (value: number): number =>
    userSettings.value.units === 'metric' ? value : value / 3.28084;

/**
 * Enumeration of visited states.
 * @property {number} 0 = unvisited, 0.5 = visited, 1 = unvisitable
 */
export const Visit = {
    unvisited: 0,
    visited: 0.5,
    unvisitable: 1,
};

/**
 * Retrieves an object from local storage by key.
 * @param {string} key The key of the item in localStorage.
 * @returns {Object|null} The retrieved object, or null if not found.
 */
export const getLocalStorageObject = <T>(key: string): T | null => {
    const item = localStorage.getItem(key);
    return item ? (JSON.parse(item) as T) : null;
};

/**
 * User  settings (stored in local storage).
 * @type {Signal\<UserSettings\>}
 * @property {number} laneWidth Width of the lane (mower deck width minus overlap margin).
 * @property {number} obstacleMargin The margin around obstacles.
 * @property {number} circleTargetSegmentLength The target segment length for circles.
 * @property {number} circleMinSegmentCount The minimum number of segments for circles.
 * @property {'imperial' | 'metric'} units The units to use.
 * @property {boolean} showBoundary Whether to show the boundary.
 * @property {boolean} showObstacles Whether to show the obstacles.
 * @property {boolean} showConvexHull Whether to show the convex hull.
 * @property {boolean} showMinBoundingBox Whether to show the minimum bounding box (MBB).
 * @property {boolean} showCoverageGrid Whether to show the coverage grid.
 * @property {boolean} showVoronoiRoadmap Whether to show the Voronoi roadmap.
 */
export const userSettings: Signal<UserSettings> = signal<UserSettings>(
    getLocalStorageObject<UserSettings>('userSettings') || DEFAULT_USER_SETTINGS
);

/**
 * Boundary of the area for path planning (as uploaded by user).
 * @type {Signal\<Feature\<Polygon\>|null\>}
 */
export const rawBoundary: Signal<Feature<Polygon> | null> = signal<Feature<Polygon> | null>(
    getLocalStorageObject<Feature<Polygon>>('boundary')
);

/**
 * Boundary altered by obstacle intersections.
 * @type {Signal\<Feature\<Polygon\>|null\>}
 */
export const boundary: Signal<Feature<Polygon> | null> = signal<Feature<Polygon> | null>(null);

/**
 * Obstacles (geofences) to avoid when planning paths (as uploaded by user).
 * @type {Signal\<FeatureCollection\<Polygon\>\>|null\>}
 */
export const rawObstacles: Signal<FeatureCollection<Polygon> | null> =
    signal<FeatureCollection<Polygon> | null>(getLocalStorageObject<FeatureCollection<Polygon>>('obstacles'));

/**
 * Obstacles (geofences) to avoid when planning paths (minus obstacles that intersect with boundary).
 * @type {Signal\<FeatureCollection\<Polygon\>\>|null\>}
 */
export const obstacles: Signal<FeatureCollection<Polygon> | null> = signal<FeatureCollection<Polygon> | null>(
    null
);

/**
 * Convex hull around boundary.
 * @type {Signal\<Feature\<Polygon\>|null\>}
 */
export const convexHull: Signal<Feature<Polygon> | null> = signal<Feature<Polygon> | null>(null);

/**
 * Minimum bounding box (MBB) around boundary.
 * @type {Signal\<Feature\<Polygon\|null\>}
 */
export const minBoundingBox: Signal<Feature<Polygon> | null> = signal<Feature<Polygon> | null>(null);

/**
 * Coverage grid for the area.
 * @type {Signal\<FeatureCollection\<Polygon\>\>|null\>}
 */
export const coverageGrid: Signal<FeatureCollection<Polygon> | null> =
    signal<FeatureCollection<Polygon> | null>(null);

/**
 * Voronoi paths within boundary.
 * @type {Signal\<FeatureCollection\<LineString\>|null\>}
 */
export const voronoiPaths: Signal<FeatureCollection<LineString> | null> = signal<FeatureCollection<LineString> | null>(null);

/**
 * Generated path for mowing.
 * @type {Signal\<Feature\<LineString\>|null\>}
 */
export const mowPath: Signal<Feature<LineString> | null> = signal<Feature<LineString> | null>(null);

/**
 * Markers along the generated path indicating direction of travel
 * @type {Signal\<FeatureCollection|null\>}
 */
export const pathMarkers: Signal<FeatureCollection | null> = signal<FeatureCollection | null>(null);

export const startPoint: Signal<number> = signal<number>(0);
export const mbbOrientation: Signal<number> = signal<number>(0);
/**
 * Predominant travel direction (heading) of the generated path.
 * @type {Signal\<number\>}
 */
export const travelHeading: Signal<number> = signal<number>(0);

/**
 * Signal based effect to update user settings when they change.
 */
effect(() => {
    if (Object.keys(userSettings.value).length === 0) {
        userSettings.value = DEFAULT_USER_SETTINGS;
    }
    localStorage.setItem('userSettings', JSON.stringify(userSettings.value));
});
