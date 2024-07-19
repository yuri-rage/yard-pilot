import 'leaflet/dist/leaflet.css';

import { useSignalEffect } from '@preact/signals-react';
import { centroid as turfCentroid } from '@turf/turf';
import { Feature, Polygon } from 'geojson';
import L from 'leaflet';
import { useRef } from 'react';
import { LayersControl, MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet';

import {
    obstacles,
    convexHull,
    minBoundingBox,
    coverageGrid,
    userSettings,
    voronoiPaths,
    Visit,
    mowPath,
    pathMarkers,
    boundary,
    debugGeoJSON,
} from '@/globals';

export const LeafletMap = () => {
    const boundaryLayerRef = useRef<L.GeoJSON | null>(null);
    const obstacleLayerRef = useRef<L.GeoJSON | null>(null);
    const convexHullLayerRef = useRef<L.GeoJSON | null>(null);
    const minBoundingBoxLayerRef = useRef<L.GeoJSON | null>(null);
    const coverageGridLayerRef = useRef<L.GeoJSON | null>(null);
    const voronoiPathsLayerRef = useRef<L.GeoJSON | null>(null);
    const mowPathLayerRef = useRef<L.GeoJSON | null>(null);
    const pathMarkersLayerRef = useRef<L.GeoJSON | null>(null);

    // TODO: remove debugGeoJSON ref, effect, and layer for production
    const debugGeoJSONLayerRef = useRef<L.GeoJSON | null>(null);
    useSignalEffect(() => {
        const geoJsonData = debugGeoJSON.value as any;
        if (debugGeoJSONLayerRef.current && geoJsonData) {
            debugGeoJSONLayerRef.current.clearLayers().addData(geoJsonData);
        }
    });

    useSignalEffect(() => {
        const geoJsonData = boundary.value as any;
        if (boundaryLayerRef.current && geoJsonData) {
            boundaryLayerRef.current.clearLayers().addData(geoJsonData);
        }
    });

    useSignalEffect(() => {
        const geoJsonData = obstacles.value as any;
        if (obstacleLayerRef.current && geoJsonData) {
            obstacleLayerRef.current.clearLayers().addData(geoJsonData);
        }
    });

    useSignalEffect(() => {
        const geoJsonData = convexHull.value as any;
        if (convexHullLayerRef.current && geoJsonData) {
            convexHullLayerRef.current.clearLayers().addData(geoJsonData);
        }
    });

    useSignalEffect(() => {
        const geoJsonData = minBoundingBox.value as any;
        if (minBoundingBoxLayerRef.current && geoJsonData) {
            minBoundingBoxLayerRef.current.clearLayers().addData(geoJsonData);
        }
    });

    useSignalEffect(() => {
        const geoJsonData = coverageGrid.value as any;
        if (coverageGridLayerRef.current && geoJsonData) {
            coverageGridLayerRef.current.clearLayers().addData(geoJsonData);
        }
    });

    useSignalEffect(() => {
        const geoJsonData = voronoiPaths.value as any;
        if (voronoiPathsLayerRef.current && geoJsonData) {
            voronoiPathsLayerRef.current.clearLayers().addData(geoJsonData);
        }
    });

    useSignalEffect(() => {
        const geoJsonData = mowPath.value as any;
        if (mowPathLayerRef.current && geoJsonData) {
            mowPathLayerRef.current.clearLayers().addData(geoJsonData);
        }
    });

    useSignalEffect(() => {
        const geoJsonData = pathMarkers.value as any;
        if (pathMarkersLayerRef.current && geoJsonData) {
            pathMarkersLayerRef.current.clearLayers().addData(geoJsonData);
        }
    });

    useSignalEffect(() => {
        const geoJsonData = mowPath.value as any;
        if (mowPathLayerRef.current && geoJsonData) {
            mowPathLayerRef.current.clearLayers().addData(geoJsonData);
        }
    });

    useSignalEffect(() => {
        const geoJsonData = pathMarkers.value as any;
        if (pathMarkersLayerRef.current && geoJsonData) {
            pathMarkersLayerRef.current.clearLayers().addData(geoJsonData);
        }
    });

    const BoundsChangeHook = () => {
        if (!boundary.value) return null;
        const center = turfCentroid(boundary.value as Feature<Polygon>).geometry.coordinates;
        if (!center) return null;
        const map = useMap();
        const zoom = map.getZoom();
        map.setView([center[1], center[0]], zoom < 10 ? 20 : zoom);
        return null;
    };

    return (
        <MapContainer className='w-full flex-1 rounded-lg' center={[0, 0]} zoom={2} zoomControl={false}>
            <BoundsChangeHook />
            <LayersControl>
                <LayersControl.BaseLayer checked name='Google Hybrid'>
                    <TileLayer
                        attribution='<a href="https://www.google.com/intl/en/help/terms_maps/">Google Maps</a>'
                        url='https://www.google.com/maps/vt?lyrs=y&x={x}&y={y}&z={z}'
                        maxZoom={22}
                    />
                </LayersControl.BaseLayer>
                <LayersControl.BaseLayer name='Google Satellite'>
                    <TileLayer
                        attribution='<a href="https://www.google.com/intl/en/help/terms_maps/">Google Maps</a>'
                        url='https://www.google.com/maps/vt?lyrs=s&x={x}&y={y}&z={z}'
                        maxZoom={22}
                    />
                </LayersControl.BaseLayer>
                <LayersControl.BaseLayer name='Google Street Map'>
                    <TileLayer
                        attribution='<a href="https://www.google.com/intl/en/help/terms_maps/">Google Maps</a>'
                        url='https://www.google.com/maps/vt?lyrs=m&x={x}&y={y}&z={z}'
                        maxZoom={22}
                    />
                </LayersControl.BaseLayer>
                <LayersControl.BaseLayer name='Open Street Map'>
                    <TileLayer
                        attribution='<a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                        url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
                        maxZoom={22}
                    />
                </LayersControl.BaseLayer>
            </LayersControl>

            {userSettings.value.showMinBoundingBox && (
                <GeoJSON
                    ref={minBoundingBoxLayerRef}
                    data={minBoundingBox.value as any}
                    style={{
                        color: 'navy',
                        dashArray: '3,6',
                        weight: 3,
                        opacity: 1,
                        fillOpacity: 0,
                    }}
                />
            )}

            {userSettings.value.showBoundary && (
                <GeoJSON
                    ref={boundaryLayerRef}
                    data={boundary.value as any}
                    style={{
                        color: 'red',
                        weight: 3,
                        opacity: 1,
                        fillOpacity: 0,
                    }}
                />
            )}

            {userSettings.value.showObstacles && (
                <GeoJSON
                    ref={obstacleLayerRef}
                    data={obstacles.value as any}
                    style={{
                        color: 'darkred',
                        weight: 3,
                        opacity: 1,
                        fillColor: 'red',
                        fillOpacity: 0.2,
                    }}
                />
            )}

            {userSettings.value.showConvexHull && (
                <GeoJSON
                    ref={convexHullLayerRef}
                    data={convexHull.value as any}
                    style={{
                        color: 'blue',
                        weight: 3,
                        dashArray: '3,6',
                        opacity: 1,
                        fillOpacity: 0,
                    }}
                />
            )}

            {userSettings.value.showCoverageGrid && (
                <GeoJSON
                    ref={coverageGridLayerRef}
                    data={coverageGrid.value as any}
                    style={(feature) => {
                        if (!feature) return {}; // Handle undefined feature
                        const visitedValue = feature.properties?.visited;
                        let styleOptions = {
                            color: 'black',
                            weight: 1,
                            opacity: 0.3,
                            dashArray: '3,2',
                            fillOpacity: 0,
                        };

                        if (visitedValue === Visit.visited) {
                            styleOptions = {
                                ...styleOptions,
                                color: 'lime',
                                opacity: 0,
                                weight: 0,
                                fillOpacity: 0.35,
                            };
                        } else if (visitedValue === Visit.unvisitable) {
                            styleOptions = {
                                ...styleOptions,
                                opacity: 0,
                                weight: 0,
                                fillOpacity: 0.66,
                            };
                        }
                        return styleOptions;
                    }}
                />
            )}

            {userSettings.value.showVoronoiRoadmap && (
                <GeoJSON
                    ref={voronoiPathsLayerRef}
                    data={voronoiPaths.value as any}
                    style={{
                        color: 'cyan',
                        weight: 2.5,
                        dashArray: '3,6',
                        opacity: 1,
                        fillOpacity: 0,
                    }}
                />
            )}

            {userSettings.value.showMowPath && (
                <GeoJSON
                    ref={mowPathLayerRef}
                    data={mowPath.value as any}
                    style={{
                        color: 'yellow',
                        weight: 2,
                        opacity: 1,
                        fillOpacity: 0,
                    }}
                />
            )}

            {userSettings.value.showMowPath && (
                <GeoJSON
                    ref={pathMarkersLayerRef}
                    data={pathMarkers.value as any}
                    style={(feature) => {
                        if (!feature) return {}; // Handle undefined feature
                        let styleOptions = {
                            color: 'yellow',
                            weight: 2,
                            opacity: 1,
                            fillOpacity: 0,
                        };

                        if (feature.properties?.start) {
                            styleOptions = {
                                ...styleOptions,
                                color: 'lime',
                                fillOpacity: 1,
                            };
                        } else if (feature.properties?.end) {
                            styleOptions = {
                                ...styleOptions,
                                color: 'red',
                                fillOpacity: 1,
                            };
                        }
                        return styleOptions;
                    }}
                />
            )}

            {debugGeoJSON.value && (
                <GeoJSON
                    ref={debugGeoJSONLayerRef}
                    data={debugGeoJSON.value as any}
                    style={{
                        color: 'navy',
                        weight: 3,
                        opacity: 1,
                        fillOpacity: 0,
                    }}
                />
            )}
        </MapContainer>
    );
};
