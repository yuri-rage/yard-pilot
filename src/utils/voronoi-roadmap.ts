import * as turf from '@turf/turf';
import { Feature, Polygon, FeatureCollection, LineString, Position, Point } from 'geojson';

import { isPathClear } from '@/utils/boundaries';

/* voronoi-roadmap.ts
 * generates a Voronoi roadmap from a boundary and obstacles
 * for use in the B-RV algorithm from
 * https://link.springer.com/article/10.1007/s41315-021-00199-8
 *
 * there is a lot of iteration and even nested iteration in this
 * implementation, so there is surely room for optimization
 *
 * Open to pull requests or suggestions for obvious improvements -- Yuri
 */

// float precision seems to have a significant impact on proper detection of overlapping segments
// and branch points - 6 digits seems to be the "magic" number for good results
const FIXED_PRECISION = 6;

/**
 * Generates a unique key for a segment to be used in a Set.
 * @param segmentCoords The coordinates of the segment.
 * @returns A string key representing the segment.
 */
const getSegmentKey = (segmentCoords: [Position, Position]): string => {
    const sortedCoords = segmentCoords.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    return JSON.stringify(sortedCoords.map((coord) => coord.map((value) => value.toFixed(FIXED_PRECISION))));
};

/**
 * Checks if the segment intersects with any obstacle features.
 * @param {Feature<LineString>} segment
 * @param {FeatureCollection} obstacles
 * @returns {boolean} True if intersects, otherwise false
 */
const isIntersectingObstacles = (segment: Feature<LineString>, obstacles: FeatureCollection): boolean => {
    for (const obstacle of obstacles.features) {
        if (turf.booleanDisjoint(segment, obstacle) === false) {
            return true;
        }
    }
    return false;
};

/**
 * Generates unique Voronoi points for the given boundary and obstacles.
 * @param {Feature<Polygon>} boundary
 * @param {FeatureCollection<Polygon>} obstacles
 * @returns {FeatureCollection<Point>} The generated Voronoi points.
 */
const getVoronoiPoints = (
    boundary: Feature<Polygon>,
    obstacles: FeatureCollection<Polygon>
): FeatureCollection<Point> => {
    const points = [...turf.coordAll(boundary), ...turf.coordAll(obstacles)];
    const voronoiPoints = turf.featureCollection([]) as FeatureCollection<Point>;

    const uniquePointsSet = new Set<string>();

    points.forEach((point) => {
        const key = point.map((coord) => coord.toFixed(FIXED_PRECISION)).join(',');
        if (!uniquePointsSet.has(key)) {
            uniquePointsSet.add(key);
            voronoiPoints.features.push(turf.point(point));
        }
    });

    return voronoiPoints;
};

/**
 * Calculates the Voronoi roadmap within the given boundary and around obstacles.
 * @returns {FeatureCollection<LineString>} The resulting Voronoi roadmap as a GeoJSON FeatureCollection.
 */
export const calculateVoronoiRoadmap = (
    boundary: Feature<Polygon>,
    obstacles: FeatureCollection<Polygon> | null
): FeatureCollection<LineString> => {
    // if no obstacles, we create an empty FeatureCollection to avoid errors
    if (!obstacles) obstacles = turf.featureCollection([]);

    // generate Voronoi polygons
    const voronoiPoints = getVoronoiPoints(boundary, obstacles);
    const voronoiPolygons = turf.voronoi(voronoiPoints, { bbox: turf.bbox(boundary) });

    // if Voronoi polygons are empty, return the boundary as a linestring
    if (!voronoiPolygons) {
        return turf.featureCollection([turf.polygonToLine(boundary) as Feature<LineString>]);
    }

    // clip Voronoi polygons to boundary and remove segments that intersect with obstacles
    const segments: Feature<LineString>[] = [];
    const segmentSet = new Set<string>();

    voronoiPolygons.features.forEach((polygon) => {
        // if polygon intersects with boundary, clip it to boundary
        if (!turf.booleanDisjoint(boundary, polygon)) {
            polygon = turf.intersect(turf.featureCollection([polygon, boundary])) as Feature<Polygon>;
        }

        const coordinates: Position[] = polygon.geometry.coordinates[0];

        // add only unique segments that do not intersect with obstacles
        for (let i = 0; i < coordinates.length - 1; i++) {
            const segmentCoords = [coordinates[i], coordinates[i + 1]] as [Position, Position];
            const segment = turf.lineString(segmentCoords);

            // skip segments that intersect with obstacles
            if (isIntersectingObstacles(segment, obstacles)) continue;

            // ensure uniqueness of valid segments
            const segmentKey = getSegmentKey(segmentCoords);
            if (segmentSet.has(segmentKey)) continue;

            segments.push(segment);
            segmentSet.add(segmentKey);
        }
    });

    // collection of individual, disjoint segments
    const segmentFC = turf.featureCollection(segments);

    // identify branch points (like road junctions)
    const branchPoints = identifyBranchPoints(segmentFC);

    // join segments that connect any pair of branch points to create the roadmap
    const joinedSegments = joinSegments(segmentFC, branchPoints);
    return joinedSegments;
};

