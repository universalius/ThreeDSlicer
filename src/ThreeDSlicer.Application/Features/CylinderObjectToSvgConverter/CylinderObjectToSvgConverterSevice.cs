using GeometRi;
using Microsoft.Extensions.Logging;
using ObjParser;
using ObjParser.Types;
using SvgLib;
using System;
using System.Collections.Generic;
using System.Linq;
using ThreeDSlicer.Application.Enums;
using ThreeDSlicer.Application.Features.IOFile;
using ThreeDSlicer.Application.Features.ObjToMeshConverter;
using ThreeDSlicer.Application.Helpers;
using ThreeDSlicer.Application.Helpers.GeometryHelpers;
using ThreeDSlicer.Application.Helpers.GeometryHelpers.Models;

namespace ThreeDSlicer.Application.Features.CylinderObjectToSvgConverter;

public class CylinderObjectToSvgConverterSevice(IOFileService fileService, ILogger<CylinderObjectToSvgConverterSevice> logger)
{
    public MeshLoops Convert(MeshObject meshObject, Axises cutPlane, int? cutPlaneRelPos = 50)
    {
        var size = meshObject.Size;
        var points = meshObject.Verts.Select(v => new MeshVertex(v.Index, new Point3d(v.X, v.Y, v.Z))).ToArray();
        var boxCenter = new Point3d(
            meshObject.Size.XMin + (meshObject.Size.XMax - meshObject.Size.XMin) / 2,
            meshObject.Size.YMin + (meshObject.Size.YMax - meshObject.Size.YMin) / 2,
            meshObject.Size.ZMin + (meshObject.Size.ZMax - meshObject.Size.ZMin) / 2);

        var axisCutPlanes = new[]
        {
            new AxisCutPlane(Axises.YZ, new Plane3d(GetAxisCutPlaneCenter(meshObject.Size, Axises.YZ, cutPlaneRelPos, boxCenter), new Vector3d(1.0, 0.0, 0.0))),
            new AxisCutPlane(Axises.XZ, new Plane3d(GetAxisCutPlaneCenter(meshObject.Size, Axises.XZ, cutPlaneRelPos, boxCenter), new Vector3d(0.0, 1.0, 0.0))),
            new AxisCutPlane(Axises.XY, new Plane3d(GetAxisCutPlaneCenter(meshObject.Size, Axises.XY, cutPlaneRelPos, boxCenter), new Vector3d(0.0, 0.0, 1.0))),
        };

        var facePlanes = meshObject.Faces
        .Select(f =>
        {
            var facePoints = points.Where(p => f.VertexIndexList.Contains(p.Id))
            .ToArray();
            var faceEdgePoints = f.VertexIndexList.Select(id => facePoints.First(p => p.Id == id).Point).ToArray();
            var plane = new Plane3d(faceEdgePoints[0], faceEdgePoints[1], faceEdgePoints[2]);

            return new FaceSection(f, plane, faceEdgePoints.ToSegments(), faceEdgePoints);
        })
        .ToList();

        var acp = axisCutPlanes.FirstOrDefault(i => i.Axis == cutPlane);
        var crossCurveEdges = facePlanes.SelectMany(fp =>
        {
            var targetEdges = fp.Edges.Where(e => e.IsCutByOrthogonalPlane(acp.Plane, acp.Axis)).ToArray();
            if (targetEdges.Length == 0)
            {
                return [];
            }

            var crossPoints = targetEdges
                .SelectMany<Segment3d, Point3d>(e =>
                {
                    var intersection = acp.Plane.IntersectionWith(e.ToLine);
                    if (intersection is Line3d)
                    {
                        return [e.P1, e.P2];
                    }

                    return [intersection as Point3d];
                })
                .Where(p => p != null)// && IsInsideBox(p, size))
                .GroupBy(p => p.GetHashCodeInTolerance())
                //(
                //    Math.Round(p.X, 6),
                //    Math.Round(p.Y, 6),
                //    Math.Round(p.Z, 6)))
                .Select(g => g.First())
                .ToArray();

            if (crossPoints.Length == 1)
            {
                return [];
            }

            if (crossPoints.Length > 2)
            {
                if (crossPoints.Length % 2 == 1)
                {
                    throw new InvalidOperationException($"Odd number of cross points found for face {fp.Face.Id} on axis {acp.Axis}. This indicates a potential issue with the mesh or the cutting plane.");
                }

                crossPoints = SortCrossPoints(crossPoints, acp.Axis);
                return crossPoints.Chunk(2).Select(s => new CrossSection(fp, s)).ToArray();
            }

            return [new CrossSection(fp, crossPoints)];
        })
        .Where(cp => cp != null)
        .ToArray();

        var bounds = crossCurveEdges.SelectMany(cce => cce.CrossPoints).ToArray().GetPolygonBounds();
        var xMin = bounds.XMin > 0 ? bounds.XMin + 5 : bounds.XMin - 5;
        var yMin = bounds.YMin > 0 ? bounds.YMin + 5 : bounds.YMin - 5;

        DebugCrossSection(cutPlane, crossCurveEdges, bounds, xMin, yMin);

        var loops = GetLoops(crossCurveEdges.Select(ce => ce.CrossPoints.ToSegments(false)[0]).ToArray());
        var index = 0;
        loops.ForEach(loop =>
        {
            index++;

            var svgDocument = SvgDocument.Create();
            svgDocument.Units = "mm";
            var path = svgDocument.AddPath();
            path.D = loop.ToPathString(cutPlane);
            path.SetStyle("stroke-width", "1");
            path.SetStyle("stroke", "red");
            path.SetStyle("fill", "none");

            fileService.SaveSvg($"{cutPlane.ToString()}_cross_slice_{index}", svgDocument.Element.OuterXml);
        });

        return new MeshLoops(
            Mains: loops.Select(l => l.Select(p => p.ChangeAxises(cutPlane)).ToArray()));
    }

