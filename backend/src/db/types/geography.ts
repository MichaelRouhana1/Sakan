import { customType } from "drizzle-orm/pg-core";

/**
 * PostGIS geography Point in WGS84.
 * App layer uses WKT strings: `POINT(lng lat)`.
 */
export const geographyPoint = customType<{ data: string; driverData: string }>({
  dataType() {
    return "geography(Point, 4326)";
  },
});