/**
 * Identifies branch points (like road junctions) in the given segment feature collection.
 * @param segments The segment feature collection.
 * @returns A set of branch point keys.
 */
const identifyBranchPoints = (segments: FeatureCollection<LineString>): Set<string> => {
    const pointMap: { [key: string]: number } = {};
    const branchPointKeys = new Set<string>();

    segments.features.forEach((segment) => {
        const [start, end] = segment.geometry.coordinates;
        const startKey = JSON.stringify(start.map((value) => value.toFixed(FIXED_PRECISION)));
        const endKey = JSON.stringify(end.map((value) => value.toFixed(FIXED_PRECISION)));

        pointMap[startKey] = (pointMap[startKey] || 0) + 1;
        if (pointMap[startKey] > 2) {
            branchPointKeys.add(startKey);
        }

        pointMap[endKey] = (pointMap[endKey] || 0) + 1;
        if (pointMap[endKey] > 2) {
            branchPointKeys.add(endKey);
        }
    });
    return branchPointKeys;
};

/**
 * Joins contiguous segments that connect any pair of branch points.
 * @param segments The segment feature collection.
 * @param branchPoints The set of branch point keys.
 * @returns A new FeatureCollection<LineString> with conjoined paths.
 */
const joinSegments = (
    segments: FeatureCollection<LineString>,
    branchPoints: Set<string>
): FeatureCollection<LineString> => {
    const connectedSegments: Feature<LineString>[] = [];
    const adjacencyList: Map<string, Feature<LineString>[]> = new Map();

    segments.features.forEach((segment) => {
        const [start, end] = segment.geometry.coordinates;
        const startKey = JSON.stringify(start.map((value) => value.toFixed(FIXED_PRECISION)));
        const endKey = JSON.stringify(end.map((value) => value.toFixed(FIXED_PRECISION)));

        if (!adjacencyList.has(startKey)) {
            adjacencyList.set(startKey, []);
        }
        if (!adjacencyList.has(endKey)) {
            adjacencyList.set(endKey, []);
        }

        adjacencyList.get(startKey)!.push(segment);
        adjacencyList.get(endKey)!.push(segment);
    });

    const visitedSegments = new Set<string>();

    branchPoints.forEach((branchKey) => {
        const initialCoord = JSON.parse(branchKey).map(Number) as Position;
        const stack: { key: string; path: Position[] }[] = [{ key: branchKey, path: [initialCoord] }];

        while (stack.length > 0) {
            const { key, path } = stack.pop()!;
            const edges = adjacencyList.get(key) || [];
            for (const edge of edges) {
                const [start, end] = edge.geometry.coordinates;
                const startKey = JSON.stringify(start.map((value) => value.toFixed(FIXED_PRECISION)));
                const endKey = JSON.stringify(end.map((value) => value.toFixed(FIXED_PRECISION)));
                const edgeKey = getSegmentKey([start, end]);

                if (visitedSegments.has(edgeKey)) continue;
                visitedSegments.add(edgeKey);

                const nextKey = key === startKey ? endKey : startKey;
                const newPath = key === startKey ? [...path, end] : [...path, start];

                if (branchPoints.has(nextKey)) {
                    connectedSegments.push(turf.lineString(newPath));
                } else {
                    stack.push({ key: nextKey, path: newPath });
                }
            }
        }
    });

    return turf.featureCollection(connectedSegments);
};

/**
 * Generates an adjacency graph from a Voronoi FeatureCollection<LineString>.
 * @param voronoiRoadmap The Voronoi FeatureCollection<LineString>.
 * @returns An adjacency graph represented as a Map.
 * Each key is a node and each value is a list of objects containing connected nodes and their
 * respective distances.
 */
