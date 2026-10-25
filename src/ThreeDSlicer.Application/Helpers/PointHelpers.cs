using GeometRi;
using System.Collections.Generic;
using System.Linq;
using ThreeDSlicer.Application.Enums;

namespace ThreeDSlicer.Application.Helpers;

public static class PointHelpers
{
    public static Point3d ChangeAxises(this Point3d p, Axises axis)
    {
        if (axis == Axises.XY)
        {
            return new Point3d(p.X, p.Y, 0);
        }

        if (axis == Axises.XZ)
        {
            return new Point3d(p.X, p.Z, 0);
        }

        if (axis == Axises.YZ)
        {
            return new Point3d(p.Y, p.Z, 0);
        }

        return null;
    }

    //public static bool IsCutByOrthogonalPlane(this Segment3d segment, Plane3d plane, Axises axis)
    //{
    //    var point = plane.Point;
    //    var p1 = segment.P1;
    //    var p2 = segment.P2;

    //    var dictionary = new Dictionary<Axises, (double PlaneCoord, double[] EdgeCoords)>
    //    {
    //        { Axises.XY, (point.Z, new[] { p1.Z, p2.Z }.Order().ToArray()) },
    //        { Axises.YZ, (point.X, new[] { p1.X, p2.X }.Order().ToArray()) },
    //        { Axises.XZ, (point.Y, new[] { p1.Y, p2.Y }.Order().ToArray()) },
    //    };

    //    var value = dictionary[axis];
    //    return value.EdgeCoords[0] <= value.PlaneCoord && value.EdgeCoords[1] >= value.PlaneCoord;
    //}
}
