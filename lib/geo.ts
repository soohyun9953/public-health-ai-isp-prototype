import * as topojson from "topojson-client";
import type { Topology, GeometryCollection } from "topojson-specification";
import type { Feature, FeatureCollection, Geometry } from "geojson";

export interface SigunguProperties {
  name: string;
  base_year: string;
  name_eng: string;
  code: string;
}

let cachedFeatureCollection: FeatureCollection<Geometry, SigunguProperties> | null = null;

export async function loadSigunguGeoJson(): Promise<
  FeatureCollection<Geometry, SigunguProperties>
> {
  if (cachedFeatureCollection) return cachedFeatureCollection;

  const res = await fetch("/data/korea-sigungu-topo.json");
  const topology = (await res.json()) as Topology;
  const objectKey = Object.keys(topology.objects)[0];
  const geometry = topology.objects[objectKey] as GeometryCollection;

  const featureCollection = topojson.feature(
    topology,
    geometry
  ) as unknown as FeatureCollection<Geometry, SigunguProperties>;

  cachedFeatureCollection = featureCollection;
  return featureCollection;
}

export type SigunguFeature = Feature<Geometry, SigunguProperties>;