export const calculateAdjacencyGraph = (
    voronoiRoadmap: FeatureCollection<LineString>
): Map<string, { node: string; distance: number; path: Feature<LineString> }[]> => {
    const adjacencyGraph = new Map<string, { node: string; distance: number; path: Feature<LineString> }[]>();
    voronoiRoadmap.features.forEach((road) => {
        const start = road.geometry.coordinates[0];
        const end = road.geometry.coordinates[road.geometry.coordinates.length - 1];
        const startKey = JSON.stringify(start.map((value) => value.toFixed(FIXED_PRECISION)));
        const endKey = JSON.stringify(end.map((value) => value.toFixed(FIXED_PRECISION)));

        const distance = turf.length(road, { units: 'meters' });

        if (!adjacencyGraph.has(startKey)) {
            adjacencyGraph.set(startKey, []);
        }
        if (!adjacencyGraph.has(endKey)) {
            adjacencyGraph.set(endKey, []);
        }

        // bi-directional graph representation with distances and coordinates
        adjacencyGraph.get(startKey)!.push({ node: endKey, distance: distance, path: road });
        const reversed = [...road.geometry.coordinates].reverse() as Position[];
        const reversedRoad = turf.lineString(reversed);
        adjacencyGraph.get(endKey)!.push({ node: startKey, distance: distance, path: reversedRoad });
    });

    return adjacencyGraph;
};

export const getDijkstraPath = (
    graph: Map<string, { node: string; distance: number; path: Feature<LineString> }[]>,
    start: Position,
    end: Position
): Feature<LineString> | null => {
    const startKey = JSON.stringify(start.map((value) => value.toFixed(FIXED_PRECISION)));
    const endKey = JSON.stringify(end.map((value) => value.toFixed(FIXED_PRECISION)));

    if (!graph.has(startKey) || !graph.has(endKey)) {
        console.log('Invalid nodes for Dijkstra');
        return null;
    }

    const distances = new Map<string, number>();
    const previous = new Map<string, { node: string; path: Feature<LineString> } | null>();
    const pq: [string, number][] = [];

    graph.forEach((_value, node) => {
        distances.set(node, Infinity);
        previous.set(node, null);
    });

    distances.set(startKey, 0);
    pq.push([startKey, 0]);

    while (pq.length > 0) {
        pq.sort((a, b) => a[1] - b[1]);
        const [currentNode] = pq.shift()!;
        const currentDistance = distances.get(currentNode)!;

        if (currentNode === endKey) {
            const fullPath: Position[] = [];
            let node = endKey;

            while (node) {
                const prev = previous.get(node);
                if (!prev) break;

                const pathSegment = prev.path.geometry.coordinates;
                fullPath.unshift(...pathSegment);

                node = prev.node;
            }

            return turf.lineString(fullPath);
        }

        graph.get(currentNode)!.forEach(({ node: neighbor, distance, path }) => {
            const totalDistance = currentDistance + distance;

            if (totalDistance < distances.get(neighbor)!) {
                distances.set(neighbor, totalDistance);
                previous.set(neighbor, { node: currentNode, path });
                pq.push([neighbor, totalDistance]);
            }
        });
    }

    console.log('No Dijkstra path found');
    return null;
};

/**
 * Calculates a clear path from the start position to the end position using the Voronoi roadmap
 * and Dijkstra's algorithm.
 *
 * @param voronoiRoadmap - The Voronoi roadmap as a FeatureCollection of LineStrings.
 * @param graph - The adjacency graph of the Voronoi roadmap.
 * @param start - The starting position as a coordinate pair.
 * @param end - The ending position as a coordinate pair.
 * @param boundary - The boundary polygon.
 * @param obstacles - The obstacles as a FeatureCollection of Polygons.
 * @returns A LineString representing the clear path, or null if no path is found.
 */
