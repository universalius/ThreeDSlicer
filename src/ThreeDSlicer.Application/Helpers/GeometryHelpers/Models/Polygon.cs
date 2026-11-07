using GeometRi;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ThreeDSlicer.Application.Helpers.GeometryHelpers.Models;

public class Polygon
{
    public Polygon(Point3d[] points, PolygonBounds bounds)
    {
        Points = points;
        _bounds = bounds;
    }

    public Point3d[] Points { get; set; }

    private PolygonBounds _bounds;
    public PolygonBounds Bounds
    {
        get
        {
            return _bounds ?? (Points != null ? Points.GetPolygonBounds() : null);
        }
        set { _bounds = value; }
    }

}
