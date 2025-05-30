declare module 'ngeohash' {
    export function encode(latitude: number, longitude: number, precision?: number): string;
    export function decode(hashstring: string): { latitude: number; longitude: number };
    export function encode_int(latitude: number, longitude: number, bitDepth?: number): number;
    export function decode_int(hashinteger: number, bitDepth?: number): { latitude: number; longitude: number };
    export function neighbor(hashstring: string, direction: string): string;
    export function neighbors(hashstring: string): string[];
    export function bboxes(minLat: number, minLon: number, maxLat: number, maxLon: number, precision?: number): string[];
    export function bbox(hashstring: string): { minLat: number; minLon: number; maxLat: number; maxLon: number };
} 