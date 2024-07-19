import * as turf from '@turf/turf';
import { Feature, FeatureCollection, LineString, Polygon, Position } from 'geojson';

const createCircleMarker = (coordinate: Position, radius: number, properties: any): Feature<Polygon> => {
    const marker = turf.circle(coordinate, radius, {
        units: 'meters',
        steps: 8,
    });
    marker.properties = properties;
    return marker;
};

const createArrowMarker = (
    start: Position,
    end: Position,
    size: number,
    properties?: any
): Feature<LineString> => {
    const bearing = turf.bearing(turf.point(start), turf.point(end));
    const midpoint = turf.midpoint(turf.point(start), turf.point(end)).geometry.coordinates;

    const arrowHead = [
        turf.destination(turf.point(midpoint), size, bearing + 150, { units: 'meters' }).geometry.coordinates,
        midpoint,
        turf.destination(turf.point(midpoint), size, bearing - 150, { units: 'meters' }).geometry.coordinates,
    ];

    const arrowMarker: Feature<LineString> = {
        type: 'Feature',
        geometry: {
            type: 'LineString',
            coordinates: [...arrowHead],
        },
        properties: properties,
    };

    return arrowMarker;
};

export const createPathMarkers = (path: Feature<LineString>, laneWidth: number): FeatureCollection => {
    const markers: FeatureCollection = {
        type: 'FeatureCollection',
        features: [],
    };

    if (path.geometry.coordinates.length < 2) return markers;

    const markerSize = laneWidth * 0.3;

    const startMarker = createCircleMarker(path.geometry.coordinates[0], markerSize, { start: true });

    const endMarker = createCircleMarker(
        path.geometry.coordinates[path.geometry.coordinates.length - 1],
        markerSize,
        { end: true }
    );

    markers.features.push(startMarker);
    markers.features.push(endMarker);

    let lastPosition = path.geometry.coordinates[0];

    path.geometry.coordinates.forEach((coordinate, index) => {
        if (index === 0) return;

        const distance = turf.distance(turf.point(lastPosition), turf.point(coordinate), {
            units: 'meters',
        });

        if (distance > laneWidth * 4) {
            const arrowMarker = createArrowMarker(lastPosition, coordinate, markerSize);
            markers.features.push(arrowMarker);
        }
        lastPosition = coordinate;
    });

    return markers;
};
