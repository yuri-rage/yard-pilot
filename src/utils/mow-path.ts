import * as turf from '@turf/turf';
import { Feature, Polygon, FeatureCollection, LineString, Position } from 'geojson';

import { Visit } from '@/globals';
import { isPathClear } from '@/utils/boundaries';
import { calculateClearPath } from '@/utils/voronoi-roadmap';

const getRowCount = (coverageGrid: FeatureCollection): number => {
    const gridRows = new Set(
        coverageGrid.features
            .map((feature) => feature.properties?.gridRow)
            .filter((gridRow) => gridRow !== undefined)
    );

    return gridRows.size;
};

export const calculateMowPath = (
    path: Feature<LineString> | null,
    boundary: Feature<Polygon>,
    obstacles: FeatureCollection<Polygon> | null,
    roadmap: FeatureCollection<LineString> | null,
    coverageGrid: FeatureCollection<Polygon>
): Feature<LineString> | null => {
    // determine whether we need to start from scratch or continue from the existing path
    if (!path) {
        path = {
            type: 'Feature',
            geometry: {
                type: 'LineString',
                coordinates: [],
            },
            properties: {},
        };
    } else {
        const lastEndPoint = path.geometry.coordinates.slice(-1)[0];

        const unvisitedCells = coverageGrid.features.filter(
            (feature) => feature.properties?.visited === Visit.unvisited
        );
        if (unvisitedCells.length === 0) return path;

        // TODO: first unvisited cell may not be the best start point
        const newStartPoint = unvisitedCells[0].properties?.centroid;
        const pathToStart = calculateClearPath(
            roadmap as FeatureCollection<LineString>,
            lastEndPoint,
            newStartPoint,
            boundary,
            obstacles
        );
        if (!pathToStart) return path;
        path.geometry.coordinates = [...path.geometry.coordinates, ...pathToStart.geometry.coordinates];
    }

    const waypoints: Position[] = [];
    const rowCount = getRowCount(coverageGrid);

    // if no obstacles, we create an empty FeatureCollection to avoid errors
    if (!obstacles) obstacles = turf.featureCollection([]);
    // create a MultiPolygon from the boundary and obstacles
    const obstacleCoords = [turf.coordAll(obstacles)];
    const boundaryAndObstacles = turf.multiPolygon([boundary.geometry.coordinates, obstacleCoords]);

    for (let rowIndex = 0; rowIndex < rowCount; rowIndex++) {
        // Get cells in the current row
        const row = coverageGrid.features.filter(
            (feature) =>
                feature.properties?.gridRow === rowIndex && feature.properties?.visited === Visit.unvisited
        );
        if (row.length === 0) continue;

        // alternate reversing cell order to create a Boustrophedon pattern
        if (rowIndex % 2 === 1) {
            row.reverse();
        }

        let startIndex = -1;

        if (waypoints.length > 0) {
            const prevEndPoint = waypoints[waypoints.length - 1];
            for (let i = 0; i < row.length; i++) {
                const cell = row[i];
                const segment = turf.lineString([prevEndPoint, cell.properties?.centroid]);
                if (isPathClear(segment, boundaryAndObstacles)) {
                    waypoints.push(cell.properties?.centroid);
                    if (cell.properties) cell.properties.visited = Visit.visited;
                    startIndex = i;
                    break;
                }
            }
        } else {
            waypoints.push(row[0].properties?.centroid);
            if (row[0].properties) row[0].properties.visited = Visit.visited;
            startIndex = 0;
        }

        if (startIndex < 0) continue;

        // traverse the remainder of the row to find the end point of the row
        for (let i = startIndex + 1; i < row.length; i++) {
            const cell = row[i];
            const prevCell = row[i - 1];
            // non-consecutive cells indicate an obstacle in the row
            if (i > 0 && Math.abs(cell.properties?.gridCol - prevCell.properties?.gridCol) > 1) {
                waypoints.push(prevCell.properties?.centroid);
                break;
            } else if (
                coverageGrid.features.filter(
                    (feature) =>
                        feature.properties?.visited === Visit.unvisited &&
                        feature.properties?.gridRow === rowIndex - 1 &&
                        Math.abs(feature.properties?.gridCol - cell.properties?.gridCol) <= 1
                ).length >= 2
            ) {
                // unvisited adjacent cells indicates nearby unvisited areas
                waypoints.push(cell.properties?.centroid);
                if (cell.properties) cell.properties.visited = Visit.visited;
                path.geometry.coordinates = [...path.geometry.coordinates, ...waypoints];
                return path;
            } else if (i === row.length - 1) {
                // if we've reached the end of the row, add the last cell to the waypoints
                waypoints.push(cell.properties?.centroid);
            }
            if (cell.properties) cell.properties.visited = Visit.visited;
        }
        // TODO: better algorithm for identifying unvisited regions
    }

    path.geometry.coordinates = [...path.geometry.coordinates, ...waypoints];
    return path;
};

/**
 * Prunes excess points from the given path.
 * @param path The path to prune.
 * @param pruneDistance The maximum distance between consecutive points.
 * @returns The pruned path.
 */
export const pruneExcessPoints = (
    path: Feature<LineString> | null,
    pruneDistance: number
): Feature<LineString> | null => {
    if (!path) return null;
    const prunedCoordinates = path.geometry.coordinates.reduce<Position[]>((acc, cur) => {
        if (acc.length === 0) {
            acc.push(cur);
        } else {
            const lastCoord = acc[acc.length - 1];
            const distance = turf.distance(lastCoord, cur, { units: 'meters' });
            if (distance > pruneDistance) {
                acc.push(cur);
            }
        }
        return acc;
    }, [])
    
    return turf.lineString(prunedCoordinates);
};