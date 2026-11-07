using GeometRi;
using ObjParser;
using System;
using System.Collections.Generic;
using System.Linq;
using ThreeDSlicer.Application.Helpers.GeometryHelpers.Models;

namespace ThreeDSlicer.Application.Helpers.GeometryHelpers
{
    public static class GeometryHelpers
    {
        public static PolygonBounds GetPolygonBounds(this Point3d[] points)
        {
            if (points.Count() == 0)
            {
                return new PolygonBounds
                {
                    XMax = 0,
                    XMin = 0,
                    YMax = 0,
                    YMin = 0,
                }; ;
            }

            return new PolygonBounds
            {
                XMax = points.Max(v => v.X),
                XMin = points.Min(v => v.X),
                YMax = points.Max(v => v.Y),
                YMin = points.Min(v => v.Y),
            };
        }

        public static PolygonBounds GetBounds(this IEnumerable<PolygonBounds> loopBounds)
        {
            return loopBounds.GetBoundsPoints().GetPolygonBounds();
        }

        public static Point3d[] GetBoundsPoints(this IEnumerable<PolygonBounds> loopBounds)
        {
            return loopBounds.SelectMany(b =>
                new[]
                {
                new Point3d(b.XMin, b.YMin, 0),
                new Point3d(b.XMax, b.YMax, 0)
                }).ToArray();
        }
    }
}
