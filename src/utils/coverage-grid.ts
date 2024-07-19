import * as turf from '@turf/turf';
import { Feature, Polygon, FeatureCollection } from 'geojson';

import { Visit } from '@/globals';

/* coverage-grid.ts
 * implements coverage grid algorithm from
 * https://link.springer.com/article/10.1007/s41315-021-00199-8
 *
 * favors turf.js methods over UTM projections
 */

/**
 * Calculates the coverage grid for the area.
 * @param {Feature<Polygon>} boundary bounding polygon.
 * @param {FeatureCollection|null} obstacles collection of obstacle polygons.
 * @param {Feature<Polygon>} mbb minimum bounding box (MBB) polygon.
 * @param {number} laneWidth Width of the lane (mower deck width minus overlap margin).
 * @param {number} startPoint (0-3) index of MBB corner from which to start the coverage grid.
 * @returns {FeatureCollection} coverage grid aligned to the MBB, starting at one of four corners.
 */
export const getCoverageGrid = (
    boundary: Feature<Polygon>,
    obstacles: FeatureCollection<Polygon> | null,
    mbb: Feature<Polygon>,
    laneWidth: number,
    startPoint: number
): FeatureCollection<Polygon> => {
    const mbbPolygon = mbb as Feature<Polygon>;
    // a 1cm buffer seems to preclude some floating point precision issues when
    // creating the coverage grid (avoids accidental boundary intersections)
    const boundaryPolygon = turf.buffer(boundary, -0.01, { units: 'meters' }) as Feature<Polygon>;
    const obstaclesPolygons = obstacles ? obstacles.features : [];

    const p1 = mbbPolygon.geometry.coordinates[0][0];
    const p2 = mbbPolygon.geometry.coordinates[0][1];

    const angle = turf.bearing(p1, p2);
    const centroid = turf.centroid(mbb as Feature<Polygon>);
    const rotatedMbb = turf.transformRotate(mbbPolygon, -angle + 90 * startPoint, { pivot: centroid });
    const rotatedMbbBoundingBox = turf.bbox(rotatedMbb);
    const grid = turf.squareGrid(rotatedMbbBoundingBox, laneWidth, {
        units: 'meters',
    }) as FeatureCollection<Polygon>;

    let rowIndex = 0;
    let colIndex = 0;
    for (let i = 0; i < grid.features.length; i++) {
        const cellCentroid = turf.centroid(grid.features[i]).geometry.coordinates;

        if (i > 0) {
            const previousCentroid = turf.centroid(grid.features[i - 1]).geometry.coordinates;
            if (cellCentroid[0] !== previousCentroid[0]) {
                rowIndex++;
                colIndex = 0;
            } else {
                colIndex++;
            }
        }

        grid.features[i].properties = {
            ...grid.features[i].properties,
            gridRow: rowIndex,
            gridCol: colIndex,
        };
    }

    const alignedGrid = turf.transformRotate(grid, angle - 90 * startPoint, { pivot: centroid });

    const markedGridFeatures = alignedGrid.features.map((feature) => {
        const cellPolygon = feature.geometry as Polygon;
        let visitState = Visit.unvisitable;

        const cellFeature = turf.feature(cellPolygon);
        const cellCentroid = turf.centroid(cellFeature);

        if (turf.booleanContains(boundaryPolygon, cellCentroid)) {
            visitState = Visit.unvisited;
            for (let obstacle of obstaclesPolygons) {
                //if (turf.booleanIntersects(obstacle, cellFeature)) {
                if (turf.booleanContains(obstacle, cellCentroid)) {
                    visitState = Visit.unvisitable;
                    break;
                }
            }
        }

        return {
            type: 'Feature',
            geometry: cellPolygon,
            properties: {
                ...feature.properties,
                visited: visitState,
                centroid: cellCentroid.geometry.coordinates,
            },
        };
    });

    const markedGrid: FeatureCollection<Polygon> = {
        type: 'FeatureCollection',
        features: markedGridFeatures.map((feature) => ({
            ...feature,
            type: 'Feature' as const,
        })),
    };

    return markedGrid;
};

export const getTravelHeading = (coverageGrid: FeatureCollection<Polygon>): number => {
    if (!coverageGrid) return 0;
    const row = coverageGrid.features.filter((feature) => feature.properties?.gridRow === 0);
    const startCell = row[0];
    const endCell = row[row.length - 1];
    const bearing = turf.bearing(turf.centroid(startCell), turf.centroid(endCell));
    return bearing < 0 ? bearing + 360 : bearing;
};
