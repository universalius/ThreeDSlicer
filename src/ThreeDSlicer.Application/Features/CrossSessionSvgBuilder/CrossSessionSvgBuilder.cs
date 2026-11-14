using GeometRi;
using SvgLib;
using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using ThreeDSlicer.Application.Features.CylinderObjectToSvgConverter.Models;
using ThreeDSlicer.Application.Helpers;
using ThreeDSlicer.Application.Helpers.GeometryHelpers;
using ThreeDSlicer.Application.Helpers.GeometryHelpers.Models;

namespace ThreeDSlicer.Application.Features.CrossSessionSvgBuilder;

public class CrossSessionSvgBuilder
{
    public SvgDocument BuildSvg(MeshLoopList[] meshes, double viewportWidth, double viewportHeight)
    {
        var svgDocument = SvgDocument.Create();
        svgDocument.Units = "%";
        svgDocument.Width = 100;
        svgDocument.Height = 100;

        var allBounds = new List<PolygonBounds>();
        foreach (var mesh in meshes)
        {
            allBounds.Add(GetMeshBounds(mesh));
        }

        var bounds = allBounds.GetBounds();
        var strokeWidth = ComputeInitialStrokeWidth(bounds, viewportWidth, viewportHeight);

        var index = 1;
        foreach (var mesh in meshes)
        {
            var color = GetColor(index - 1);
            var meshBounds = AddPathes(svgDocument, mesh, color, index, strokeWidth);
            AddHatchPattern(svgDocument, meshBounds, color, index, strokeWidth);
            index++;
        }

        var xMin = bounds.XMin > 0 ? bounds.XMin + 5 : bounds.XMin - 5;
        var yMin = bounds.YMin > 0 ? bounds.YMin + 5 : bounds.YMin - 5;

        svgDocument.ViewBox = new SvgViewBox(xMin, yMin, bounds.Width + 2 * 5, bounds.Height + 2 * 5);

        return svgDocument;
    }

    public PolygonBounds AddPathes(SvgDocument svgDocument, MeshLoopList mesh, string color, int hatchId, double strokeWidth)
    {
        var meshLoopsBounds = new List<PolygonBounds>();
        foreach (var item in mesh.Items)
        {
            var path = svgDocument.AddPath();
            FillPath(path, color, hatchId, strokeWidth);

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

    private static PolygonBounds GetMeshBounds(MeshLoopList mesh)
    {
        var meshLoopsBounds = new List<PolygonBounds>();
        foreach (var item in mesh.Items)
        {
            meshLoopsBounds.Add(item.Main.GetPolygonBounds());
        }

        return meshLoopsBounds.GetBounds();
    }

    private static double ComputeInitialStrokeWidth(PolygonBounds bounds, double viewportWidth, double viewportHeight)
    {
        var width = bounds?.Width ?? 0;
        var height = bounds?.Height ?? 0;

        if (width <= 0 && height <= 0)
        {
            return 1;
        }

        var modelDiagonal = Math.Sqrt((width * width) + (height * height));
        var viewportDiagonal = Math.Sqrt((viewportWidth * viewportWidth) + (viewportHeight * viewportHeight));

        if (viewportDiagonal <= 0)
        {
            return 1;
        }

        const double targetPixels = 1.0;
        const double minStroke = 0.25;
        const double maxStroke = 2.5;

        var strokeWidth = (targetPixels * modelDiagonal) / viewportDiagonal;
        return Math.Min(maxStroke, Math.Max(minStroke, strokeWidth));
    }

    private static void AddHatchPattern(SvgDocument svgDocument, PolygonBounds meshBounds, string color, int hatchId, double strokeWidth)
    {
        var hatchStroke = Math.Max(strokeWidth * 0.5, 0.01);
        var patternSize = GetPatternCellSize(meshBounds, 10, hatchStroke);

        var defs = svgDocument.AddDefs();
        var pattern = defs.AddPattern();
        pattern.Id = $"hatch-45-{hatchId}";
        pattern.Width = patternSize.Width;
        pattern.Height = patternSize.Height;
        pattern.PatternUnits = "userSpaceOnUse";

        var line = pattern.AddLine();
        line.X1 = pattern.Width;
        line.Y1 = 0;
        line.X2 = 0;
        line.Y2 = pattern.Height;
        line.SetStyle("stroke", color);
        line.SetStyle("stroke-width", hatchStroke.ToString(CultureInfo.InvariantCulture));
        line.SetStyle("stroke-linecap", "square");
    }

    private static PolygonBounds GetPatternCellSize(PolygonBounds meshBounds, int linesPerBound, double strokeWidth)
    {
        var safeLinesPerBound = Math.Max(linesPerBound, 1);
        var maxMeshBound = Math.Max(meshBounds.Width, meshBounds.Height);
        var patternStep = maxMeshBound <= 0 ? 1 : maxMeshBound / safeLinesPerBound;

        const double minEmptyAreaRatio = 0.6;
        var cellSide = Math.Max(patternStep, 0.01);

        while (cellSide > 0)
        {
            var cellArea = cellSide * cellSide;
            var lineLength = cellSide * Math.Sqrt(2);
            var occupiedArea = lineLength * Math.Max(strokeWidth, 0.01);
            var emptyArea = Math.Max(0, cellArea - occupiedArea);
            var emptyAreaRatio = cellArea <= 0 ? 0 : emptyArea / cellArea;

            if (emptyAreaRatio >= minEmptyAreaRatio)
            {
                break;
            }

            cellSide *= 2;
        }

        return new PolygonBounds
        {
            XMin = 0,
            XMax = cellSide,
            YMin = 0,
            YMax = cellSide,
        };
    }

    private void FillPath(SvgPath path, string color, int hatchId, double strokeWidth)
    {
        path.SetStyle("stroke-width", strokeWidth.ToString(CultureInfo.InvariantCulture));
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
