using _3DObjectToGCode.Application.Enums;
using GeometRi;
using System.Globalization;
using System.Linq;

namespace _3DObjectToGCode.Application.Helpers;

public static class StringExtensions
{
    private static CultureInfo _culture = new CultureInfo("en-US", false);

    //public static DoublePoint ToDoublePoint(this string source)
    //{
    //    var points = source.Trim().Split(" ");

    //    if (points.Length > 2)
    //        throw new ArgumentException("Parsed string candidate for double point has more then 2 spaces");

    //    return new DoublePoint(double.Parse(points[0], _culture), double.Parse(points[1], _culture));
    //}

    public static string ToPathPointString(this Point3d p, Axises axis)
    {
        if (axis == Axises.XY)
        {
            return $"{p.X.ToString(_culture)} {p.Y.ToString(_culture)}";
        }

        if (axis == Axises.XZ)
        {
            return $"{p.X.ToString(_culture)} {p.Z.ToString(_culture)}";
        }

        if (axis == Axises.YZ)
        {
            return $"{p.Y.ToString(_culture)} {p.Z.ToString(_culture)}";
        }

        return string.Empty;
    }

    public static string ToPathString(this Point3d[] points, Axises axis)
    {
        return $"M {string.Join(" ", points.Select(p => p.ToPathPointString(axis)))} z";
    }
}
