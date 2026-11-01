using GeometRi;
using SvgLib;
using System.Collections.Generic;
using System.Linq;
using ThreeDSlicer.Application.Helpers;
using ThreeDSlicer.Application.Helpers.GeometryHelpers;
using ThreeDSlicer.Application.Helpers.GeometryHelpers.Models;
using static ThreeDSlicer.Application.Features.CylinderObjectToSvgConverter.CylinderObjectToSvgConverterSevice;

namespace ThreeDSlicer.Application.Features.CrossSessionSvgBuilder;

public class CrossSessionSvgBuilder
{


    public SvgDocument BuildSvg(MeshLoops[] meshes)
    {
        var svgDocument = SvgDocument.Create();
        svgDocument.Units = "%";
        svgDocument.Width = 100;
        svgDocument.Height = 100;

        var defs = svgDocument.AddDefs();
        var pattern = defs.AddPattern();
        pattern.Id = "hatch-45";
        pattern.Width = 10;
        pattern.Height = 10;
        pattern.PatternUnits = "userSpaceOnUse";

        var line = pattern.AddLine();
        line.X1 = 0;
        line.Y1 = 0;
        line.X2 = 20;
        line.Y2 = 20;
        line.SetStyle("stroke", "red");
        line.SetStyle("stroke-width", "0.5");
        line.SetStyle("stroke-linecap", "square");

        var bounds = GetPointsFromPolygonBounds(meshes.Select(m => AddPathes(svgDocument, m))).GetPolygonBounds();

        var xMin = bounds.XMin > 0 ? bounds.XMin + 5 : bounds.XMin - 5;
        var yMin = bounds.YMin > 0 ? bounds.YMin + 5 : bounds.YMin - 5;

        svgDocument.ViewBox = new SvgViewBox(xMin, yMin, bounds.Width + 2 * 5, bounds.Height);

        return svgDocument;
    }

    public PolygonBounds AddPathes(SvgDocument svgDocument, MeshLoops mesh)
    {
        var loopBounds = mesh.Mains.Select(l => l.GetPolygonBounds());
        var meshBounds = GetPointsFromPolygonBounds(loopBounds).GetPolygonBounds();

        mesh.Mains.ToList().ForEach(l =>
        {
            var path = svgDocument.AddPath();
            FillPath(path, l);
        });

        return meshBounds;
    }

    private Point3d[] GetPointsFromPolygonBounds(IEnumerable<PolygonBounds> loopBounds)
    {
        return loopBounds.SelectMany(b =>
            new[]
            {
                new Point3d(b.XMin, b.YMin, 0),
                new Point3d(b.XMax, b.YMax, 0)
            }).ToArray();
    }

    private void FillPath(SvgPath path, Point3d[] points)
    {
        path.D = points.ToPathString();
        path.SetStyle("stroke-width", "1");
        path.SetStyle("stroke", "red");
        path.SetStyle("fill", "url(#hatch-45)");
    }
}
