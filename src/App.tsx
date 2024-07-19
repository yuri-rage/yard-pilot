import { effect } from '@preact/signals-react';
import { Feature, Polygon } from 'geojson';

import {
    rawBoundary,
    boundary,
    convexHull,
    coverageGrid,
    minBoundingBox,
    mowPath,
    rawObstacles,
    pathMarkers,
    userSettings,
    voronoiPaths,
    obstacles,
    startPoint,
    mbbOrientation,
    travelHeading,
    Visit,
} from '@/globals';
import {
    differenceObstaclesFromBoundary,
    getConvexHull,
    getMinBoundingBox,
    removeOrphanedObstacles,
} from '@/utils/boundaries';
import { getCoverageGrid, getTravelHeading } from '@/utils/coverage-grid';
import { calculateMowPath, pruneExcessPoints } from '@/utils/mow-path';
import { createPathMarkers } from '@/utils/path-markers';
import { calculateVoronoiRoadmap } from '@/utils/voronoi-roadmap';

import { LeafletMap } from '@/components/leaflet-map';
import { MapOverlayControls } from '@/components/map-overlay-controls';
import { MenuBar } from '@/components/menubar';
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from '@/components/ui/sonner';

// based on https://link.springer.com/article/10.1007/s41315-021-00199-8
// ! use `bun run dev` for development!

const getCoverage = (): number => {
    if (!coverageGrid.value) return 0;
    const unvisitedCells = coverageGrid.value.features.filter(
        (feature) => feature.properties?.visited === Visit.unvisited
    );
    const visitedCells = coverageGrid.value.features.filter(
        (feature) => feature.properties?.visited === Visit.visited
    );
    return visitedCells.length / (unvisitedCells.length + visitedCells.length);
};

const generateAll = (bounds: Feature<Polygon>): void => {
    boundary.value = differenceObstaclesFromBoundary(bounds, rawObstacles.value);
    if (!boundary.value) return;
    obstacles.value = removeOrphanedObstacles(boundary.value, rawObstacles.value);
    convexHull.value = getConvexHull(boundary.value);
    minBoundingBox.value = getMinBoundingBox(convexHull.value as Feature<Polygon>, mbbOrientation.value);
    coverageGrid.value = getCoverageGrid(
        boundary.value,
        obstacles.value,
        minBoundingBox.value,
        userSettings.value.laneWidth,
        startPoint.value
    );
    travelHeading.value = getTravelHeading(coverageGrid.value);
    voronoiPaths.value = calculateVoronoiRoadmap(boundary.value, obstacles.value);

    let path = null;
    let previousLength = 0;
    while (getCoverage() < 0.99) {
        path = calculateMowPath(
            path,
            boundary.value,
            obstacles.value,
            voronoiPaths.value,
            coverageGrid.value
        );
        if (path?.geometry.coordinates.length === previousLength) break;
        previousLength = path?.geometry.coordinates.length || 0;
    }
    path = pruneExcessPoints(path, userSettings.value.laneWidth / 2);
    mowPath.value = path;
    if (mowPath.value) {
        pathMarkers.value = createPathMarkers(mowPath.value, userSettings.value.laneWidth);
    }
};

// TODO: figure out why generateAll is triggered on other signals
effect(() => {
    const bounds = rawBoundary.value;
    // @ts-ignore - react trigger
    const obs = rawObstacles.value;
    if (bounds) {
        generateAll(bounds);
    }
});

export const App = () => {
    return (
        <ThemeProvider defaultTheme='dark' storageKey='vite-ui-theme'>
            <MapOverlayControls className='absolute bottom-3 left-3 z-20 rounded-b-none' />
            <div className='flex min-h-screen flex-col gap-3 p-3'>
                <MenuBar />
                <div className='relative z-10 flex flex-grow'>
                    <LeafletMap />
                </div>
            </div>
            <Toaster />
        </ThemeProvider>
    );
};

