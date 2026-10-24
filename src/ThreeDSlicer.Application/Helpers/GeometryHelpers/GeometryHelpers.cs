using GeometRi;
using System;
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

    }
}
