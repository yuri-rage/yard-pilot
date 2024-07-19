import { length as turfLength, centroid as turfCentroid } from '@turf/turf';
import { Feature, LineString, Polygon } from 'geojson';

import {
    startPoint,
    mbbOrientation,
    minBoundingBox,
    convexHull,
    mowPath,
    toUserUnits,
    userSettings,
    coverageGrid,
    Visit,
    boundary,
    travelHeading,
} from '@/globals';
import { getMinBoundingBox } from '@/utils/boundaries';
import { exportWaypointFile } from '@/utils/missionplanner-filehandler';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

export const MapOverlayControls = ({ className }: { className?: string }) => {
    const onDownloadClick = () => {
        if (!mowPath.value) return;
        const home = turfCentroid(boundary.value as Feature<Polygon>).geometry.coordinates;
        exportWaypointFile(mowPath.value as Feature<LineString>, home, 'yardpilot-mission.waypoints');
    };

    const onOrientationChange = (value: number) => {
        mbbOrientation.value = value;
        minBoundingBox.value = getMinBoundingBox(convexHull.value as Feature<Polygon>, value);
    };

    const onStartPointChange = (value: number) => {
        startPoint.value = value;
    };

    const getTravelDistance = (): string => {
        if (!mowPath.value) return '0';
        let distance = turfLength(mowPath.value as Feature<LineString>, { units: 'meters' });
        distance = toUserUnits(distance);
        let precision = 0;
        let units = userSettings.value.units === 'metric' ? 'meters' : 'feet';
        if (userSettings.value.units === 'metric' && distance >= 1000) {
            distance /= 1000;
            precision = 2;
            units = 'km';
        }
        if (userSettings.value.units === 'imperial' && distance >= 5280) {
            distance /= 5280;
            precision = 2;
            units = 'miles';
        }
        return `${distance.toFixed(precision)} ${units}`;
    };

    const getCoverage = (): string => {
        if (!coverageGrid.value) return '0';
        const unvisitedCells = coverageGrid.value.features.filter(
            (feature) => feature.properties?.visited === Visit.unvisited
        );
        const visitedCells = coverageGrid.value.features.filter(
            (feature) => feature.properties?.visited === Visit.visited
        );
        return `${((visitedCells.length / (unvisitedCells.length + visitedCells.length)) * 100).toFixed(1)}`;
    };

    return (
        <Card className={className}>
            <CardDescription className='flex flex-row justify-end gap-4 px-3 pb-0 pt-1 text-xs'>
                <span>Travel Distance: {getTravelDistance()}</span>
                <span>Coverage: {getCoverage()}%</span>
            </CardDescription>

            <CardContent className='flex items-center justify-center gap-3 px-2 pb-1 pt-0'>
                <Button variant='outline' className='h-8' onClick={onDownloadClick}>
                    Download Mission
                </Button>

                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger className='flex flex-row items-center gap-2'>
                            <Label htmlFor='mbb-orientation'>Orientation</Label>
                            <Slider
                                id='mbb-orientation'
                                value={[mbbOrientation.value]}
                                min={0}
                                max={180}
                                step={1}
                                onValueChange={(value) => onOrientationChange(value[0])}
                                className='w-32'
                            />
                            <span className='w-6 text-sm'>{`${travelHeading.value.toFixed(0).padStart(3, '0')}°`}</span>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>
                                Adjust the orientation of the generated path.
                                <br />
                                Slider full left or right should be close to optimal.
                            </p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>

                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger className='flex flex-row items-center gap-2'>
                            <Label htmlFor='start-point'>Start Point</Label>
                            <Slider
                                id='start-point'
                                value={[startPoint.value]}
                                min={0}
                                max={3}
                                step={1}
                                onValueChange={(value) => onStartPointChange(value[0])}
                                className='w-16'
                            />
                            <span className='text-sm'>{`${startPoint.value + 1}`}</span>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>Choose between 4 start points for path generation.</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </CardContent>
        </Card>
    );
};