export const calculateClearPath = (
    voronoiRoadmap: FeatureCollection<LineString>,
    start: Position,
    end: Position,
    boundary: Feature<Polygon>,
    obstacles: FeatureCollection<Polygon> | null
): Feature<LineString> | null => {
    // If there are no obstacles, create an empty FeatureCollection to avoid errors.
    if (!obstacles) obstacles = turf.featureCollection([]);

    // combine boundary and obstacles
    const obstacleCoords = turf.coordAll(obstacles);
    const boundaryAndObstacles = turf.multiPolygon([boundary.geometry.coordinates, [obstacleCoords]]);

    // Draw a direct line from the start to end positions.
    const directLine = turf.lineString([start, end]);

    // If the direct path does not intersect the boundary or obstacles, return it.
    if (isPathClear(directLine, boundaryAndObstacles)) return directLine;

    // Find shortest valid paths from start and end to the Voronoi roadmap.
    let shortStartDistance = Infinity;
    let shortEndDistance = Infinity;
    let startPath: Feature<LineString> | null = null;
    let endPath: Feature<LineString> | null = null;
    let startRoadSegment: Feature<LineString> | null = null;
    let endRoadSegment: Feature<LineString> | null = null;
    voronoiRoadmap.features.forEach((road) => {
        const tryStart = turf.nearestPointOnLine(road, start).geometry;
        const tryEnd = turf.nearestPointOnLine(road, end).geometry;
        const tryStartPath = turf.lineString([start, tryStart.coordinates]);
        const tryEndPath = turf.lineString([tryEnd.coordinates, end]);
        const startDistance = turf.length(tryStartPath);
        const endDistance = turf.length(tryEndPath);
        if (startDistance < shortStartDistance && isPathClear(tryStartPath, boundaryAndObstacles)) {
            shortStartDistance = startDistance;
            startPath = tryStartPath;
            startRoadSegment = road;
        }
        if (endDistance < shortEndDistance && isPathClear(tryEndPath, boundaryAndObstacles)) {
            shortEndDistance = endDistance;
            endPath = tryEndPath;
            endRoadSegment = road;
        }
    });

    if (!startPath || !endPath || !startRoadSegment || !endRoadSegment) {
        console.log('No clear path found');
        return null;
    }

    const startPathBearing = turf.bearing(turf.getCoords(startPath)[0], turf.getCoords(startPath)[1]);
    const extendedStartPoint = turf.destination(turf.getCoords(startPath)[1], 0.01, startPathBearing, {
        units: 'meters',
    });
    const startPathSplitter = turf.lineString([
        turf.getCoords(startPath)[0],
        turf.getCoords(extendedStartPoint),
    ]);

    const endPathBearing = turf.bearing(turf.getCoords(endPath)[1], turf.getCoords(endPath)[0]);
    const extendedEndPoint = turf.destination(turf.getCoords(endPath)[0], 0.01, endPathBearing, {
        units: 'meters',
    });
    const endPathSplitter = turf.lineString([turf.getCoords(extendedEndPoint), turf.getCoords(endPath)[1]]);

    const splitStartRoad = turf.lineSplit(
        startRoadSegment,
        startPathSplitter
    ) as FeatureCollection<LineString>;
    const splitEndRoad = turf.lineSplit(endRoadSegment, endPathSplitter) as FeatureCollection<LineString>;

    // Make a shallow copy of the voronoiRoadmap
    const tempVoronoiRoadmap = turf.featureCollection(
        voronoiRoadmap.features.filter(
            (feature) => feature !== startRoadSegment && feature !== endRoadSegment
        )
    );

    // for (const feature of splitStartRoad.features) {
    //     const roadStartCoords = turf.getCoords(feature)[0];
    //     const roadEndCoords = turf.getCoords(feature)[turf.getCoords(feature).length - 1];
    //     if (turf.distance(start, roadStartCoords) < turf.distance(start, roadEndCoords)) {
    //         feature.geometry.coordinates = [start, ...feature.geometry.coordinates];
    //     } else {
    //         feature.geometry.coordinates = [...feature.geometry.coordinates, start];
    //     }
    // }

    // for (const feature of splitEndRoad.features) {
    //     const roadStartCoords = turf.getCoords(feature)[0];
    //     const roadEndCoords = turf.getCoords(feature)[turf.getCoords(feature).length - 1];
    //     if (turf.distance(end, roadStartCoords) < turf.distance(end, roadEndCoords)) {
    //         feature.geometry.coordinates = [end, ...feature.geometry.coordinates];
    //     } else {
    //         feature.geometry.coordinates = [...feature.geometry.coordinates, end];
    //     }
    // }

    tempVoronoiRoadmap.features.push(
        ...splitStartRoad.features,
        ...splitEndRoad.features,
        startPath,
        endPath
    );

    // Update the adjacency graph with the new segments
    const newGraph = calculateAdjacencyGraph(tempVoronoiRoadmap);

    // Find and return the shortest path using the updated roadmap and graph
    const dijkstraPath = getDijkstraPath(newGraph, start, end);

    // TODO: determine the root cause of the duplicate points so we don't have to iterate...again!
    if (dijkstraPath) {
        // Remove consecutive duplicate points
        const filteredCoordinates = dijkstraPath.geometry.coordinates.reduce<Position[]>((acc, cur) => {
            if (acc.length === 0) {
                acc.push(cur);
            } else {
                const lastCoord = acc[acc.length - 1];
                const lastCoordKey = JSON.stringify(lastCoord.map((value) => value.toFixed(FIXED_PRECISION)));
                const curCoordKey = JSON.stringify(cur.map((value) => value.toFixed(FIXED_PRECISION)));
                if (lastCoordKey !== curCoordKey) {
                    acc.push(cur);
                }
            }
            return acc;
        }, []);

        return turf.lineString(filteredCoordinates);
    }

    if (dijkstraPath) return dijkstraPath;
    console.log('No clear path found');
    return null;
};
