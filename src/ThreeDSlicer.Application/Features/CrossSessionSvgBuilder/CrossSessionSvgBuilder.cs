using GeometRi;
using SvgLib;
using System;
using System.Collections.Generic;
using System.Linq;
using ThreeDSlicer.Application.Features.CylinderObjectToSvgConverter.Models;
using ThreeDSlicer.Application.Helpers;
using ThreeDSlicer.Application.Helpers.GeometryHelpers;
using ThreeDSlicer.Application.Helpers.GeometryHelpers.Models;

namespace ThreeDSlicer.Application.Features.CrossSessionSvgBuilder;

public class CrossSessionSvgBuilder
{
    public SvgDocument BuildSvg(MeshLoopList[] meshes)
    {
        var svgDocument = SvgDocument.Create();
        svgDocument.Units = "%";
        svgDocument.Width = 100;
        svgDocument.Height = 100;

        var allBounds = new List<PolygonBounds>();
        var index = 1;
        meshes.ToList().ForEach(m =>
        {
            var color = GetColor(index - 1);
            var defs = svgDocument.AddDefs();
            var pattern = defs.AddPattern();
            pattern.Id = $"hatch-45-{index}";
            pattern.Width = 10;
            pattern.Height = 10;
            pattern.PatternUnits = "userSpaceOnUse";

            var line = pattern.AddLine();
            line.X1 = 0;
            line.Y1 = 0;
            line.X2 = 20;
            line.Y2 = 20;
            line.SetStyle("stroke", color);
            line.SetStyle("stroke-width", "0.5");
            line.SetStyle("stroke-linecap", "square");

            var meshBounds = AddPathes(svgDocument, m, color, index);
            allBounds.Add(meshBounds);
            index++;
        });

        var bounds = allBounds.GetBounds();

        var xMin = bounds.XMin > 0 ? bounds.XMin + 5 : bounds.XMin - 5;
        var yMin = bounds.YMin > 0 ? bounds.YMin + 5 : bounds.YMin - 5;

        svgDocument.ViewBox = new SvgViewBox(xMin, yMin, bounds.Width + 2 * 5, bounds.Height);

        return svgDocument;
    }

    public PolygonBounds AddPathes(SvgDocument svgDocument, MeshLoopList mesh, string color, int hatchId)
    {
        var meshLoopsBounds = new List<PolygonBounds>();
        foreach (var item in mesh.Items)
        {
            var path = svgDocument.AddPath();
            FillPath(path, color, hatchId);

            var allLoops = new List<Point3d[]> { item.Main };
            if (item.Holes != null)
            {
                allLoops.AddRange(item.Holes);
            }

            path.D = string.Join(" ", allLoops.Select(loop => loop.ToPathString()));

            meshLoopsBounds.Add(item.Main.GetPolygonBounds());
        }

        return meshLoopsBounds.GetBounds();
    }

    private void FillPath(SvgPath path, string color, int hatchId)
    {
        path.SetStyle("stroke-width", "1");
        path.SetStyle("stroke", color);
        path.SetStyle("fill", $"url(#hatch-45-{hatchId})");
        path.SetStyle("fill-rule", "evenodd");
    }

    private readonly string[] StandardColors =
    {
        "red",
        "green",
        "blue",
        "orange",
        "purple",
        "cyan",
        "magenta",
        "brown",
        "gray",
        "gold"
    };

    private string GetColor(int index)
    {
        if (index < 0)
        {
            throw new ArgumentOutOfRangeException(nameof(index), "Index cannot be negative.");
        }

        if (index < StandardColors.Length)
        {
            return StandardColors[index];
        }

        return GetHashColor(index);
    }

    private static string GetHashColor(int index)
    {
        var hash = (uint)(index * 1103515245u + 12345u);
        var r = (byte)((hash >> 16) & 0xFF);
        var g = (byte)((hash >> 8) & 0xFF);
        var b = (byte)(hash & 0xFF);

        return $"#{r:X2}{g:X2}{b:X2}";
    }
}
