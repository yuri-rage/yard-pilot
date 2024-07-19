import { ChangeEvent } from 'react';

import { DEFAULT_USER_SETTINGS, fromUserUnits, toUserUnits, userSettings } from '@/globals';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ModeToggle } from '@/components/ui/mode-toggle';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
    Sheet,
    SheetClose,
    SheetContent,
    SheetDescription,
    SheetFooter,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from '@/components/ui/sheet';
import { TooltipContent, TooltipProvider, TooltipTrigger, Tooltip } from '@/components/ui/tooltip';
import { CheckedState } from '@radix-ui/react-checkbox';

// TODO: add repo/documentation link and attributions (like the white paper)
import apLogo from '@/assets/ardupilot.png';
import ypLogo from '@/assets/yardpilot.png';

const MIN_LANE_WIDTH = 0.1;
const MIN_OBSTACLE_MARGIN = 0;
const MIN_CIRCLE_TARGET_SEGMENT_LENGTH = 0.1;
const MIN_CIRCLE_MIN_SEGMENT_COUNT = 3;

export const SettingsSheet = () => {
    const resetSettings = () => {
        localStorage.clear();
        userSettings.value = { ...DEFAULT_USER_SETTINGS };
    };

    const onLaneWidthChange = (e: ChangeEvent<HTMLInputElement>) => {
        const value = Number((e.target as HTMLInputElement).value);
        if (isNaN(value) || value < MIN_LANE_WIDTH) return;
        userSettings.value.laneWidth = fromUserUnits(value);
        userSettings.value = { ...userSettings.value };
    };

    const onObstacleMarginChange = (e: ChangeEvent<HTMLInputElement>) => {
        const value = Number((e.target as HTMLInputElement).value);
        if (isNaN(value) || value < MIN_OBSTACLE_MARGIN) return;
        userSettings.value.obstacleMargin = fromUserUnits(value);
        userSettings.value = { ...userSettings.value };
    };

    const onCircleTargetSegmentLengthChange = (e: ChangeEvent<HTMLInputElement>) => {
        const value = Number((e.target as HTMLInputElement).value);
        if (isNaN(value) || value < MIN_CIRCLE_TARGET_SEGMENT_LENGTH) return;
        userSettings.value.circleTargetSegmentLength = fromUserUnits(value);
        userSettings.value = { ...userSettings.value };
    };

    const onCircleMinSegmentCountChange = (e: ChangeEvent<HTMLInputElement>) => {
        const value = parseInt((e.target as HTMLInputElement).value);
        if (isNaN(value) || value < MIN_CIRCLE_MIN_SEGMENT_COUNT) return;
        userSettings.value.circleMinSegmentCount = value;
        userSettings.value = { ...userSettings.value };
    };

    const onUnitsChange = (value: 'imperial' | 'metric') => {
        userSettings.value.units = value;
        userSettings.value = { ...userSettings.value };
    };

    const onShowBoundaryChange = (checked: CheckedState) => {
        userSettings.value.showBoundary = checked as boolean;
        userSettings.value = { ...userSettings.value };
    };

    const onShowObstaclesChange = (checked: CheckedState) => {
        userSettings.value.showObstacles = checked as boolean;
        userSettings.value = { ...userSettings.value };
    };

    const onShowConvexHullChange = (checked: CheckedState) => {
        userSettings.value.showConvexHull = checked as boolean;
        userSettings.value = { ...userSettings.value };
    };

    const onShowBoundingBoxChange = (checked: CheckedState) => {
        userSettings.value.showMinBoundingBox = checked as boolean;
        userSettings.value = { ...userSettings.value };
    };

    const onShowCoverageGridChange = (checked: CheckedState) => {
        userSettings.value.showCoverageGrid = checked as boolean;
        userSettings.value = { ...userSettings.value };
    };

    const onShowVoronoiRoadmapChange = (checked: CheckedState) => {
        userSettings.value.showVoronoiRoadmap = checked as boolean;
        userSettings.value = { ...userSettings.value };
    };

    const onShowMowPathChange = (checked: CheckedState) => {
        userSettings.value.showMowPath = checked as boolean;
        userSettings.value = { ...userSettings.value };
    };

    return (
        <Sheet>
            <SheetTrigger asChild>
                <Button variant='outline'>Settings</Button>
            </SheetTrigger>
            <SheetContent>
                <SheetHeader>
                    <SheetTitle className='flex items-center justify-between gap-2 pr-5'>
                        Settings
                        <Button variant='outline' onClick={() => resetSettings()}>
                            Reset to Defaults
                        </Button>
                        <ModeToggle />
                    </SheetTitle>
                    <SheetDescription className='text-xs italic'>
                        App settings are saved to the browser's{' '}
                        <a
                            href='https://www.w3schools.com/jsref/prop_win_localstorage.asp'
                            target='_blank'
                            rel='noreferrer'
                            className='text-blue-500 underline visited:text-purple-600'
                        >
                            local storage
                        </a>
                        .
                    </SheetDescription>
                </SheetHeader>

                <div className='flex flex-col space-y-8 py-8'>
                    <Card>
                        <CardContent className='flex items-center justify-center p-3'>
                            <RadioGroup
                                defaultValue={userSettings.value.units}
                                onValueChange={(value) => onUnitsChange(value as 'imperial' | 'metric')}
                                className='flex justify-center gap-5'
                            >
                                <div className='flex items-center space-x-2'>
                                    <RadioGroupItem value='imperial' id='r1' />
                                    <Label htmlFor='r1'>Use Imperial units</Label>
                                </div>
                                <div className='flex items-center space-x-2'>
                                    <RadioGroupItem value='metric' id='r2' />
                                    <Label htmlFor='r2'>Use metric units</Label>
                                </div>
                            </RadioGroup>
                        </CardContent>
                    </Card>

                    <Card className='relative'>
                        <span className='absolute -top-2 -translate-y-1 translate-x-3 transform bg-background px-3 text-sm font-medium text-muted-foreground'>
                            Path Generation
                        </span>
                        <CardContent className='px-2'>
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger className='grid grid-cols-5 items-center gap-4 p-0 pt-5'>
                                        <Label htmlFor='lane-width' className='col-span-2 text-right'>
                                            Lane (Deck) Width
                                        </Label>
                                        <Input
                                            id='lane-width'
                                            type='number'
                                            value={toUserUnits(userSettings.value.laneWidth)}
                                            min={MIN_LANE_WIDTH}
                                            onChange={(e) => onLaneWidthChange(e)}
                                            className='col-span-2'
                                        />
                                        <span className='col-span-1 text-left text-sm'>{`${userSettings.value.units === 'imperial' ? 'feet' : 'meters'}`}</span>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>
                                            Width between generated cutting paths (should be mower deck width
                                            minus desired overlap).
                                        </p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>

                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger className='grid grid-cols-5 items-center gap-4 p-0 pt-5'>
                                        <Label htmlFor='obstacle-margin' className='col-span-2 text-right'>
                                            Obstacle Margin
                                        </Label>
                                        <Input
                                            id='obstacle-margin'
                                            type='number'
                                            value={toUserUnits(userSettings.value.obstacleMargin)}
                                            min={MIN_OBSTACLE_MARGIN}
                                            onChange={(e) => onObstacleMarginChange(e)}
                                            className='col-span-2'
                                        />
                                        {/* <span className='col-span-1 text-sm'>{`${userSettings.value.units === 'imperial' ? 'feet' : 'meters'}`}</span> */}
                                        <span className='col-span-1 text-left text-sm font-semibold italic text-orange-400'>
                                            TODO
                                        </span>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>Additional margin around obstacles (not yet implemented).</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </CardContent>
                    </Card>

                    <Card className='relative'>
                        <span className='absolute -top-2 -translate-y-1 translate-x-3 transform bg-background px-3 text-sm font-medium text-muted-foreground'>
                            Circle Conversion
                        </span>
                        <CardContent className='px-2'>
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger className='grid grid-cols-5 items-center gap-4 p-0 pt-5'>
                                        <Label
                                            htmlFor='circle-target-segment-length'
                                            className='col-span-2 text-right'
                                        >
                                            Segment Length
                                        </Label>
                                        <Input
                                            id='circle-target-segment-length'
                                            type='number'
                                            value={toUserUnits(userSettings.value.circleTargetSegmentLength)}
                                            min={MIN_CIRCLE_TARGET_SEGMENT_LENGTH}
                                            onChange={(e) => onCircleTargetSegmentLengthChange(e)}
                                            className='col-span-2'
                                        />
                                        <span className='col-span-1 text-left text-sm'>{`${userSettings.value.units === 'imperial' ? 'feet' : 'meters'}`}</span>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>
                                            Target segment length for converting circles to polygons.
                                            <br />
                                            Higher values more closely approximate circles. <br />
                                            Lower values may produce better path generation. <br />
                                            Default: 2.5m / ~8ft
                                        </p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>

                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger className='grid grid-cols-5 items-center gap-4 p-0 pt-5'>
                                        <Label
                                            htmlFor='circle-min-segment-count'
                                            className='col-span-2 text-right'
                                        >
                                            Min Segments
                                        </Label>
                                        <Input
                                            id='circle-min-segment-count'
                                            type='number'
                                            value={userSettings.value.circleMinSegmentCount}
                                            min={MIN_CIRCLE_MIN_SEGMENT_COUNT}
                                            onChange={(e) => onCircleMinSegmentCountChange(e)}
                                            className='col-span-2'
                                        />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>
                                            Circles converted to polygons will always have at least this many
                                            segments (sides). <br />
                                            Default: 6
                                        </p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </CardContent>
                    </Card>

                    <Card className='relative'>
                        <span className='absolute -top-2 -translate-y-1 translate-x-3 transform bg-background px-3 text-sm font-medium text-muted-foreground'>
                            Display
                        </span>
                        <CardContent className='grid grid-cols-2'>
                            <div className='cols-span-2 flex items-center space-x-2 pt-4'>
                                <Checkbox
                                    id='show-boundary'
                                    checked={userSettings.value.showBoundary}
                                    onCheckedChange={(checked) => onShowBoundaryChange(checked)}
                                />
                                <Label
                                    htmlFor='show-boundary'
                                    className='text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70'
                                >
                                    Boundary
                                </Label>
                            </div>

                            <div className='cols-span-2 flex items-center space-x-2 pt-4'>
                                <Checkbox
                                    id='show-obstacles'
                                    checked={userSettings.value.showObstacles}
                                    onCheckedChange={(checked) => onShowObstaclesChange(checked)}
                                />
                                <Label
                                    htmlFor='show-obstacles'
                                    className='text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70'
                                >
                                    Obstacles
                                </Label>
                            </div>

                            <div className='cols-span-2 flex items-center space-x-2 pt-4'>
                                <Checkbox
                                    id='show-convex-hull'
                                    checked={userSettings.value.showConvexHull}
                                    onCheckedChange={(checked) => onShowConvexHullChange(checked)}
                                />
                                <Label
                                    htmlFor='show-convex-hull'
                                    className='text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70'
                                >
                                    Convex hull
                                </Label>
                            </div>

                            <div className='cols-span-2 flex items-center space-x-2 pt-4'>
                                <Checkbox
                                    id='show-bounding-box'
                                    checked={userSettings.value.showMinBoundingBox}
                                    onCheckedChange={(checked) => onShowBoundingBoxChange(checked)}
                                />
                                <Label
                                    htmlFor='show-bounding-box'
                                    className='text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70'
                                >
                                    Min Bounding Box
                                </Label>
                            </div>

                            <div className='cols-span-2 flex items-center space-x-2 pt-4'>
                                <Checkbox
                                    id='show-coverage-grid'
                                    checked={userSettings.value.showCoverageGrid}
                                    onCheckedChange={(checked) => onShowCoverageGridChange(checked)}
                                />
                                <Label
                                    htmlFor='show-coverage-grid'
                                    className='text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70'
                                >
                                    Coverage Grid
                                </Label>
                            </div>

                            <div className='cols-span-2 flex items-center space-x-2 pt-4'>
                                <Checkbox
                                    id='show-voronoi-roadmap'
                                    checked={userSettings.value.showVoronoiRoadmap}
                                    onCheckedChange={(checked) => onShowVoronoiRoadmapChange(checked)}
                                />
                                <Label
                                    htmlFor='show-voronoi-roadmap'
                                    className='text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70'
                                >
                                    Voronoi Roadmap
                                </Label>
                            </div>

                            <div className='cols-span-2 flex items-center space-x-2 pt-4'>
                                <Checkbox
                                    id='show-mow-path'
                                    checked={userSettings.value.showMowPath}
                                    onCheckedChange={(checked) => onShowMowPathChange(checked)}
                                />
                                <Label
                                    htmlFor='show-mow-path'
                                    className='text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70'
                                >
                                    Mowing Path
                                </Label>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <SheetFooter>
                    <SheetClose asChild>
                        <Button variant='outline'>Close</Button>
                    </SheetClose>
                </SheetFooter>

                <div className='absolute bottom-0 right-0 flex flex-col gap-4 p-8'>
                    <img src={ypLogo} alt='YardPilot' />
                    <span className='flex justify-center'>
                        <a
                            href='https://link.springer.com/article/10.1007/s41315-021-00199-8'
                            target='_blank'
                            rel='noreferrer'
                            className='flex flex-col text-xs italic text-blue-500 visited:text-purple-600'
                        >
                            <span className='text-white'>Path planning algorithm(s) based on:</span>
                            <span className='underline'>
                                Huang, KC., Lian, FL., Chen, CT. et al. A novel solution with rapid
                                Voronoi-based coverage path planning in irregular environment for robotic
                                mowing systems. Int J Intell Robot Appl 5, 558-575 (2021)
                            </span>
                        </a>
                    </span>
                    <SheetDescription className='flex items-center justify-between text-xs italic'>
                        <a href='https://www.ardupilot.org' target='_blank' rel='noreferrer'>
                            <img src={apLogo} alt='ArduPilot' className='w-28' />
                        </a>
                        <a
                            href='https://www.gnu.org/licenses/gpl-3.0.en.html#license-text'
                            target='_blank'
                            rel='noreferrer'
                            className='font-bold text-blue-500 underline visited:text-purple-600'
                        >
                            GPLv3
                        </a>
                        <span>&copy; 2024 -- Yuri</span>
                    </SheetDescription>
                </div>
            </SheetContent>
        </Sheet>
    );
};
