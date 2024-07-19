import * as turf from '@turf/turf';
import { Feature, Polygon, FeatureCollection, LineString, Position } from 'geojson';

const POLYGON_EXCLUSION_FENCE = 5002;
const CIRCULAR_EXCLUSION_FENCE = 5004;

const parsePolyFile = (data: string): Feature<Polygon> => {
    const lines = data
        .trim()
        .split('\n')
        .filter((line) => line && !line.startsWith('#'));

    const coordinates = lines.map((line) => {
        const [lat, lng] = line.split(' ').map(Number);
        return [lng, lat] as [number, number];
    });

    return {
        type: 'Feature',
        geometry: {
            type: 'Polygon',
            coordinates: [coordinates],
        },
        properties: {},
    };
};

const parseFenceFile = (
    data: string,
    circleTargetSegmentLength: number,
    circleMinSegmentCount: number
): FeatureCollection => {
    const lines = data
        .trim()
        .split('\n')
        .filter((line) => line && !line.startsWith('QGC WPL'));
    const features: Feature<Polygon>[] = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const parts = line.split('\t');
        const type = parseInt(parts[3]);
        const lat = parseFloat(parts[8]);
        const lng = parseFloat(parts[9]);

        if (type === CIRCULAR_EXCLUSION_FENCE) {
            // circular exclusion fence to polygon
            const radius = parseFloat(parts[4]);
            const turfCircle = generateCircularPolygon(
                lat,
                lng,
                radius,
                circleTargetSegmentLength,
                circleMinSegmentCount
            );
            features.push(turfCircle);
        } else if (type === POLYGON_EXCLUSION_FENCE) {
            // polygon exclusion fence
            const pointsCount = parseInt(parts[4]);
            const polygonCoordinates = extractPolygonCoordinates(lines, i, pointsCount);
            polygonCoordinates.push(polygonCoordinates[0]);
            features.push(createGeoJsonPolygon(polygonCoordinates));
            i += pointsCount - 1; // skip past this fence's coordinates
        }
    }

    return {
        type: 'FeatureCollection',
        features: features,
    };
};

const generateCircularPolygon = (
    lat: number,
    lng: number,
    radius: number,
    targetSegmentLength: number = 2.5, // (meters)
    minSegmentCount: number = 6
): Feature<Polygon> => {
    // determine segment count based on circumference and target segment length
    const circumference = 2 * Math.PI * radius; // circumference
    const numSegments = Math.max(minSegmentCount, Math.ceil(circumference / targetSegmentLength));

    // use Turf.js to generate the circle
    const center = [lng, lat];
    const options = {
        steps: numSegments,
        units: 'meters' as turf.Units,
    };
    const circlePoly = turf.circle(center, radius, options);

    return circlePoly;
};

const extractPolygonCoordinates = (
    // from waypoint/fence file
    lines: string[],
    startIndex: number,
    pointsCount: number
): [number, number][] => {
    const coordinates: [number, number][] = [];
    for (let i = 0; i < pointsCount; i++) {
        const parts = lines[startIndex + i].split('\t');
        const lat = parseFloat(parts[8]);
        const lng = parseFloat(parts[9]);
        coordinates.push([lng, lat]);
    }
    return coordinates;
};

const createGeoJsonPolygon = (coordinates: [number, number][]): Feature<Polygon> => {
    return {
        type: 'Feature',
        geometry: {
            type: 'Polygon',
            coordinates: [coordinates],
        },
        properties: {},
    };
};

export const parseMissionPlannerFile = async (
    file: File,
    circleTargetSegmentLength: number,
    circleMinSegmentCount: number
): Promise<FeatureCollection | Feature<Polygon> | null> => {
    const data = await file.text();
    const firstLine = data.trim().split('\n')[0];

    if (firstLine.trim().startsWith('QGC WPL')) {
        return parseFenceFile(data, circleTargetSegmentLength, circleMinSegmentCount);
    }

    // TODO: improve polygon file detection?
    if (firstLine.trim().replace(/\s/g, '').startsWith('#savedby')) {
        return parsePolyFile(data);
    }

    return null;
};

const createWaypointFile = (path: Feature<LineString>, home: Position): string => {
    const MAV_CMD_NAV_WAYPOINT = 16;
    const [homeLon, homeLat] = home;
    const homeAltitude = 1862; // TODO: get from user settings

    let waypoints = `0\t1\t0\t${MAV_CMD_NAV_WAYPOINT}\t0\t0\t0\t0\t${homeLat}\t${homeLon}\t${homeAltitude}\t1\n`;

    waypoints += path.geometry.coordinates
        .map((coord, index) => {
            const [lon, lat] = [coord[1].toFixed(8).padEnd(9, '0'), coord[0].toFixed(8).padEnd(9, '0')];
            const altitude = 30; // TODO: get from user settings

            return `${index + 1}\t0\t3\t${MAV_CMD_NAV_WAYPOINT}\t0\t0\t0\t0\t${lon}\t${lat}\t${altitude}\t1`;
        })
        .join('\n');

    return `QGC WPL 110 # created by YardPilot\n${waypoints}`;
};

export const exportWaypointFile = (path: Feature<LineString>, home: Position, fileName: string): void => {
    const data = createWaypointFile(path, home);
    const blob = new Blob([data], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};
