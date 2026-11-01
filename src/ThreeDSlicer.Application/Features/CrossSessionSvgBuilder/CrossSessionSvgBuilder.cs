using GeometRi;
using SvgLib;
using System.Linq;
using ThreeDSlicer.Application.Helpers;
using ThreeDSlicer.Application.Helpers.GeometryHelpers;
using static ThreeDSlicer.Application.Features.CylinderObjectToSvgConverter.CylinderObjectToSvgConverterSevice;

namespace ThreeDSlicer.Application.Features.CrossSessionSvgBuilder;

public class CrossSessionSvgBuilder
{
    public SvgDocument BuildSvg(MeshLoops mesh)
    {
        var loopBounds = mesh.Mains.Select(l => l.GetPolygonBounds());
        var meshBounds = loopBounds.SelectMany(b =>
            new[]
            {
                    new Point3d(b.XMin, b.YMin, 0),
                    new Point3d(b.XMax, b.YMax, 0)
            })
            .ToArray().GetPolygonBounds();

        var xMin = meshBounds.XMin > 0 ? meshBounds.XMin + 5 : meshBounds.XMin - 5;
        var yMin = meshBounds.YMin > 0 ? meshBounds.YMin + 5 : meshBounds.YMin - 5;

        var svgDocument = SvgDocument.Create();
        svgDocument.Units = "%";
        svgDocument.ViewBox = new SvgViewBox(xMin, yMin, meshBounds.Width + 2 * 5, meshBounds.Height);
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

        mesh.Mains.ToList().ForEach(l =>
        {
            var path = svgDocument.AddPath();
            FillPath(path, l);
        });

        return svgDocument;
    }

    private void FillPath(SvgPath path, Point3d[] points)
    {
        path.D = points.ToPathString();
        path.SetStyle("stroke-width", "1");
        path.SetStyle("stroke", "red");
        path.SetStyle("fill", "url(#hatch-45)");
    }
}