    private void DebugCrossSection(Axises cutPlane, CrossSection[] crossCurveEdges, PolygonBounds bounds, double xMin, double yMin)
    {
        var svgDocument = SvgDocument.Create();
        svgDocument.Units = "%";
        svgDocument.ViewBox = new SvgViewBox(xMin, yMin, bounds.Width + 2 * 5, bounds.Height);
        svgDocument.Width = 100;
        svgDocument.Height = 100;

        foreach (var item in crossCurveEdges)
        {
            var p1 = item.CrossPoints[0].ChangeAxises(cutPlane);
            var p2 = item.CrossPoints[1].ChangeAxises(cutPlane);

            var line = svgDocument.AddLine();
            line.X1 = p1.X;
            line.Y1 = p1.Y;
            line.X2 = p2.X;
            line.Y2 = p2.Y;
            line.SetStyle("stroke-width", "1");
            line.SetStyle("stroke", "red");

            var midX = (p1.X + p2.X) / 2d;
            var midY = (p1.Y + p2.Y) / 2d;

            var faceText = svgDocument.AddText();
            faceText.X = midX;
            faceText.Y = midY;
            faceText.FontSize = 2;
            faceText.Fill = "black";
            faceText.TextAnchor = SvgTextAnchor.Middle;
            faceText.Text = item.FacePlane.Face.Id.ToString();
        }

        fileService.SaveSvg($"{cutPlane.ToString()}_cross_slice_lined_debug", svgDocument.Element.OuterXml);
    }

    private static Point3d GetAxisCutPlaneCenter(Extent size, Axises axis, int? relativePosition, Point3d defaultCenter)
    {
        if (relativePosition is null)
        {
            return defaultCenter;
        }

        var ratio = Math.Clamp(relativePosition.Value, 0, 100) / 100d;

        return axis switch
        {
            Axises.YZ => new Point3d(
                size.XMin + (size.XMax - size.XMin) * ratio,
                defaultCenter.Y,
                defaultCenter.Z),
            Axises.XZ => new Point3d(
                defaultCenter.X,
                size.YMin + (size.YMax - size.YMin) * ratio,
                defaultCenter.Z),
            Axises.XY => new Point3d(
                defaultCenter.X,
                defaultCenter.Y,
                size.ZMin + (size.ZMax - size.ZMin) * ratio),
            _ => defaultCenter,
        };
    }

    private static Point3d[] SortCrossPoints(Point3d[] crossPoints, Axises axis)
    {
        return axis switch
        {
            Axises.XY => crossPoints.OrderBy(p => p.Y).ToArray(),
            Axises.XZ => crossPoints.OrderBy(p => p.Z).ToArray(),
            Axises.YZ => crossPoints.OrderBy(p => p.Y).ToArray(),
        };
    }

