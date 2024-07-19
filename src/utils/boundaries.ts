import * as turf from '@turf/turf';
import { Feature, FeatureCollection, LineString, MultiPolygon, Polygon } from 'geojson';


/* boundaries.ts
 * implements convex hull and minimum bounding box (MBB) algorithms from
 * https://link.springer.com/article/10.1007/s41315-021-00199-8
 *
 * favors turf.js methods over UTM projections
 */

/**
 * Checks if the segment does not intersect any polygons in the given collection.
 * @param {Feature<LineString>} segment
 * @param {Feature<MultiPolygon>} polygonsToAvoid
 * @returns {boolean} True if segment is clear, otherwise false
 */
export const isPathClear = (
    segment: Feature<LineString>,
    polygonsToAvoid: Feature<MultiPolygon>
): boolean => {
    return turf.lineSplit(segment, polygonsToAvoid).features.length === 0;
};

/**
 * Calculate the convex hull of a boundary
 * @param {Feature<Polygon>} boundary GeoJSON polygon as a GeoJsonConverter object.
 * @returns {Feature<Polygon>} convex hull.
 */
export const getConvexHull = (boundary: Feature<Polygon>): Feature<Polygon> | null => {
    const convexHull = turf.convex(boundary);
    return convexHull;
};

/**
 * Calculate the minimum bounding box of a convex hull using the rotating calipers algorithm
 * @param {Feature<Polygon>} convexHull GeoJSON polygon as a GeoJsonConverter object.
 * @returns {Feature<Polygon>} minimum bounding box (MBB).
 */
export const getMinBoundingBox = (convexHull: Feature<Polygon>, orientation: number): Feature<Polygon> => {
    const hull = convexHull.geometry.coordinates[0];
    const numPoints = hull.length - 1; // last point is the same as the first
    const centroid = turf.centroid(convexHull);

    let minArea = Infinity;
    let bestBoundingBox: Polygon | null = null;
    let angle = 0;

    // rotate the convex hull along each edge and find the smallest bounding box
    for (let i = 0; i < numPoints; i++) {
        const currentPoint = turf.point(hull[i]);
        const nextPoint = turf.point(hull[(i + 1) % numPoints]);

        angle = turf.bearing(currentPoint, nextPoint);
        const rotatedHull = turf.transformRotate(convexHull, -angle, { pivot: centroid });
        const bbox = turf.bboxPolygon(turf.bbox(rotatedHull));
        const bboxArea = turf.area(bbox);

        if (bboxArea < minArea) {
            minArea = bboxArea;
            bestBoundingBox = turf.transformRotate(bbox.geometry, angle, { pivot: centroid });
        }
    }

    if (orientation > 0) {
        const rotatedHull = turf.transformRotate(convexHull, -(angle + orientation), { pivot: centroid });
        const bbox = turf.bboxPolygon(turf.bbox(rotatedHull));
        bestBoundingBox = turf.transformRotate(bbox.geometry, angle + orientation, { pivot: centroid });
    }

    if (bestBoundingBox === null) {
        throw new Error('Unable to calculate minimum bounding box');
    }

    return turf.polygon(bestBoundingBox.coordinates);
};

/**
 * Clips intersecting obstacles from boundary.
 * @param {Feature<Polygon>} boundary
 * @param {FeatureCollection<Polygon>|null} obstacles
 * @returns {Feature<Polygon>|null} altered boundary.
 */
export const differenceObstaclesFromBoundary = (
    boundary: Feature<Polygon>,
    obstacles: FeatureCollection<Polygon> | null
): Feature<Polygon> | null => {
    if (!obstacles) return boundary;

    const intersectingObstacles = obstacles.features.filter(
        (obstacle) => !turf.booleanWithin(obstacle, boundary)
    );

    // if there are no intersecting obstacles, return the boundary
    if (intersectingObstacles.length === 0) return boundary;

    // otherwise, clip the intersecting obstacles from the boundary
    const boundaryFC = turf.featureCollection([boundary, ...intersectingObstacles]);
    const diff = turf.difference(boundaryFC as FeatureCollection<Polygon>);
    return diff as Feature<Polygon> | null;
};

/**
 * Removes obstacles that are outside of the boundary.
 * @param {Feature<Polygon>} boundary
 * @param {FeatureCollection<Polygon>|null} obstacles
 * @returns {FeatureCollection<Polygon>|null} obstacles fully contained within the boundary.
 */
export const removeOrphanedObstacles = (
    boundary: Feature<Polygon>,
    obstacles: FeatureCollection<Polygon> | null
): FeatureCollection<Polygon> | null => {
    if (!obstacles) return null;

    const containedObstacles = obstacles.features.filter((obstacle) =>
        turf.booleanWithin(obstacle, boundary)
    );

    return {
        type: 'FeatureCollection',
        features: containedObstacles,
    };
};