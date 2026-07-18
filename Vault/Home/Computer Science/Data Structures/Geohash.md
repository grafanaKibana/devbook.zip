---
topic:
  - Computer Science
subtopic:
  - Data Structures
summary: "A hierarchical spatial encoding that turns longitude and latitude into sortable cell prefixes for candidate lookup."
level:
  - "4"
priority: Medium
status: Creation
publish: true
---

# Intro

A geohash converts a longitude/latitude point into a base-32 string whose prefixes name progressively smaller rectangular cells. It is an encoding and query-partitioning technique, not a distance metric or a complete spatial index. The practical advantage is that a two-dimensional location can become a one-dimensional key for a sorted index, cache, partition key, or aggregation bucket.

Reach for geohash when fixed grid precision and ordinary key infrastructure are useful. Do not reach for it merely because data has coordinates: exact containment, nearest-neighbor ranking, polygons, and error-critical distance usually belong in a spatial engine that understands geometry.

## Encoding and query path

The encoder repeatedly bisects longitude and latitude ranges, records which half contains the point, interleaves the resulting bits, and maps each five-bit group to a base-32 character. Each additional character adds five bits of resolution, so truncating characters produces a larger ancestor cell.

```text
longitude interval [-180, 180] → longitude bits
latitude interval   [ -90,  90] → latitude bits
interleave longitude and latitude bits
group into five-bit values → base-32 geohash
```

A shared prefix means two points occupy the same cell at that precision. The converse is false: physically adjacent points can sit on opposite sides of a cell boundary and share no useful prefix.

A radius query therefore has two phases:

1. **Generate candidates.** Choose a precision whose cell size is near the query radius, cover the center and neighboring cells that intersect the search shape, then scan each prefix or numeric score range.
2. **Filter exactly.** Compute distance for every candidate and discard points outside the radius.

Scanning only the center prefix creates false negatives at cell edges. Skipping the final distance check creates false positives from the rectangular cover. Higher precision reduces candidates per cell but increases the number of ranges needed for a large region; lower precision does the opposite.

## Real systems use the encoding differently

**Redis GEO** stores members in a sorted set using an interleaved 52-bit geospatial score. `GEOSEARCH` covers the requested radius or box with score ranges and filters results; Redis documents spherical Haversine distance and a possible error that is unsuitable for error-critical applications. The standard geohash string returned by `GEOHASH` is a representation of that location, while the internal index uses Redis's numeric variant.

```text
GEOADD drivers 30.5234 50.4501 driver:42
GEOSEARCH drivers FROMLONLAT 30.52 50.45 BYRADIUS 3 KM WITHDIST
```

The first command indexes one driver near Kyiv. The second asks Redis to generate and filter candidates within three kilometres; application code still decides whether Redis's spherical-distance error and update model fit the product.

**Elasticsearch** accepts geohash strings as one input form for `geo_point`, but translates them to longitude and latitude for indexing. Its `geohash_grid` aggregation groups indexed points or shapes into user-selected geohash cells. That aggregation is a bucketing view, not evidence that the underlying `geo_point` field is a string-prefix index; current Elasticsearch stores geospatial data in Lucene BKD-tree structures.

These examples expose the boundary: “uses geohash” can mean a sorted numeric candidate index, a textual interchange encoding, or a result aggregation grid. Verify which one a product implements before reasoning about complexity or durability.

## Geohash, quadtree, and database spatial indexes

| Mechanism | Partition shape | Storage fit | Main cost |
| --- | --- | --- | --- |
| Geohash | Fixed hierarchical grid encoded as prefixes | Sorted keys, caches, shards, aggregation buckets | Neighbor expansion and exact post-filtering at cell boundaries |
| [[Quadtree]] | Adaptive four-way subdivision | Mutable in-memory regions, sparse rasters, collision broad phase | Distribution-dependent depth and custom traversal/storage |
| R-tree / GiST spatial index | Bounding rectangles organized for paged access | Durable geometry columns and database query planners | Overlapping bounds produce candidates that still need exact geometry checks |

For a durable database, start with its native spatial type and index. PostGIS, for example, uses GiST-backed R-tree behavior to index geometry bounding boxes and can accelerate predicates such as `ST_Intersects` and `ST_DWithin`. Choose geohash instead when the prefix itself is useful for sharding, caching, coarse aggregation, or interoperability. Choose a quadtree when adaptive subdivision is the data structure you need rather than an encoding layered onto an existing index.

## Pitfalls

- Longitude wraps at the antimeridian, latitude converges toward the poles, and rectangular cells do not represent equal surface areas.
- Prefix length is precision, not accuracy. It cannot recover error already present in the source coordinate.
- Lexicographic proximity is not physical distance. Nearby hashes are candidates for a geometric check, not a nearest-neighbor ordering.
- Changing precision changes the cell identity. Store the original coordinates when queries or reindexing need more than the chosen prefix preserves.

## References

- [Redis GEOADD](https://redis.io/docs/latest/commands/geoadd/) — primary documentation for the 52-bit interleaved score, sorted-set ranges, neighboring-area cover, and Haversine filtering.
- [Redis GEOHASH](https://redis.io/docs/latest/commands/geohash/) — primary documentation for standard geohash strings, prefix truncation, and the fact that different prefixes can still be nearby.
- [Elasticsearch `geo_point`](https://www.elastic.co/docs/reference/elasticsearch/mapping-reference/geo-point) — official coordinate and geohash input behavior, including conversion to longitude/latitude.
- [Elasticsearch `geohash_grid` aggregation](https://www.elastic.co/docs/reference/aggregations/search-aggregations-bucket-geohashgrid-aggregation) — official fixed-precision geohash bucketing semantics.
- [Elasticsearch features](https://www.elastic.co/elasticsearch/features) — official statement that Lucene BKD-tree structures store Elasticsearch geospatial data.
- [PostGIS spatial indexing](https://postgis.net/workshops/postgis-intro/indexing.html) — project documentation for bounding-box R-tree indexes and the predicates they accelerate.