    private bool PointEquals(Point3d p1, Point3d p2)
    {
        return p1.DistanceTo(p2) <= 0.0001;
    }

    private bool IsInsideBox(Point3d point, Extent box)
    {
        return point.X >= box.XMin && point.X <= box.XMax &&
                point.Y >= box.YMin && point.Y <= box.YMax &&
                point.Z >= box.ZMin && point.Z <= box.ZMax;
    }

    private List<Point3d[]> GetLoops(Segment3d[] lines)
    {
        if (lines == null || lines.Length == 0)
            return [];

        // Step 1: Build an adjacency map (Point -> Connected Neighbors)
        var adjacency = new Dictionary<int, List<Point3d>>();

        foreach (var line in lines)
        {
            var p1 = line.P1;
            var p2 = line.P2;
            var p1Hash = p1.GetHashCodeInTolerance();
            var p2Hash = p2.GetHashCodeInTolerance();

            if (!adjacency.ContainsKey(p1Hash))
                adjacency[p1Hash] = new List<Point3d>();

            if (!adjacency.ContainsKey(p2Hash))
                adjacency[p2Hash] = new List<Point3d>();

            var adjacencyP1 = adjacency[p1Hash];
            if (!adjacencyP1.Any(p => PointEquals(p, p2)))
            {
                adjacency[p1Hash].Add(p2);
            }

            var adjacencyP2 = adjacency[p2Hash];
            if (!adjacencyP2.Any(p => PointEquals(p, p1)))
            {
                adjacency[p2Hash].Add(p1);
            }
        }

        // Step 2: Validate that every point has exactly 2 neighbors (closed loop property)
        foreach (var kvp in adjacency)
        {
            if (kvp.Value.Count != 2)
            {
                throw new InvalidOperationException($"Point {kvp.Key} has {kvp.Value.Count} connections. A valid closed loop requires exactly 2 connections per point.");
            }
        }

        // Step 3: Traverse the graph to order the points
        var remainingAdjacency = new Dictionary<int, List<Point3d>>(adjacency);
        var curves = new List<Point3d[]>();

        while (remainingAdjacency.Count > 0)
        {
            var curvePoints = GetLoopPoints(remainingAdjacency);
            curves.Add(curvePoints);

            if (curvePoints.Length == remainingAdjacency.Count)
            {
                break;
            }

            var processedKeys = curvePoints
                .Select(p => p.GetHashCodeInTolerance())
                .ToHashSet();

            var notProcessedKeys = remainingAdjacency
                .Keys
                .Where(k => !processedKeys.Contains(k))
                .ToArray();

            if (notProcessedKeys.Length == 0)
            {
                break;
            }

            remainingAdjacency = notProcessedKeys
                .ToDictionary(k => k, k => remainingAdjacency[k]);
        }

        return curves;
    }

    private Point3d[] GetLoopPoints(Dictionary<int, List<Point3d>> adjacency)
    {
        var orderedPoints = new List<Point3d>();
        Point3d startPoint = adjacency.First().Value.First();
        Point3d current = startPoint;
        Point3d previous = default;

        // Find a valid starting neighbor
        Point3d next = adjacency[current.GetHashCodeInTolerance()][0];

        orderedPoints.Add(current);

        while (!next.Equals(startPoint))
        {
            orderedPoints.Add(next);

            // Get the two neighbors of the current point
            var neighbors = adjacency[next.GetHashCodeInTolerance()];

            // The next point is the neighbor we didn't just come from
            Point3d temp = next;
            next = neighbors[0].Equals(current) ? neighbors[1] : neighbors[0];
            current = temp;
        }

        return orderedPoints.ToArray();
    }

    private record MeshVertex(int Id, Point3d Point);

    private record AxisCutPlane(Axises Axis, Plane3d Plane);

    private record FaceSection(Face Face, Plane3d Plane, Segment3d[] Edges, Point3d[] Points);

    private record CrossSection(FaceSection FacePlane, Point3d[] CrossPoints);

    private record CrossEdge(int FaceId, Segment3d Edge, Point3d[] Points);

    public record MeshLoops(IEnumerable<Point3d[]> Mains, IEnumerable<Point3d[]> Holes = null);
}
