import { useSignal, useSignalEffect } from '@preact/signals-react';
import { useCallback } from 'react';
import { FileRejection, useDropzone } from 'react-dropzone';

import { rawBoundary, rawObstacles, userSettings } from '@/globals';
import { parseMissionPlannerFile } from '@/utils/missionplanner-filehandler';

import { SettingsSheet } from '@/components/settings-sheet';
import { Card, CardContent } from '@/components/ui/card';
import { UploadIcon } from '@radix-ui/react-icons';
import { toast } from 'sonner';

import ypLogo from '@/assets/yardpilot.png';
import { FeatureCollection, Polygon } from 'geojson';

// TODO: use poly filename as name for downloaded file

export const MenuBar = () => {
    const droppedFiles = useSignal<File[] | null>(null);

    useSignalEffect(() => {
        if (!droppedFiles.value) return;

        const processFiles = async (files: File[]) => {
            for (const file of files) {
                try {
                    const geoJsonObj = await parseMissionPlannerFile(
                        file,
                        userSettings.value.circleTargetSegmentLength,
                        userSettings.value.circleMinSegmentCount
                    );
                    if (!geoJsonObj) continue;

                    if (geoJsonObj.type === 'Feature' && geoJsonObj.geometry.type === 'Polygon') {
                        rawBoundary.value = geoJsonObj;
                        localStorage.setItem('boundary', JSON.stringify(rawBoundary.value));
                        continue;
                    }

                    if (geoJsonObj.type === 'FeatureCollection' && geoJsonObj.features.length > 0) {
                        rawObstacles.value = geoJsonObj as FeatureCollection<Polygon>;
                        localStorage.setItem('obstacles', JSON.stringify(rawObstacles.value));
                    }
                } catch (err) {
                    if (err instanceof Error) toast.error(err.message);
                }
            }
        };

        processFiles(droppedFiles.value);
    });

    const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: FileRejection[]) => {
        let rejectMessage = '';
        for (const rejectedFile of rejectedFiles) {
            rejectMessage += `Unsupported file: ${rejectedFile.file.name}\n`;
        }
        if (rejectMessage) toast.error(rejectMessage);
        droppedFiles.value = acceptedFiles;
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'text/plain': ['.txt', '.waypoints', '.poly'],
        },
    });

    return (
        <Card className={`cursor-pointer ${isDragActive ? 'border-blue-500' : ''}`}>
            <CardContent className='flex items-center p-2'>
                <div {...getRootProps()} className='flex flex-grow justify-between'>
                    <input {...getInputProps()} />
                    <img src={ypLogo} alt='logo' className='h-8' />
                    <span className='flex items-center gap-2 text-sm'>
                        <UploadIcon className='h-[1.2rem] w-[1.2rem] rotate-0 scale-100' />
                        Drag and drop polygon / fence files here
                    </span>
                    <span>{/* empty div for centering */}</span>
                </div>
                <SettingsSheet />
            </CardContent>
        </Card>
    );
};
