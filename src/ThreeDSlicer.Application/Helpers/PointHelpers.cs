using _3DObjectToGCode.Application.Enums;
using GeometRi;

namespace _3DObjectToGCode.Application.Helpers;

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
}
