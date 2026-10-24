using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace ThreeDSlicer.Application.Helpers.GeometryHelpers.Models;

public class PolygonBounds
{
    public double XMax { get; set; }
    public double XMin { get; set; }
    public double YMax { get; set; }
    public double YMin { get; set; }

    public double Width { get { return XMax - XMin; } }
    public double Height { get { return YMax - YMin; } }

}
