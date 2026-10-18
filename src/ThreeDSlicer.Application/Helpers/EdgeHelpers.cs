using _3DObjectToGCode.Application.Enums;
using GeometRi;
using System.Collections.Generic;
using System.Linq;

namespace _3DObjectToGCode.Application.Helpers;

public static class EdgeHelpers
{
    //public static DoublePoint[][] ToEdges(this DoublePoint[] points, int? scale = null)
    //{
    //    var count = points.Count();
    //    var edges = points.Select((p, i) =>
    //    {
    //        if (i == count - 1)
    //            return new DoublePoint[2] { new DoublePoint(p.X, p.Y), new DoublePoint(points[0].X, points[0].Y) };

    //        return new DoublePoint[2] { new DoublePoint(p.X, p.Y), new DoublePoint(points[i + 1].X, points[i + 1].Y) };
    //    }).ToArray();

    //    if (scale != null && scale != 1)
    //    {
    //        edges = edges.Select((e, i) => e.Select(p => p.ToInt(scale.Value)).ToArray()).ToArray();
    //    }

    //    return edges;
    //}

    //public static Segment3d[] ToSegments(this LoopPoints loop)
    //{
    //    return ToSegments(loop.Points.ToArray());
    //}

    public static Segment3d[] ToSegments(this Point3d[] points, bool closed = true)
    {
        var pointsCount = points.Count();
        var segments = points.Select((p, j) =>
        {
            var nextPointIndex = j + 1;
            return nextPointIndex != pointsCount ?
                new Segment3d(p.Copy(), points[nextPointIndex].Copy()) :
                closed ? new Segment3d(p.Copy(), points[0].Copy()) : null;
        }).Where(l => l != null).ToArray();

        return segments;
    }

    //public static DoublePoint[] ToEdge(this Segment3d segment)
    //{
    //    return [segment.P1.ToDoublePoint(), segment.P2.ToDoublePoint()];
    //}


    public static bool IsAxisPlaneCuted(this Segment3d segment, Plane3d plane, Axises axis)
    {
        var point = plane.Point;
        var p1 = segment.P1;
        var p2 = segment.P2;

        var dictionary = new Dictionary<Axises, (double PlaneCoord, double[] EdgeCoords)>
        {
            { Axises.XY, (point.Z, new[] { p1.Z, p2.Z }.Order().ToArray()) },
            { Axises.YZ, (point.X, new[] { p1.X, p2.X }.Order().ToArray()) },
            { Axises.XZ, (point.Y, new[] { p1.Y, p2.Y }.Order().ToArray()) },
        };

        var value = dictionary[axis];
        return value.EdgeCoords[0] <= value.PlaneCoord && value.EdgeCoords[1] >= value.PlaneCoord;
    }
}
